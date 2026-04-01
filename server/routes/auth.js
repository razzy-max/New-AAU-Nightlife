import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Ticket from '../models/Ticket.js';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../services/emailService.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const generateBaseUsername = (name, email) => {
  const fromName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName.length >= 3) {
    return fromName.slice(0, 20);
  }

  const fromEmail = (email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromEmail.length >= 3) {
    return fromEmail.slice(0, 20);
  }

  return `user${Date.now().toString().slice(-6)}`;
};

const generateUniqueUsername = async (name, email) => {
  const base = generateBaseUsername(name, email);
  let candidate = base;
  let attempt = 0;

  while (attempt < 8) {
    const existing = await User.findOne({ username: candidate }).select('_id');
    if (!existing) {
      return candidate;
    }
    attempt += 1;
    candidate = `${base}${Math.floor(100 + Math.random() * 900)}`.slice(0, 25);
  }

  return `${base}${Date.now().toString().slice(-4)}`.slice(0, 25);
};

const claimGuestOrdersByEmail = async (user) => {
  const normalizedEmail = user.email.toLowerCase();
  const claimedAt = new Date();

  const claimResult = await Order.updateMany(
    { buyerEmail: normalizedEmail, userId: null },
    { $set: { userId: user._id, claimedAt } }
  );

  if (claimResult.modifiedCount > 0) {
    const claimedOrders = await Order.find({ buyerEmail: normalizedEmail, userId: user._id }).select('_id');
    const claimedOrderIds = claimedOrders.map((order) => order._id);
    if (claimedOrderIds.length > 0) {
      await Ticket.updateMany(
        { orderId: { $in: claimedOrderIds } },
        { $set: { userId: user._id } }
      );
    }
  }

  return claimResult.modifiedCount;
};

// @desc    Auth user and get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && (await user.matchPassword(password))) {
      if (!user.isEmailVerified) {
        return res.status(403).json({ message: 'Please verify your email before signing in.' });
      }

      await claimGuestOrdersByEmail(user);
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name = '', email, password } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const username = await generateUniqueUsername(name, normalizedEmail);

    const user = await User.create({
      name,
      username,
      email: normalizedEmail,
      password,
      role: 'user',
      isEmailVerified: false,
    });

    if (user) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      await sendEmailVerificationEmail(user.email, verificationToken, user.name || user.username || 'there');

      res.status(201).json({
        message:
          'Account created successfully. We have sent a verification email to your inbox. Please verify your email to activate your account. If you do not see it, check Spam or Promotions.',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Verification link is invalid or expired.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    await claimGuestOrdersByEmail(user);

    return res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      message: 'Email verified successfully.',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
router.post('/resend-verification', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const normalizedEmail = req.body.email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.isEmailVerified) {
      return res.json({ message: 'If an account exists, a verification email has been sent.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendEmailVerificationEmail(user.email, verificationToken, user.name || user.username || 'there');

    return res.json({ message: 'If an account exists, a verification email has been sent.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Register admin user
// @route   POST /api/auth/register-admin
// @access  Private/Admin
router.post('/register-admin', protect, admin, [
  body('username').trim().isLength({ min: 3 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['admin', 'user']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role = 'user', name = '' } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();
    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      username,
      email: normalizedEmail,
      password,
      role,
      isEmailVerified: true,
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return success-like message to avoid email enumeration.
    if (!user) {
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 30 * 60 * 1000);

    user.resetToken = resetToken;
    user.resetTokenExpiry = expiry;
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken, user.name || user.username || 'there');

    return res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', [
  body('token').isLength({ min: 20 }),
  body('password').isLength({ min: 8 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get authenticated user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  return res.json({
    _id: req.user._id,
    name: req.user.name,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
  });
});

// Backward-compatible profile endpoint
router.get('/profile', protect, async (req, res) => {
  return res.json({
    _id: req.user._id,
    name: req.user.name,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
  });
});

export default router;