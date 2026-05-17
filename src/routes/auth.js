const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { validateLogin } = require('../utils/validation');
const { authMiddleware } = require('../middleware/authMiddleware');
const { logAudit } = require('../services/auditService');

// @route   POST /api/auth/login
// @desc    Login user and return JWT token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      logAudit({ action: 'login_failed', ipAddress: req.ip, status: 'failure', details: `Failed login attempt for username: ${username}` });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logAudit({ action: 'login_failed', userId: user._id, userName: user.name, ipAddress: req.ip, status: 'failure', details: `Invalid password for ${username}` });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logAudit({ action: 'login', userId: user._id, userName: user.name, ipAddress: req.ip, details: `${user.name} logged in` });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user info'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user (admin only in production)
// @access  Public (should be protected in production)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, name, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
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
      role: role || 'viewer'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Log the logout event
// @access  Private
router.post('/logout', authMiddleware, async (req, res) => {
  logAudit({ action: 'logout', userId: req.user._id, userName: req.user.name, ipAddress: req.ip, details: `${req.user.name} logged out` });
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;