export function reviewerInvitationTemplate({
  reviewerName,
  conferenceName,
  trackName,
  reviewDeadline,
  acceptUrl,
  declineUrl,
  chairName,
}) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Invitation to Review for ${conferenceName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .card { background: #ffffff; max-width: 620px; margin: 0 auto; border-radius: 8px; border: 1px solid #e1e4e8; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .logo { font-size: 20px; font-weight: bold; color: #0078d4; margin-bottom: 24px; }
        h1 { font-size: 22px; color: #1e293b; margin-top: 0; }
        p { font-size: 15px; line-height: 1.6; color: #475569; }
        .details-box { background: #f8fafc; border-left: 4px solid #0078d4; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0; font-size: 14px; }
        .actions { text-align: center; margin: 28px 0; }
        .btn-accept { display: inline-block; background-color: #107c41; color: #ffffff !important; padding: 12px 26px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-right: 12px; }
        .btn-decline { display: inline-block; background-color: #d83b01; color: #ffffff !important; padding: 12px 26px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Microsoft CMT Clone</div>
        <h1>Reviewer Invitation Request</h1>
        <p>Dear ${reviewerName || 'Colleague'},</p>
        <p>On behalf of the Program Committee for <strong>${conferenceName}</strong>, we are pleased to invite you to serve as a reviewer for our conference.</p>
        
        <div class="details-box">
          <strong>Conference:</strong> ${conferenceName}<br/>
          ${trackName ? `<strong>Track / Sub-area:</strong> ${trackName}<br/>` : ''}
          ${reviewDeadline ? `<strong>Review Deadline:</strong> ${reviewDeadline}<br/>` : ''}
          ${chairName ? `<strong>Program Chairs:</strong> ${chairName}<br/>` : ''}
        </div>

        <p>Your expertise in this field would be invaluable in ensuring a high-quality peer review process. Please indicate whether you can accept this invitation by clicking one of the buttons below:</p>

        <div class="actions">
          <a href="${acceptUrl}" class="btn-accept" target="_blank">✓ Accept Invitation</a>
          <a href="${declineUrl}" class="btn-decline" target="_blank">✗ Decline Invitation</a>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          If the buttons above do not work, you can respond via these direct links:<br/>
          <strong>Accept:</strong> <a href="${acceptUrl}">${acceptUrl}</a><br/>
          <strong>Decline:</strong> <a href="${declineUrl}">${declineUrl}</a>
        </p>

        <p>Thank you very much for your time, support, and contribution to the academic community.</p>
        <div class="footer">
          Sent via CMT Automated Mailing System &bull; ${new Date().getFullYear()}
        </div>
      </div>
    </body>
  </html>
  `;
}

export function coAuthorInvitationTemplate({
  coAuthorName,
  primaryAuthorName,
  paperTitle,
  conferenceName,
  confirmUrl,
}) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Co-Author Confirmation - ${conferenceName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px; border: 1px solid #e1e4e8; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .logo { font-size: 20px; font-weight: bold; color: #0078d4; margin-bottom: 24px; }
        h1 { font-size: 22px; color: #1e293b; margin-top: 0; }
        p { font-size: 15px; line-height: 1.6; color: #475569; }
        .paper-box { background: #f1f5f9; border-left: 4px solid #0078d4; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0; }
        .btn { display: inline-block; background-color: #0078d4; color: #ffffff !important; padding: 12px 26px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Microsoft CMT Clone</div>
        <h1>Co-Author Confirmation</h1>
        <p>Dear ${coAuthorName || 'Researcher'},</p>
        <p>You have been listed as a co-author on a paper submission submitted to <strong>${conferenceName}</strong> by <strong>${primaryAuthorName}</strong>.</p>
        
        <div class="paper-box">
          <strong>Paper Title:</strong><br/>
          <em>"${paperTitle}"</em>
        </div>

        <p>Please confirm your co-authorship and link this submission to your CMT profile:</p>

        <p style="text-align: center;">
          <a href="${confirmUrl}" class="btn" target="_blank">Confirm Co-Authorship</a>
        </p>

        <p style="font-size: 13px; color: #64748b;">
          Direct Link: <a href="${confirmUrl}">${confirmUrl}</a>
        </p>
        <p>If you were added by mistake, please contact the primary author or the conference program chairs.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Conference Management Toolkit
        </div>
      </div>
    </body>
  </html>
  `;
}
