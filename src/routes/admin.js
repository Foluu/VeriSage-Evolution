
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Branch = require('../models/branch');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);





// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, name, role } = req.body;

    // Validation
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      name,
      role: role || 'viewer',
      isActive: true
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
});

// @route   PATCH /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.patch('/users/:id', async (req, res) => {
  try {
    const { name, email, role, isActive, password } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (typeof isActive !== 'undefined') user.isActive = isActive;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});



// ============================================================================
// BRANCH MANAGEMENT ROUTES
// ============================================================================

// @route   GET /api/admin/branches
// @desc    Get all branches
// @access  Private (Admin only)
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });
    
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

// @route   POST /api/admin/branches
// @desc    Create new branch
// @access  Private (Admin only)
router.post('/branches', async (req, res) => {
  try {
    const { name, zone, description } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Branch name is required'
      });
    }

    // Check if branch already exists
    const existingBranch = await Branch.findOne({ 
      name: name.toUpperCase() 
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'Branch already exists'
      });
    }

    // Create new branch
    const branch = new Branch({
      name: name.toUpperCase(),
      zone,
      description
    });

    await branch.save();

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch
    });

  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating branch'
    });
  }
});

// @route   PATCH /api/admin/branches/:id
// @desc    Update branch
// @access  Private (Admin only)
router.patch('/branches/:id', async (req, res) => {
  try {
    const { name, zone, description } = req.body;

    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Update fields
    if (name) branch.name = name.toUpperCase();
    if (zone !== undefined) branch.zone = zone;
    if (description !== undefined) branch.description = description;

    await branch.save();

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: branch
    });

  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating branch'
    });
  }
});

// @route   DELETE /api/admin/branches/:id
// @desc    Delete branch
// @access  Private (Admin only)
router.delete('/branches/:id', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // TODO: Check if branch has associated forms before deleting
    // const formCount = await Form.countDocuments({ branch: branch.name });
    // if (formCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Cannot delete branch with existing forms'
    //   });
    // }

    await branch.deleteOne();

    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });

  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting branch'
    });
  }
});





// ============================================================================
// AUDIT LOG ROUTES (Placeholder for future implementation)
// ============================================================================

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs
// @access  Private (Admin only)
router.get('/audit-logs', async (req, res) => {
  try {
    // Placeholder - implement audit logging system
    res.json({
      success: true,
      data: [],
      message: 'Audit logging not yet implemented'
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching audit logs'
    });
  }
});




// ============================================================================
// STATISTICS ROUTES
// ============================================================================

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Private (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const Form = require('../models/form');
    
    const [
      totalUsers,
      activeUsers,
      totalBranches,
      totalForms,
      unreviewedForms,
      postedForms
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Branch.countDocuments(),
      Form.countDocuments(),
      Form.countDocuments({ status: 'unreviewed' }),
      Form.countDocuments({ status: 'posted' })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        branches: {
          total: totalBranches
        },
        forms: {
          total: totalForms,
          unreviewed: unreviewedForms,
          posted: postedForms,
          reviewed: totalForms - unreviewedForms - postedForms
        }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics'
    });
  }
});




module.exports = router;