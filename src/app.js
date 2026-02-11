
const express = require('express');
const cors = require('cors');
const path = require('path');


// Import routes
const authRoutes = require('./routes/auth');
const formsRoutes = require('./routes/form');

const app = express();

// Trust Proxy
app.set('trust proxy', true);


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Static file serving for exports and uploads
app.use('/exports', express.static(path.join(__dirname, '../exports')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));



// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'VeriSage Evolution Backend is running',
    timestamp: new Date().toISOString()
  });
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formsRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  

  // Mongoose cast errors
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});


module.exports = app;