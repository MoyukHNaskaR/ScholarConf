import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import inviteRoutes from './routes/invite.routes.js';
import scholarConfRoutes from './routes/scholarconf.routes.js';
import { isResendConfigured } from './config/resend.js';
import { isGmailConfigured } from './services/emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const emailMode = isGmailConfigured
    ? 'Live Email Delivery (Gmail SMTP - sends to ANY email)'
    : isResendConfigured
      ? 'Live Email Delivery (Resend API)'
      : 'Simulation Mode (Console)';

  res.json({
    status: 'online',
    service: 'ScholarConf – Conference Management Toolkit Backend',
    gmailConfigured: isGmailConfigured,
    resendConfigured: isResendConfigured,
    mode: emailMode,
  });
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/scholarconf', scholarConfRoutes);

app.listen(PORT, () => {
  console.log(`\n🚀 ScholarConf Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Email Service Mode: ${isResendConfigured ? '🟢 LIVE (Resend API)' : '🟡 SIMULATION (Console Output)'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health\n`);
});
