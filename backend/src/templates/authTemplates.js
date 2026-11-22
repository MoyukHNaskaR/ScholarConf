export function verificationEmailTemplate({ name, verificationUrl }) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your CMT Account</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .card { background: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 8px; border: 1px solid #e1e4e8; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .logo { font-size: 20px; font-weight: bold; color: #0078d4; margin-bottom: 24px; display: inline-block; }
        h1 { font-size: 22px; color: #1e293b; margin-top: 0; }
        p { font-size: 15px; line-height: 1.6; color: #475569; }
        .btn { display: inline-block; background-color: #0078d4; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Microsoft CMT Clone</div>
        <h1>Verify Your Email Address</h1>
        <p>Hello ${name || 'Researcher'},</p>
        <p>Thank you for registering on the Conference Management Toolkit (CMT). Please verify your email address to activate your account and start managing submissions, reviews, and conference assignments.</p>
        <p style="text-align: center;">
          <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
        </p>
        <p>Or paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0078d4; font-size: 13px;">${verificationUrl}</p>
        <p>This verification link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Conference Management Toolkit. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `;
}

export function passwordResetTemplate({ name, resetUrl }) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Reset your CMT Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .card { background: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 8px; border: 1px solid #e1e4e8; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .logo { font-size: 20px; font-weight: bold; color: #0078d4; margin-bottom: 24px; }
        h1 { font-size: 22px; color: #1e293b; margin-top: 0; }
        p { font-size: 15px; line-height: 1.6; color: #475569; }
        .btn { display: inline-block; background-color: #0078d4; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 20px 0; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Microsoft CMT Clone</div>
        <h1>Password Reset Request</h1>
        <p>Hello ${name || 'Researcher'},</p>
        <p>We received a request to reset your CMT account password. Click the button below to choose a new password.</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
        </p>
        <p>Or paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0078d4; font-size: 13px;">${resetUrl}</p>
        <p>If you did not request a password reset, please disregard this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Conference Management Toolkit. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `;
}
