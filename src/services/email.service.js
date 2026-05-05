const nodemailer = require('nodemailer');
const { 
  SMTP_HOST, 
  SMTP_PORT, 
  SMTP_USER, 
  SMTP_PASS, 
  EMAIL_FROM 
} = require('../config/env');

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Helper to send via Resend API (HTTP - bypasses Render SMTP block)
 */
const sendViaResend = async (to, subject, html) => {
  const { RESEND_API_KEY, EMAIL_FROM } = require('../config/env');
  const from = EMAIL_FROM || 'ImmoSmart <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send email via Resend');
  }
  return data;
};

/**
 * Send an email (Hybrid: Resend if key exists, otherwise SMTP)
 */
const sendEmail = async (to, subject, text, html) => {
  const { RESEND_API_KEY } = require('../config/env');

  // Try Resend first if API KEY is present (Best for Render)
  if (RESEND_API_KEY) {
    try {
      console.log(`[email] Attempting to send via Resend to ${to}...`);
      const res = await sendViaResend(to, subject, html || text);
      console.log(`[email] Success via Resend: ${res.id}`);
      return res;
    } catch (error) {
      console.error('[email] Resend failed, falling back to SMTP:', error.message);
    }
  }

  // Fallback to SMTP (Works locally)
  const mailOptions = {
    from: EMAIL_FROM || `"ImmoSmart" <${SMTP_USER}>`,
    to,
    subject,
    text,
    html: html || text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] Success via SMTP: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[email] Error sending email via SMTP:', error.message);
    throw error;
  }
};


/**
 * Send verification email
 */
const sendVerificationEmail = async (to, code) => {
  const subject = 'Verification de votre compte ImmoSmart';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2EC4C7; text-align: center;">Bienvenue sur ImmoSmart</h2>
      <p>Bonjour,</p>
      <p>Merci de vous etre inscrit sur notre plateforme. Votre code de verification est :</p>
      <div style="background: #f3f4f6; padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0; border: 1.5px dashed #2EC4C7;">
        <span style="font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #111827;">${code}</span>
      </div>
      <p>Ce code est valable pendant <strong>24 heures</strong>.</p>
    </div>
  `;

  console.log('---------------------------------------------------------');
  console.log(`[VERIFICATION CODE] Account: ${to} | CODE: ${code}`);
  console.log('---------------------------------------------------------');

  return sendEmail(to, subject, '', html);
};

/**
 * Send reset password email
 */
const sendResetPasswordEmail = async (to, code) => {
  const subject = 'Reinitialisation de votre mot de passe ImmoSmart';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #F27D72; text-align: center;">Reinitialisation de mot de passe</h2>
      <p>Veuillez utiliser le code suivant : <strong style="font-size: 24px;">${code}</strong></p>
    </div>
  `;
  return sendEmail(to, subject, '', html);
};

/**
 * Send contract notification email
 */
const sendContractEmail = async (to, contractData) => {
  const subject = 'Contrat de location a signer - ImmoSmart';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Contrat de location a signer</h2>
      <p>Le proprietaire a envoye le contrat pour : <strong>${contractData.propertyTitle}</strong></p>
      <p>Veuillez vous connecter pour le signer.</p>
    </div>
  `;
  return sendEmail(to, subject, '', html);
};

/**
 * Send contract signed notification email
 */
const sendContractSignedEmail = async (to, contractData) => {
  const subject = 'Contrat signe par le locataire - ImmoSmart';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Contrat signe</h2>
      <p>Le locataire a signe le contrat pour : <strong>${contractData.propertyTitle}</strong></p>
    </div>
  `;
  return sendEmail(to, subject, '', html);
};

const verifyTransporter = async () => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendContractEmail,
  sendContractSignedEmail,
  verifyTransporter,
};

