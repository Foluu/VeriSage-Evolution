
const mongoose = require('mongoose');



const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  zone: {
    type: String,
    enum: [
      'Headquarters Annex',
      'Mainland Zone 1',
      'Mainland Zone 2',
      'Island Zone 1',
      'Island Zone 2',
      ''
    ],
    default: ''
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for quick queries
branchSchema.index({ name: 1 });
branchSchema.index({ zone: 1 });




module.exports = mongoose.model('Branch', branchSchema);