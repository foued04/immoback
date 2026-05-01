require('./src/config/env');
const emailService = require('./src/services/email.service');

const testMail = async () => {
  console.log('Attempting to send test email...');
  console.log('User:', process.env.SMTP_USER);
  console.log('Pass:', process.env.SMTP_PASS ? '********' : 'MISSING');
  console.log('From:', process.env.EMAIL_FROM || '(fallback to SMTP_USER)');
  
  try {
    const info = await emailService.sendEmail(
      process.env.SMTP_USER,
      'Test ImmoSmart Email',
      'If you see this, email is working!',
      '<p>If you see this, email is working!</p>',
    );
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    process.exitCode = 1;
  }
};

testMail();
