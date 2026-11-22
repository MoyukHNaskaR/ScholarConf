import express from 'express';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cmt_default_dev_secret_token_12345';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Trigger Account Verification Email
 * Body: { email, name, userId }
 */
router.post('/send-verification', async (req, res) => {
  try {
    const { email, name, userId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate a secure verification token valid for 24 hours
    const token = jwt.sign(
      { email, userId, type: 'email-verification' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const verificationUrl = `${CLIENT_URL}/verify-email?token=${token}`;
    const result = await sendVerificationEmail({ email, name, verificationUrl });

    res.json({
      success: true,
      message: 'Verification email dispatched successfully',
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger Password Reset Email
 * Body: { email, name }
 */
router.post('/send-reset', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const token = jwt.sign(
      { email, type: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`;
    const result = await sendPasswordResetEmail({ email, name, resetUrl });

    res.json({
      success: true,
      message: 'Password reset email dispatched successfully',
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify Email Token
 */
router.get('/verify', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'email-verification') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    res.json({
      success: true,
      email: decoded.email,
      userId: decoded.userId,
      message: 'Email successfully verified',
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired verification token' });
  }
});

export default router;
