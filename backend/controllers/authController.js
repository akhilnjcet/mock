const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// ── POST /api/auth/register ─────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, username, password, confirmPassword } = req.body;

    // Basic validation
    if (!fullName || !email || !phone || !username || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check uniqueness
    const [existingEmail, existingPhone, existingUsername] = await Promise.all([
      User.findOne({ email: email.toLowerCase().trim() }),
      User.findOne({ phone: phone.trim() }),
      User.findOne({ username: username.toLowerCase().trim() })
    ]);

    if (existingEmail) return res.status(409).json({ message: 'Email is already registered.' });
    if (existingPhone) return res.status(409).json({ message: 'Phone number is already registered.' });
    if (existingUsername) return res.status(409).json({ message: 'Username is already taken.' });

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      username: username.toLowerCase().trim(),
      password,
      role: 'user'
    });

    const token = signToken(user._id);

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    // Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use.` });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages[0] });
    }
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { identifier, password, rememberMe } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required.' });
    }

    // Find by username or email
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.toLowerCase().trim() }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const expiresIn = rememberMe ? '30d' : '7d';
    const token = require('jsonwebtoken').sign(
      { id: user._id },
      process.env.JWT_SECRET || 'mcq_mock_jwt_secret_change_in_production',
      { expiresIn }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        username: user.username,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

// ── POST /api/auth/logout ───────────────────────────────────────────────────
exports.logout = (req, res) => {
  // JWT is stateless — client removes token
  res.json({ message: 'Logged out successfully.' });
};

// ── PUT /api/auth/change-password ───────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: 'All password fields are required.' });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New passwords do not match.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Failed to change password.' });
  }
};

// ── GET /api/auth/check-username?username=xxx ────────────────────────────────
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json({ available: false });
    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    res.json({ available: !exists });
  } catch {
    res.json({ available: false });
  }
};
