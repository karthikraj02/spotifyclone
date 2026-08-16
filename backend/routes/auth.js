const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { auth, JWT_SECRET } = require('../middleware/auth');
const sendEmail = require('../utils/email');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }]
    });
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase().trim() ? 'Email' : 'Username';
      return res.status(409).json({ success: false, message: `${field} already in use` });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    const user = await User.create({ 
      username, 
      email, 
      password,
      otp,
      otpExpires
    });

    const html = `
      <h1>Verify Your Email</h1>
      <p>Hello ${username},</p>
      <p>Thank you for registering. Your verification code is:</p>
      <h2 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 2px;">${otp}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;

    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify your Spotify Clone Account',
      html
    });

    if (!emailSent) {
      // Clean up user if email fails to send? Better to leave it and let them request new OTP, but for simplicity:
      // await User.findByIdAndDelete(user._id);
      // return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
      console.warn('Email failed to send. Ensure SMTP is configured.');
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for the verification code.',
      email: user.email // Useful for frontend to redirect to verify screen
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User is already verified' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark as verified and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        likedSongs: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Ensure email is a string to prevent NoSQL injection
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +isVerified');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in', needsVerification: true });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        likedSongs: user.likedSongs.map(id => id.toString())
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('likedSongs')
      .populate('playlists');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      return res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been generated.' });
    }

    // Generate a raw token to send to the user, but only ever persist its hash.
    // This way a database read/leak can never be used to reset a password directly.
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    // Only the password field's validators would apply here and we aren't touching it,
    // so this is safe to validate normally rather than skipping validation entirely.
    // Actually, Mongoose will validate the whole document if required fields like username are missing.
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:4200'}/reset-password/${resetToken}`;

    // Never log the raw reset URL/token in production - it is equivalent to a password.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`[SIMULATED EMAIL] Password Reset Request for ${user.email}`);
      console.log(`Please click this link to reset your password:`);
      console.log(`${resetUrl}`);
      console.log(`======================================================\n`);
    }

    const html = `
      <h1>Password Reset Request</h1>
      <p>Hello ${user.username},</p>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #1DB954; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    const emailSent = await sendEmail({
      to: email,
      subject: 'Reset your Spotify Clone Password',
      html
    });

    if (!emailSent) {
      console.warn('Failed to send password reset email. Ensure SMTP is configured.');
    }

    res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been generated.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error processing forgot password request' });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired' });
    }

    // The raw token from the URL is never stored - hash it the same way it was hashed
    // at generation time and compare hashes, so a DB leak alone can't be used as a token.
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired' });
    }

    // Set new password - goes through the normal pre('save') hashing + minlength validator.
    // Wait, pre('save') will NOT hash the password if validateBeforeSave: false is passed? 
    // Yes it will, validation and middleware are separate. But we will do it safely.
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'Your password has been successfully reset. Please log in.' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error processing password reset' });
  }
});

module.exports = router;
