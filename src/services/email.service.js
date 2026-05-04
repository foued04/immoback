require('../config/env');

/**
 * Send an email via Resend API
 */
const sendEmail = async (to, subject, text, html) => {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('[email] Error: RESEND_API_KEY is missing');
    throw new Error('Email configuration incomplete: missing RESEND_API_KEY');
  }

  // Note: Resend Free tier must use 'onboarding@resend.dev' if domain is not verified
  const from = 'ImmoSmart <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: html || text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    console.log(`[email] Success: Email sent to ${to}. ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error('[email] Error sending email:', error.message);
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

const verifyTransporter = async () => true;

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendContractEmail,
  sendContractSignedEmail,
  verifyTransporter,
};
