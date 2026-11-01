require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const {
  User,
  connectDB,
  signToken,
  authenticateToken,
  requireRole,
  recordAudit
} = require('@cloudcode-arena/shared');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Register (Student or Faculty)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    // Role safety: public registration only allows student or faculty
    let assignedRole = 'student';
    if (role === 'faculty') {
      assignedRole = 'faculty';
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      status: 'active'
    });

    const token = signToken({
      id: newUser._id.toString(),
      role: newUser.role,
      email: newUser.email,
      name: newUser.name
    });

    await recordAudit(newUser._id, 'USER_REGISTERED', 'users', { role: assignedRole }, req.ip);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('[Auth Service] Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register account.'
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name
    });

    await recordAudit(user._id, 'USER_LOGIN', 'users', { email: user.email }, req.ip);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('[Auth Service] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process login.'
    });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile.'
    });
  }
});

// Secure Development Admin Bootstrap
app.post('/api/auth/bootstrap-admin', async (req, res) => {
  try {
    const bootstrapKey = req.headers['x-bootstrap-key'] || req.body.bootstrapKey;
    const expectedKey = process.env.BOOTSTRAP_ADMIN_KEY || 'local_dev_bootstrap_admin_secret_key_98765';

    if (!bootstrapKey || bootstrapKey !== expectedKey) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or missing bootstrap authorization key.'
      });
    }

    const adminEmail = (req.body.email || process.env.INITIAL_ADMIN_EMAIL || 'admin@cloudcode.arena').toLowerCase().trim();
    const adminPassword = req.body.password || process.env.INITIAL_ADMIN_PASSWORD || 'AdminPass123!';
    const adminName = req.body.name || process.env.INITIAL_ADMIN_NAME || 'Platform Administrator';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    let adminUser = await User.findOne({ email: adminEmail });
    if (adminUser) {
      adminUser.role = 'admin';
      adminUser.status = 'active';
      adminUser.passwordHash = passwordHash;
      await adminUser.save();
    } else {
      adminUser = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'admin',
        status: 'active'
      });
    }

    await recordAudit(adminUser._id, 'ADMIN_BOOTSTRAP', 'system', { email: adminEmail }, req.ip);

    res.json({
      success: true,
      message: 'Administrator account bootstrapped successfully.',
      admin: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('[Auth Service] Admin bootstrap error:', error);
    res.status(500).json({
      success: false,
      error: 'Admin bootstrap failed.'
    });
  }
});

// Administrator User Management Endpoints
app.get('/api/auth/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users.'
    });
  }
});

app.put('/api/auth/users/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'faculty', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified.'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await recordAudit(
      req.user.id,
      'USER_ROLE_CHANGED',
      'users',
      { targetUserId: user._id, oldRole, newRole: role },
      req.ip
    );

    res.json({
      success: true,
      message: `User role updated to ${role}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user role.'
    });
  }
});

app.put('/api/auth/users/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status specified.'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    user.status = status;
    await user.save();

    await recordAudit(
      req.user.id,
      'USER_STATUS_CHANGED',
      'users',
      { targetUserId: user._id, status },
      req.ip
    );

    res.json({
      success: true,
      message: `User status updated to ${status}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user status.'
    });
  }
});

// Connect to DB and start listening
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Auth Service] Listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Auth Service] Fatal startup error:', err);
      process.exit(1);
    });
}

module.exports = app;
