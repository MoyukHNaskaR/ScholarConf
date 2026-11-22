import express from 'express';
import jwt from 'jsonwebtoken';
import { sendReviewerInvitation, sendCoAuthorInvitation } from '../services/emailService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cmt_default_dev_secret_token_12345';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Send Reviewer Invitation
 * Body: { email, reviewerName, conferenceName, trackName, reviewDeadline, chairName, conferenceId }
 */
router.post('/reviewer', async (req, res) => {
  try {
    const {
      email,
      reviewerName,
      conferenceName = 'ACM/IEEE International Conference',
      trackName = 'Main Research Track',
      reviewDeadline = '30 days after assignment',
      chairName = 'Program Chairs',
      conferenceId = 'conf_101',
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Reviewer email is required' });
    }

    // Generate signed tokens for 1-click Accept & Decline
    const acceptToken = jwt.sign(
      { email, conferenceId, conferenceName, action: 'accept', type: 'reviewer-invite' },
      JWT_SECRET,
      { expiresIn: '14d' }
    );

    const declineToken = jwt.sign(
      { email, conferenceId, conferenceName, action: 'decline', type: 'reviewer-invite' },
      JWT_SECRET,
      { expiresIn: '14d' }
    );

    const acceptUrl = `${CLIENT_URL}/invites/respond?token=${acceptToken}`;
    const declineUrl = `${CLIENT_URL}/invites/respond?token=${declineToken}`;

    const result = await sendReviewerInvitation({
      email,
      reviewerName,
      conferenceName,
      trackName,
      reviewDeadline,
      acceptUrl,
      declineUrl,
      chairName,
    });

    res.json({
      success: true,
      message: `Reviewer invitation dispatched to ${email}`,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Respond to Reviewer Invitation (Accept or Decline via token)
 */
router.get('/reviewer/respond', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'reviewer-invite') {
      return res.status(400).json({ error: 'Invalid invitation token type' });
    }

    res.json({
      success: true,
      email: decoded.email,
      conferenceName: decoded.conferenceName,
      conferenceId: decoded.conferenceId,
      action: decoded.action, // 'accept' or 'decline'
      message:
        decoded.action === 'accept'
          ? `Thank you for accepting the invitation to review for ${decoded.conferenceName}.`
          : `You have declined the invitation to review for ${decoded.conferenceName}.`,
    });
  } catch (error) {
    res.status(400).json({ error: 'Invitation link is invalid or has expired' });
  }
});

/**
 * Send Co-Author Confirmation Request
 * Body: { email, coAuthorName, primaryAuthorName, paperTitle, paperId, conferenceName }
 */
router.post('/co-author', async (req, res) => {
  try {
    const {
      email,
      coAuthorName,
      primaryAuthorName,
      paperTitle,
      paperId = 'paper_001',
      conferenceName = 'ACM/IEEE Conference',
    } = req.body;

    if (!email || !paperTitle) {
      return res.status(400).json({ error: 'Email and paperTitle are required' });
    }

    const confirmToken = jwt.sign(
      { email, paperId, paperTitle, conferenceName, type: 'co-author-confirm' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const confirmUrl = `${CLIENT_URL}/invites/co-author?token=${confirmToken}`;

    const result = await sendCoAuthorInvitation({
      email,
      coAuthorName,
      primaryAuthorName: primaryAuthorName || 'Lead Author',
      paperTitle,
      conferenceName,
      confirmUrl,
    });

    res.json({
      success: true,
      message: `Co-author invitation sent to ${email}`,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm Co-Authorship Token
 */
router.get('/co-author/confirm', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'co-author-confirm') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    res.json({
      success: true,
      email: decoded.email,
      paperId: decoded.paperId,
      paperTitle: decoded.paperTitle,
      conferenceName: decoded.conferenceName,
      message: 'Co-authorship confirmed successfully',
    });
  } catch (error) {
    res.status(400).json({ error: 'Link is invalid or has expired' });
  }
});

export default router;
