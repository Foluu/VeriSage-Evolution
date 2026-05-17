const AuditLog = require('../models/audit');

/**
 * Create an audit log entry.
 *
 * @param {Object} opts
 * @param {string} opts.action        - One of the enum values from the AuditLog model
 * @param {string|null} opts.userId   - Mongoose ObjectId of the acting user (null for anonymous)
 * @param {string} opts.userName      - Display name of the acting user
 * @param {string|null} opts.resource - Resource type e.g. "Form", "User"
 * @param {string|null} opts.resourceId - ID of the affected resource
 * @param {string|null} opts.ipAddress
 * @param {string} opts.status        - "success" | "failure" | "warning"
 * @param {string|null} opts.details  - Human-readable description
 * @param {Object} opts.metadata      - Any extra structured data
 */
async function logAudit({
  action,
  userId = null,
  userName = 'System',
  resource = null,
  resourceId = null,
  ipAddress = null,
  status = 'success',
  details = null,
  metadata = {}
}) {
  try {
    await AuditLog.create({
      action,
      user: userId,
      userName,
      resource,
      resourceId,
      ipAddress,
      status,
      details,
      metadata
    });
  } catch (err) {
    // Audit logging should never crash the main request
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { logAudit };
