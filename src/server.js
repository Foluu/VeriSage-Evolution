
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/user');
const fs = require('fs').promises;
const path = require('path');

const PORT = process.env.PORT || 5000;




// Ensure required directories exist
const ensureDirectories = async () => {
  const dirs = [
    process.env.UPLOAD_DIR || 'uploads',
    process.env.EXPORT_DIR || 'exports'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ Directory ensured: ${dir}`);
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};


// Create default admin user if none exists
const createDefaultAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    if (adminCount === 0) {
      const adminUser = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@trem.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        name: 'System Administrator',
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('✓ Default admin user created');
      console.log(`  Username: ${adminUser.username}`);
      console.log(`  Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
      console.log('  ⚠️  IMPORTANT: Change the default password after first login!');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};


// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    

    // Ensure directories exist
    await ensureDirectories();
    

    // Create default admin
    await createDefaultAdmin();
    

    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('  VeriSage Evolution Backend');
      console.log('='.repeat(60));
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Server running on port ${PORT}`);
      console.log(`  API Base URL: https://localhost:${PORT}/api`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log('='.repeat(60));
      console.log('');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};


startServer();