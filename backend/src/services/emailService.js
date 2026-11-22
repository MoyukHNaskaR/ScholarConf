import nodemailer from 'nodemailer';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { resend, isResendConfigured } from '../config/resend.js';
import { db } from '../config/firebase.js';
import {
  welcomeTemplate,
  conferenceRequestReceivedTemplate,
  conferenceApprovedTemplate,
  conferenceRejectedTemplate,
  paperSubmittedAuthorTemplate,
  paperSubmittedChairTemplate,
  reviewerAssignedTemplate,
  reviewerInvitationUnregisteredTemplate,
  reviewCompletedChairTemplate,
  paperStatusUpdatedTemplate,
  paperFinalDecisionTemplate,
  passwordResetNotificationTemplate,
} from '../templates/scholarConfTemplates.js';
import { verificationEmailTemplate, passwordResetTemplate } from '../templates/authTemplates.js';
import { reviewerInvitationTemplate, coAuthorInvitationTemplate } from '../templates/inviteTemplates.js';

const GMAIL_USER = process.env.GMAIL_USER || 'scholarconf.moyukh@gmail.com';
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || 'iezzoaiyhoevqsxs').replace(/\s+/g, '');
export const isGmailConfigured = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

const gmailTransporter = isGmailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })
  : null;

const DEFAULT_FROM = process.env.EMAIL_FROM || (isGmailConfigured ? `ScholarConf <${GMAIL_USER}>` : 'ScholarConf <onboarding@resend.dev>');

/**
 * Record email delivery attempt / status in Firestore for debugging
 */
async function logEmailDelivery({ to, subject, eventType, status, providerId, errorMsg }) {
  try {
    await addDoc(collection(db, 'emailLogs'), {
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      eventType: eventType || 'general',
      status,
      providerId: providerId || null,
      error: errorMsg || null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking log
    console.warn('Email log warning:', err.message);
  }
}

/**
 * Universal dispatcher for emails via Gmail SMTP or Resend with delivery logging
 */
export async function sendEmail({ to, subject, html, eventType = 'notification' }) {
  if (!to) return { status: 'skipped', reason: 'No recipient email provided' };

  // 1. Try Gmail SMTP first if configured (can send to ANY email address with no custom domain required)
  if (isGmailConfigured && gmailTransporter) {
    try {
      const recipient = Array.isArray(to) ? to.join(', ') : to;
      const info = await gmailTransporter.sendMail({
        from: `ScholarConf <${GMAIL_USER}>`,
        to: recipient,
        subject,
        html,
      });

      console.log(`✅ Live Gmail SMTP Email dispatched to ${recipient} [ID: ${info.messageId}]`);
      await logEmailDelivery({
        to,
        subject,
        eventType,
        status: 'delivered',
        providerId: info.messageId,
      });
      return { id: info.messageId, status: 'delivered', provider: 'gmail_smtp' };
    } catch (err) {
      console.error('❌ Gmail SMTP dispatch exception:', err.message);
      await logEmailDelivery({
        to,
        subject,
        eventType,
        status: 'gmail_error',
        errorMsg: err.message,
      });
      // Fall through to Resend
    }
  }

  // 2. Try Resend if Gmail is not configured or failed
  if (isResendConfigured) {
    try {
      const { data, error } = await resend.emails.send({
        from: DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      if (error) {
        console.warn(`⚠️ Resend Notice for [${to}]: ${error.message}`);
        await logEmailDelivery({
          to,
          subject,
          eventType,
          status: 'sandbox_restricted',
          errorMsg: error.message,
        });
        return {
          id: 'sandbox_' + Date.now(),
          status: 'sandbox_logged',
          notice: error.message,
        };
      }

      console.log(`✅ Live Resend Email dispatched to ${to} [ID: ${data.id}]`);
      await logEmailDelivery({
        to,
        subject,
        eventType,
        status: 'delivered',
        providerId: data.id,
      });
      return { id: data.id, status: 'delivered', provider: 'resend' };
    } catch (err) {
      console.error('❌ Resend dispatch exception:', err.message);
      await logEmailDelivery({
        to,
        subject,
        eventType,
        status: 'error',
        errorMsg: err.message,
      });
      return { status: 'error', error: err.message };
    }
  }

  // 3. Fallback: Simulation mode
  console.log(`\n📬 [EMAIL SIMULATION] (${eventType}) To: ${to} | Subject: ${subject}`);
  await logEmailDelivery({ to, subject, eventType, status: 'simulated' });
  return { id: 'sim_' + Date.now(), status: 'simulated' };
}

// 1. Welcome Email After Registration
export async function sendWelcomeEmail({ email, name }) {
  return sendEmail({
    to: email,
    subject: 'Welcome to ScholarConf – Academic Conference Management Toolkit',
    html: welcomeTemplate({ name }),
    eventType: 'welcome_registration',
  });
}

// 2. Conference Creation Request Received
export async function sendConferenceRequestReceivedEmail({ email, chairName, conferenceName, organizationName, tracks }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Conference Request Received: ${conferenceName || organizationName}`,
    html: conferenceRequestReceivedTemplate({ chairName, conferenceName, organizationName, tracks }),
    eventType: 'conference_request_received',
  });
}

// 3. Conference Request Approved
export async function sendConferenceApprovedEmail({ email, chairName, conferenceName, organizationName, conferenceId }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Approved: ${conferenceName} is Now Active!`,
    html: conferenceApprovedTemplate({ chairName, conferenceName, organizationName, conferenceId }),
    eventType: 'conference_request_approved',
  });
}

// 4. Conference Request Rejected
export async function sendConferenceRejectedEmail({ email, chairName, conferenceName, organizationName }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Update on Conference Request: ${conferenceName || organizationName}`,
    html: conferenceRejectedTemplate({ chairName, conferenceName, organizationName }),
    eventType: 'conference_request_rejected',
  });
}

// 5. New Paper Submission Confirmation to Author
export async function sendPaperSubmittedAuthorEmail({ email, authorName, paperId, paperTitle, conferenceName, track, conferenceId }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Submission Confirmation (${paperId}): ${paperTitle}`,
    html: paperSubmittedAuthorTemplate({ authorName, paperId, paperTitle, conferenceName, track, conferenceId }),
    eventType: 'paper_submitted_author',
  });
}

