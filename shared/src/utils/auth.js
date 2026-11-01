const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_cloudcode_arena_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token.'
      });
    }

    const user = await User.findById(decoded.id).select('+status');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'User account is deactivated. Contact an administrator.'
      });
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error.'
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of [${allowedRoles.join(', ')}] role.`
      });
    }

    next();
  };
}

async function recordAudit(userId, action, resource, details = {}, ip = '') {
  try {
    // Sanitize any sensitive keys from details
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.passwordHash;

    await AuditLog.create({
      userId: userId || null,
      action,
      resource,
      details: sanitizedDetails,
      ipAddress: ip || 'unknown',
      timestamp: new Date()
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
}

module.exports = {
  signToken,
  verifyToken,
  authenticateToken,
  requireRole,
  recordAudit
};
