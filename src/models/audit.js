const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'login_failed',
      'form_submit', 'form_review', 'form_unreviewed',
      'form_post_sage', 'form_post_sage_fallback', 'form_post_sage_failed',
      'form_bulk_post_sage', 'form_bulk_post_sage_fallback',
      'form_update', 'form_delete',
      'user_create', 'user_update', 'user_delete',
      'branch_create', 'branch_update', 'branch_delete',
      'password_change'
    ]
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for failed logins where user is unknown
  },
  userName: {
    type: String,
    default: 'System'
  },
  resource: {
    type: String,  // e.g. "Form", "User", "Branch"
    default: null
  },
  resourceId: {
    type: String,  // The ID of the affected resource
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  details: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Any extra data (e.g. branch name, form month)
    default: {}
  }
}, {
  timestamps: true // createdAt, updatedAt
});

// Index for efficient queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ user: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