// 6. New Paper Submitted Notification to Chair
export async function sendPaperSubmittedChairEmail({ email, chairName, paperId, paperTitle, authorNames, conferenceName, track, conferenceId }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] New Submission (${paperId}) in ${conferenceName}`,
    html: paperSubmittedChairTemplate({ chairName, paperId, paperTitle, authorNames, conferenceName, track, conferenceId }),
    eventType: 'paper_submitted_chair',
  });
}

// 7. Reviewer Assignment Notification (Registered Reviewer)
export async function sendReviewerAssignedEmail({ email, reviewerName, paperId, paperTitle, conferenceName, track, reviewDeadline, conferenceId }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Review Assignment (${paperId}) for ${conferenceName}`,
    html: reviewerAssignedTemplate({ reviewerName, paperId, paperTitle, conferenceName, track, reviewDeadline, conferenceId }),
    eventType: 'reviewer_assigned',
  });
}

// 8. Reviewer Invitation for Users Without Accounts
export async function sendReviewerInvitationUnregisteredEmail({ reviewerEmail, reviewerName, paperId, paperTitle, conferenceName, track, chairName }) {
  return sendEmail({
    to: reviewerEmail,
    subject: `[ScholarConf Invitation] Peer Reviewer Request for ${conferenceName}`,
    html: reviewerInvitationUnregisteredTemplate({ reviewerName, reviewerEmail, paperId, paperTitle, conferenceName, track, chairName }),
    eventType: 'reviewer_invitation_unregistered',
  });
}

// 9. Paper Review Completed Notification to Chair
export async function sendReviewCompletedChairEmail({ email, chairName, reviewerName, paperId, paperTitle, conferenceName, recommendation, completedCount, totalAssigned, conferenceId }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Review Submitted for ${paperId} (${completedCount}/${totalAssigned})`,
    html: reviewCompletedChairTemplate({ chairName, reviewerName, paperId, paperTitle, conferenceName, recommendation, completedCount, totalAssigned, conferenceId }),
    eventType: 'review_completed_chair',
  });
}

// 10. Paper Status Updated Notification to Author
export async function sendPaperStatusUpdatedEmail({ email, authorName, paperId, paperTitle, conferenceName, newStatus, conferenceId }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Status Updated to "${newStatus}" for ${paperId}`,
    html: paperStatusUpdatedTemplate({ authorName, paperId, paperTitle, conferenceName, newStatus, conferenceId }),
    eventType: 'paper_status_updated',
  });
}

// 11 & 12. Paper Final Decision (Accepted / Rejected)
export async function sendPaperFinalDecisionEmail({ email, authorName, paperId, paperTitle, conferenceName, decision, reviewsSummary, conferenceId }) {
  return sendEmail({
    to: email,
    subject: `[ScholarConf] Final Decision (${decision}) for Manuscript ${paperId}`,
    html: paperFinalDecisionTemplate({ authorName, paperId, paperTitle, conferenceName, decision, reviewsSummary, conferenceId }),
    eventType: `paper_${decision.toLowerCase()}`,
  });
}

// 13. Password Reset Notification
export async function sendPasswordResetNoticeEmail({ email, resetLink }) {
  return sendEmail({
    to: email,
    subject: '[ScholarConf] Password Reset Requested',
    html: passwordResetNotificationTemplate({ email, resetLink }),
    eventType: 'password_reset',
  });
}

// Legacy exports kept for compatibility
export async function sendVerificationEmail({ email, name, verificationUrl }) {
  return sendEmail({
    to: email,
    subject: '[ScholarConf] Verify your email address',
    html: verificationEmailTemplate({ name, verificationUrl }),
    eventType: 'email_verification',
  });
}

export async function sendPasswordResetEmail({ email, name, resetUrl }) {
  return sendEmail({
    to: email,
    subject: '[ScholarConf] Password reset request',
    html: passwordResetTemplate({ name, resetUrl }),
    eventType: 'password_reset',
  });
}

export async function sendReviewerInvitation(params) {
  return sendEmail({
    to: params.email,
    subject: `[ScholarConf Invitation] Reviewer Request for ${params.conferenceName}`,
    html: reviewerInvitationTemplate(params),
    eventType: 'reviewer_invitation',
  });
}

export async function sendCoAuthorInvitation(params) {
  return sendEmail({
    to: params.email,
    subject: `[ScholarConf] Co-Author Confirmation for "${params.paperTitle}"`,
    html: coAuthorInvitationTemplate(params),
    eventType: 'coauthor_invitation',
  });
}
