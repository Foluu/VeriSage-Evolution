
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Form = require('../models/form');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { filterFilledFields, validateFormSubmission } = require('../utils/validation');
const { createBatch } = require('../services/batchGenerator');



// ============================================================================
// MULTER CONFIGURATION FOR IMAGE ATTACHMENTS
// ============================================================================

// Configure storage for attachments
const attachmentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Create form-specific directory after form is created
    // For now, use temp directory - will be moved after form creation
    const tempDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'temp');
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitizedOriginal);
    const name = path.basename(sanitizedOriginal, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter - accept only images
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only images (JPEG, PNG, GIF, WEBP) are allowed. Received: ${file.mimetype}`), false);
  }
};

// Configure multer for attachments
const uploadAttachments = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: imageFilter
});

// Configure multer for receipt uploads (existing functionality)
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadReceipts = multer({
  storage: receiptStorage,
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Move uploaded files from temp to form-specific directory
 */
const moveFilesToFormDirectory = async (files, formId) => {
  if (!files || files.length === 0) return [];
  
  const formDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'forms', formId.toString());
  await fs.mkdir(formDir, { recursive: true });
  
  const movedFiles = [];
  
  for (const file of files) {
    const newPath = path.join(formDir, file.filename);
    
    try {
      await fs.rename(file.path, newPath);
      
      movedFiles.push({
        filename: file.filename,
        originalName: file.originalname,
        path: `/uploads/forms/${formId}/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      });
    } catch (error) {
      console.error(`Error moving file ${file.filename}:`, error);
      // Clean up if move fails
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up temp file:', unlinkError);
      }
    }
  }
  
  return movedFiles;
};

/**
 * Clean up temporary files
 */
const cleanupTempFiles = async (files) => {
  if (!files || files.length === 0) return;
  
  for (const file of files) {
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error(`Error deleting temp file ${file.path}:`, error);
    }
  }
};

// ============================================================================
// ROUTES
// ============================================================================

// @route   POST /api/forms
// @desc    Submit new branch form (with optional image attachments)
// @access  Public (branch users)
router.post('/', 
  // Handle both receipt uploads and new attachments
  (req, res, next) => {
    const upload = multer({
      storage: attachmentStorage,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 7 // 5 attachments + 2 receipts
      },
      fileFilter: (req, file, cb) => {
        // Accept images for attachments and receipts
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
      }
    }).fields([
      { name: 'remittance25PercentReceipt', maxCount: 1 },
      { name: 'remittance5PercentHQReceipt', maxCount: 1 },
      { name: 'attachments', maxCount: 5 }
    ]);
    
    upload(req, res, next);
  },
  async (req, res) => {
    let tempFiles = [];
    
    try {
      // Collect all uploaded files for cleanup if needed
      if (req.files) {
        tempFiles = [
          ...(req.files.remittance25PercentReceipt || []),
          ...(req.files.remittance5PercentHQReceipt || []),
          ...(req.files.attachments || [])
        ];
      }
      
      // Filter only filled fields
      const filteredData = filterFilledFields(req.body);
      
      // Validate
      const { error } = validateFormSubmission(filteredData);
      if (error) {
        await cleanupTempFiles(tempFiles);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Create form first (without attachments)
      const form = new Form(filteredData);
      await form.save();

      // Now move attachment files to form-specific directory
      if (req.files && req.files.attachments) {
        const attachmentMetadata = await moveFilesToFormDirectory(req.files.attachments, form._id);
        form.attachments = attachmentMetadata;
      }

      // Handle receipt files (existing functionality)
      if (req.files) {
        if (req.files.remittance25PercentReceipt) {
          const receiptFile = req.files.remittance25PercentReceipt[0];
          const receiptDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'receipts');
          await fs.mkdir(receiptDir, { recursive: true });
          
          const receiptPath = path.join(receiptDir, receiptFile.filename);
          await fs.rename(receiptFile.path, receiptPath);
          form.remittance25PercentReceipt = `/uploads/receipts/${receiptFile.filename}`;
        }
        
        if (req.files.remittance5PercentHQReceipt) {
          const receiptFile = req.files.remittance5PercentHQReceipt[0];
          const receiptDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'receipts');
          await fs.mkdir(receiptDir, { recursive: true });
          
          const receiptPath = path.join(receiptDir, receiptFile.filename);
          await fs.rename(receiptFile.path, receiptPath);
          form.remittance5PercentHQReceipt = `/uploads/receipts/${receiptFile.filename}`;
        }
      }

      // Save form with attachments
      await form.save();

      res.status(201).json({
        success: true,
        message: 'Form submitted successfully',
        data: form
      });

    } catch (error) {
      console.error('Form submission error:', error);
      
      // Clean up temp files on error
      await cleanupTempFiles(tempFiles);
      
      res.status(500).json({
        success: false,
        message: 'Server error during form submission',
        error: error.message
      });
    }
  }
);

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

// @route   GET /api/forms/:id/attachments/:filename
// @desc    Download a specific attachment
// @access  Private
router.get('/:id/attachments/:filename', authMiddleware, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Verify attachment exists in form
    const attachment = form.attachments.find(a => a.filename === req.params.filename);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Build file path
    const filePath = path.join(
      process.cwd(),
      process.env.UPLOAD_DIR || 'uploads',
      'forms',
      req.params.id,
      req.params.filename
    );

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error downloading attachment'
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

    // Generate batch file (updated to include attachment count)
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
// @desc    Delete form and its attachments
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

    // Delete attachment files
    if (form.attachments && form.attachments.length > 0) {
      const formDir = path.join(
        process.cwd(),
        process.env.UPLOAD_DIR || 'uploads',
        'forms',
        req.params.id
      );
      
      try {
        await fs.rm(formDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Error deleting attachment directory:', error);
      }
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