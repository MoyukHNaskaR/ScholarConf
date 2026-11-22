const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

function baseEmailLayout({ title, badgeText, badgeColor = '#1e3a8a', bodyHtml, ctaText, ctaUrl }) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05); }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 24px; }
        .logo { font-size: 20px; font-weight: 800; color: #0f2b5c; letter-spacing: -0.3px; }
        .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; background-color: ${badgeColor}; color: #ffffff; }
        h1 { font-size: 22px; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
        p { font-size: 15px; line-height: 1.65; color: #475569; margin: 12px 0; }
        .info-box { background: #f8fafc; border-left: 4px solid #0f2b5c; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.6; color: #334155; }
        .cta-wrap { text-align: center; margin: 28px 0 18px; }
        .btn { display: inline-block; background-color: #0f2b5c; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; padding-top: 18px; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">🎓 ScholarConf</div>
          ${badgeText ? `<span class="badge">${badgeText}</span>` : ''}
        </div>
        <h1>${title}</h1>
        ${bodyHtml}
        ${
          ctaText && ctaUrl
            ? `<div class="cta-wrap"><a href="${ctaUrl}" class="btn" target="_blank">${ctaText}</a></div>`
            : ''
        }
        <div class="footer">
          ScholarConf Academic Conference Management Toolkit &bull; ${new Date().getFullYear()}<br/>
          <a href="${CLIENT_URL}" style="color: #64748b;">${CLIENT_URL}</a>
        </div>
      </div>
    </body>
  </html>`;
}

// 1. Welcome Email After Registration
export function welcomeTemplate({ name }) {
  return baseEmailLayout({
    title: 'Welcome to ScholarConf!',
    badgeText: 'Account Activated',
    badgeColor: '#0f2b5c',
    bodyHtml: `
      <p>Dear <strong>${name || 'Researcher'}</strong>,</p>
      <p>Welcome to <strong>ScholarConf</strong>, the academic conference management toolkit for global research communities.</p>
      <div class="info-box">
        <strong>With your ScholarConf account, you can:</strong><br/>
        &bull; Browse and participate in active international research conferences<br/>
        &bull; Submit research manuscripts and track peer review progress<br/>
        &bull; Serve as a Reviewer or request to host a new conference as Program Chair
      </div>
    `,
    ctaText: 'Go to Home Dashboard',
    ctaUrl: `${CLIENT_URL}/dashboard`,
  });
}

// 2. Conference Creation Request Received
export function conferenceRequestReceivedTemplate({ chairName, conferenceName, organizationName, tracks }) {
  return baseEmailLayout({
    title: 'Conference Creation Request Received',
    badgeText: 'Pending Approval',
    badgeColor: '#b45309',
    bodyHtml: `
      <p>Dear <strong>${chairName}</strong>,</p>
      <p>Your request to create and host a new conference on ScholarConf has been received and submitted to the Super Admin team for verification.</p>
      <div class="info-box">
        <strong>Conference / Organization:</strong> ${conferenceName || organizationName}<br/>
        <strong>Organization:</strong> ${organizationName}<br/>
        <strong>Designated Program Chair:</strong> ${chairName}<br/>
        <strong>Tracks:</strong> ${(tracks || []).join(', ')}<br/>
        <strong>Status:</strong> Pending Super Admin Approval
      </div>
      <p>You will receive an email and in-app notification as soon as your conference request is reviewed.</p>
    `,
    ctaText: 'View Dashboard',
    ctaUrl: `${CLIENT_URL}/dashboard`,
  });
}

// 3. Conference Request Approved
export function conferenceApprovedTemplate({ chairName, conferenceName, organizationName, conferenceId }) {
  return baseEmailLayout({
    title: 'Conference Request Approved!',
    badgeText: 'Approved',
    badgeColor: '#065f46',
    bodyHtml: `
      <p>Dear <strong>${chairName}</strong>,</p>
      <p>Congratulations! Your conference creation request has been <strong>Approved</strong> by the ScholarConf Super Admin.</p>
      <div class="info-box">
        <strong>Conference:</strong> ${conferenceName}<br/>
        <strong>Organization:</strong> ${organizationName}<br/>
        <strong>Your Assigned Role:</strong> Sole Program Chair<br/>
        <strong>Visibility:</strong> Active in Browse Conferences
      </div>
      <p>You can now access your dedicated <strong>Chair Console</strong> to manage tracks, oversee manuscript submissions, assign reviewers, and make final acceptance decisions.</p>
    `,
    ctaText: 'Open Chair Console',
    ctaUrl: `${CLIENT_URL}/conference/${conferenceId}/chair`,
  });
}

// 4. Conference Request Rejected
export function conferenceRejectedTemplate({ chairName, conferenceName, organizationName }) {
  return baseEmailLayout({
    title: 'Update on Your Conference Creation Request',
    badgeText: 'Rejected',
    badgeColor: '#991b1b',
    bodyHtml: `
      <p>Dear <strong>${chairName}</strong>,</p>
      <p>Thank you for submitting a request to host <strong>${conferenceName || organizationName}</strong> on ScholarConf.</p>
      <p>After review by the platform Super Admin, your conference request could not be approved at this time.</p>
      <div class="info-box">
        <strong>Organization:</strong> ${organizationName}<br/>
        <strong>Status:</strong> Rejected
      </div>
      <p>If you believe this was an error or wish to submit an updated proposal, you may submit a new conference request from your Home Dashboard.</p>
    `,
    ctaText: 'Return to ScholarConf',
    ctaUrl: `${CLIENT_URL}/dashboard`,
  });
}

// 5. New Paper Submission Confirmation (to Author)
export function paperSubmittedAuthorTemplate({ authorName, paperId, paperTitle, conferenceName, track, conferenceId }) {
  return baseEmailLayout({
    title: 'Manuscript Submission Confirmation',
    badgeText: 'Submitted',
    badgeColor: '#1e40af',
    bodyHtml: `
      <p>Dear <strong>${authorName}</strong>,</p>
      <p>Your research manuscript has been successfully uploaded and registered for peer review.</p>
      <div class="info-box">
        <strong>Paper ID:</strong> ${paperId}<br/>
        <strong>Title:</strong> ${paperTitle}<br/>
        <strong>Conference:</strong> ${conferenceName}<br/>
        <strong>Track:</strong> ${track}<br/>
        <strong>Current Status:</strong> Submitted
      </div>
      <p>You can track real-time review status updates and final decisions from your Author Console.</p>
    `,
    ctaText: 'Track Submission in Author Console',
    ctaUrl: `${CLIENT_URL}/conference/${conferenceId}/author`,
  });
}

// 6. New Paper Submitted Notification (to Chair)
export function paperSubmittedChairTemplate({ chairName, paperId, paperTitle, authorNames, conferenceName, track, conferenceId }) {
  return baseEmailLayout({
    title: 'New Manuscript Submitted to Your Conference',
    badgeText: 'New Submission',
    badgeColor: '#0f2b5c',
    bodyHtml: `
      <p>Dear <strong>${chairName}</strong>,</p>
      <p>A new research paper has been submitted to <strong>${conferenceName}</strong> and is awaiting reviewer assignment.</p>
      <div class="info-box">
        <strong>Paper ID:</strong> ${paperId}<br/>
        <strong>Title:</strong> ${paperTitle}<br/>
        <strong>Track:</strong> ${track}<br/>
        <strong>Authors:</strong> ${authorNames}<br/>
        <strong>Review Status:</strong> Reviewer to be Assigned
      </div>
    `,
    ctaText: 'Assign Reviewers in Chair Console',
    ctaUrl: `${CLIENT_URL}/conference/${conferenceId}/chair`,
  });
}

// 7. Reviewer Assignment Notification (Registered Reviewer)
export function reviewerAssignedTemplate({ reviewerName, paperId, paperTitle, conferenceName, track, reviewDeadline, conferenceId }) {
  return baseEmailLayout({
    title: 'New Paper Assigned for Peer Review',
    badgeText: 'Review Assignment',
    badgeColor: '#0f2b5c',
    bodyHtml: `
      <p>Dear <strong>${reviewerName}</strong>,</p>
      <p>The Program Chair of <strong>${conferenceName}</strong> has assigned a manuscript to you for peer evaluation.</p>
      <div class="info-box">
        <strong>Paper ID:</strong> ${paperId}<br/>
        <strong>Title:</strong> ${paperTitle}<br/>
        <strong>Conference & Track:</strong> ${conferenceName} &bull; ${track}<br/>
        <strong>Review Deadline:</strong> ${reviewDeadline || 'Dec 15, 2026'}
      </div>
      <p>Please log into your Reviewer Console to download the manuscript PDF and submit your structured review on time.</p>
    `,
    ctaText: 'Open Reviewer Console',
    ctaUrl: `${CLIENT_URL}/conference/${conferenceId}/reviewer`,
  });
}

// 8. Reviewer Invitation (For Users Without Existing Accounts)
export function reviewerInvitationUnregisteredTemplate({ reviewerName, reviewerEmail, paperId, paperTitle, conferenceName, track, chairName }) {
  return baseEmailLayout({
    title: `Invitation to Review for ${conferenceName}`,
    badgeText: 'Reviewer Invitation',
    badgeColor: '#0f2b5c',
    bodyHtml: `
      <p>Dear <strong>${reviewerName || 'Colleague'}</strong>,</p>
      <p>On behalf of Program Chair <strong>${chairName || 'Program Committee'}</strong>, you have been invited to serve as a Peer Reviewer for <strong>${conferenceName}</strong>.</p>
      <div class="info-box">
        <strong>Assigned Manuscript:</strong> ${paperId} &mdash; "${paperTitle}"<br/>
        <strong>Conference Track:</strong> ${track || 'General Track'}<br/>
        <strong>Invited Email:</strong> ${reviewerEmail}
      </div>
      <p><strong>How to Access Your Assigned Paper:</strong><br/>
      Click the button below and register or sign in on ScholarConf using <strong>${reviewerEmail}</strong>. Your account will be automatically linked to this reviewer assignment!</p>
    `,
    ctaText: 'Accept & Sign In to ScholarConf',
    ctaUrl: `${CLIENT_URL}/login?email=${encodeURIComponent(reviewerEmail)}`,
  });
}

// 9. Paper Review Completed Notification (to Chair)
export function reviewCompletedChairTemplate({ chairName, reviewerName, paperId, paperTitle, conferenceName, recommendation, completedCount, totalAssigned, conferenceId }) {
  return baseEmailLayout({
    title: `Peer Review Submitted for ${paperId}`,
    badgeText: 'Review Completed',
    badgeColor: '#065f46',
    bodyHtml: `
      <p>Dear <strong>${chairName}</strong>,</p>
      <p>A reviewer has completed and submitted their structured evaluation for a manuscript in <strong>${conferenceName}</strong>.</p>
      <div class="info-box">
        <strong>Paper:</strong> ${paperId} &mdash; ${paperTitle}<br/>
        <strong>Reviewer:</strong> ${reviewerName}<br/>
        <strong>Overall Recommendation:</strong> ${recommendation}<br/>
        <strong>Review Progress:</strong> ${completedCount} / ${totalAssigned} Reviews Completed
      </div>
    `,
    ctaText: 'View Reviews in Chair Console',
    ctaUrl: `${CLIENT_URL}/conference/${conferenceId}/chair`,
  });
}

// 10. Paper Status Updated Notification (to Author)
export function paperStatusUpdatedTemplate({ authorName, paperId, paperTitle, conferenceName, newStatus, conferenceId }) {
  return baseEmailLayout({
    title: `Submission Status Update: ${paperId}`,
    badgeText: newStatus,
    badgeColor: '#1e40af',
    bodyHtml: `
      <p>Dear <strong>${authorName}</strong>,</p>
      <p>The review status of your manuscript submitted to <strong>${conferenceName}</strong> has been updated.</p>
      <div class="info-box">
        <strong>Paper:</strong> ${paperId} &mdash; ${paperTitle}<br/>
        <strong>Conference:</strong> ${conferenceName}<br/>
        <strong>New Status:</strong> ${newStatus}
      </div>
    `,
    ctaText: 'View Status in Author Console',
    ctaUrl: `${CLIENT_URL}/conference/${conferenceId}/author`,
  });
}

// 11 & 12. Paper Final Decision (Accepted / Rejected)
export function paperFinalDecisionTemplate({ authorName, paperId, paperTitle, conferenceName, decision, reviewsSummary, conferenceId }) {
  const isAccepted = decision === 'Accepted';
  return baseEmailLayout({
    title: isAccepted
      ? `Congratulations! Manuscript ${paperId} Accepted`
      : `Final Decision Notification for Manuscript ${paperId}`,
    badgeText: isAccepted ? 'Accepted' : 'Rejected',
    badgeColor: isAccepted ? '#065f46' : '#991b1b',
    bodyHtml: `
      <p>Dear <strong>${authorName}</strong>,</p>
      <p>${
        isAccepted
          ? `We are pleased to inform you that your manuscript <strong>"${paperTitle}"</strong> (${paperId}) has been <strong>ACCEPTED</strong> for presentation and publication at <strong>${conferenceName}</strong>!`
          : `Thank you for submitting your manuscript <strong>"${paperTitle}"</strong> (${paperId}) to <strong>${conferenceName}</strong>. After careful peer review and deliberation by the Program Chair, we regret to inform you that your paper was not selected for acceptance.`
      }</p>
      <div class="info-box">
        <strong>Paper ID:</strong> ${paperId}<br/>
        <strong>Title:</strong> ${paperTitle}<br/>
        <strong>Conference:</strong> ${conferenceName}<br/>
        <strong>Final Decision:</strong> <strong>${decision.toUpperCase()}</strong>
        ${reviewsSummary ? `<br/><br/><strong>Peer Review Feedback Summary:</strong><br/>${reviewsSummary}` : ''}
      </div>
      <p>You can view the detailed anonymized reviewer evaluations in your Author Console.</p>
    `,
    ctaText: 'View Reviews in Author Console',
    ctaUrl: `${CLIENT_URL}/conference/${conferenceId}/author`,
  });
}

// 13. Password Reset Notification
export function passwordResetNotificationTemplate({ email, resetLink }) {
  return baseEmailLayout({
    title: 'ScholarConf Password Reset Instructions',
    badgeText: 'Security',
    badgeColor: '#0f2b5c',
    bodyHtml: `
      <p>Hello,</p>
      <p>A password reset was requested for your ScholarConf account (<strong>${email}</strong>).</p>
      <p>If you requested this reset, please follow the password reset link sent by Firebase Authentication or click below to return to the login portal.</p>
    `,
    ctaText: 'Return to Login Page',
    ctaUrl: resetLink || `${CLIENT_URL}/login`,
  });
}
