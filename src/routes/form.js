const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Form = require('../models/form');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { filterFilledFields, validateFormSubmission } = require('../utils/validation');
const { createBatch, createBulkBatch } = require('../services/batchGenerator');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 }, // 5MB default
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed'));
  }
});

// @route   POST /api/forms
// @desc    Submit new branch form
// @access  Public (branch users)
router.post('/', upload.fields([
  { name: 'remittance25PercentReceipt', maxCount: 1 },
  { name: 'remittance5PercentHQReceipt', maxCount: 1 }
]), async (req, res) => {
  try {
    // Filter only filled fields
    const filteredData = filterFilledFields(req.body);
    
    // Validate
    const { error } = validateFormSubmission(filteredData);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    // Add file paths if uploaded
    if (req.files) {
      if (req.files.remittance25PercentReceipt) {
        filteredData.remittance25PercentReceipt = req.files.remittance25PercentReceipt[0].path;
      }
      if (req.files.remittance5PercentHQReceipt) {
        filteredData.remittance5PercentHQReceipt = req.files.remittance5PercentHQReceipt[0].path;
      }
    }

    // Create form
    const form = new Form(filteredData);
    await form.save();

    res.status(201).json({
      success: true,
      message: 'Form submitted successfully',
      data: form
    });

  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during form submission',
      error: error.message
    });
  }
});

// @route   GET /api/forms
// @desc    List all forms with filtering and pagination
// @access  Private (HQ users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search, branch, month } = req.query;
    
    // Build query
    const query = {};
    if (status && ['unreviewed', 'reviewed', 'posted'].includes(status)) {
      query.status = status;
    }
    if (branch) {
      query.branch = new RegExp(branch, 'i');
    }
    if (month) {
      query.month = month.toUpperCase();
    }
    if (search) {
      query.$or = [
        { branch: new RegExp(search, 'i') },
        { residentPastor: new RegExp(search, 'i') },
        { officialEmail: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [forms, total] = await Promise.all([
      Form.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Form.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: forms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('List forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching forms'
    });
  }
});

// @route   GET /api/forms/bulk/eligible-count
// @desc    Get count of eligible forms for bulk batch generation
// @access  Private
router.get('/bulk/eligible-count', authMiddleware, async (req, res) => {
  try {
    const count = await Form.countDocuments({
      status: 'reviewed',
      batchId: { $exists: false }
    });

    res.json({
      success: true,
      data: {
        count,
        hasEligibleForms: count > 0
      }
    });

  } catch (error) {
    console.error('Get eligible count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting eligible forms count'
    });
  }
});

// @route   POST /api/forms/bulk/generate-batch
// @desc    Generate bulk batch file for all reviewed, unbatched forms
// @access  Private
router.post('/bulk/generate-batch', authMiddleware, async (req, res) => {
  try {
    // Find all eligible forms (reviewed and not previously batched)
    const eligibleForms = await Form.find({
      status: 'reviewed',
      batchId: { $exists: false }
    }).sort({ branch: 1, month: 1 });

    // Validate we have forms to process
    if (eligibleForms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible forms found for bulk batch generation'
      });
    }

    // Generate bulk batch file
    const batchResult = await createBulkBatch(eligibleForms);
    
    // Update all forms with batch information - using bulkWrite for atomic operation
    const bulkOps = eligibleForms.map(form => ({
      updateOne: {
        filter: { _id: form._id },
        update: {
          $set: {
            batchId: batchResult.batchId,
            batchedAt: new Date(),
            batchFileUrl: batchResult.url
          }
        }
      }
    }));

    const updateResult = await Form.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: `Bulk batch file generated successfully for ${eligibleForms.length} forms`,
      data: {
        batchId: batchResult.batchId,
        batchFile: {
          filename: batchResult.filename,
          url: batchResult.url,
          downloadUrl: `${req.protocol}://${req.get('host')}${batchResult.url}`
        },
        formsIncluded: eligibleForms.length,
        formsUpdated: updateResult.modifiedCount
      }
    });

  } catch (error) {
    console.error('Bulk batch generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating bulk batch',
      error: error.message
    });
  }
});

// @route   GET /api/forms/:id
// @desc    Get single form details
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    res.json({
      success: true,
      data: form
    });

  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching form'
    });
  }
});

// @route   PATCH /api/forms/:id
// @desc    Update/review form
// @access  Private
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Don't allow editing posted forms
    if (form.status === 'posted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a posted form'
      });
    }

    // Filter and apply updates
    const updates = filterFilledFields(req.body);
    Object.assign(form, updates);
    
    // Mark as reviewed if it was unreviewed
    if (form.status === 'unreviewed') {
      form.status = 'reviewed';
      form.reviewedAt = new Date();
    }

    await form.save();

    res.json({
      success: true,
      message: 'Form updated successfully',
      data: form
    });

  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating form'
    });
  }
});

// @route   POST /api/forms/:id/post
// @desc    Post form to Sage and generate batch file
// @access  Private
router.post('/:id/post', authMiddleware, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check if already posted
    if (form.status === 'posted' && !req.body.force) {
      return res.status(400).json({
        success: false,
        message: 'Form already posted. Use force=true to regenerate batch file.'
      });
    }

    // Generate batch file
    const batchResult = await createBatch(form);
    
    // Update form status
    form.status = 'posted';
    form.postedAt = new Date();
    form.batchFileUrl = batchResult.url;
    await form.save();

    res.json({
      success: true,
      message: 'Form posted successfully. Batch file generated.',
      data: {
        form,
        batchFile: {
          filename: batchResult.filename,
          url: batchResult.url,
          downloadUrl: `${req.protocol}://${req.get('host')}${batchResult.url}`
        }
      }
    });

  } catch (error) {
    console.error('Post form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error posting form',
      error: error.message
    });
  }
});

// @route   DELETE /api/forms/:id
// @desc    Delete form
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    await form.deleteOne();

    res.status(204).send();

  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting form'
    });
  }
});

// @route   GET /api/forms/meta/branches
// @desc    Get list of all branches (for dropdown)
// @access  Public
router.get('/meta/branches', async (req, res) => {
  try {
    // Return the branch list from the provided document
    const branches = [
      "1004", "72 ROAD FESTAC TOWN", "ABAKALIKI", "ABAKPA/ NEW HAVEN", "ABARRA OBODO",
      "ABEOKUTA", "ABORU", "ABRAKA", "ADAMO", "ADARANIJO G12", "ADIGBE", "ADO EKITI",
      "AGBANI", "AGBEDE", "AGBOOLA", "AGBOR", "AGBOYI", "AGUDA", "AIRPORT ROAD PH",
      "AIT ALAGBADO", "AJAH", "AJANGBADI", "AJAO ESTATE", "AJEGUNLE", "AKOKA",
      "AKOKA 3", "AKOKA ZONE 1", "AKOKA ZONE 2", "AKURE MAIN.", "AKUTE", "ALABA",
      "ALAPERE", "ALAPERE ZONE", "ALPHA BEACH", "AMUWO ODOFIN", "ANFANI", "ANTHONY",
      "APAPA", "APAPA 2", "AREA 5", "ASABA", "AWKA", "AWODIORA", "AYOBO", "BADAGRY",
      "BARANGONI", "BARIGA", "BARIGA 2", "BARIGA ZONE 1", "BARUWA-LAGOS", "BASSA",
      "BENIN", "BERGER /UTAKO", "BOGIGE", "BONNY ISLAND", "BUCKNOR", "BWARI ABUJA"
    ];

    res.json({
      success: true,
      data: branches
    });

  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching branches'
    });
  }
});

module.exports = router;