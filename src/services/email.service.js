const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Helps in some environments
  }
});

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text, html) => {
  const msg = { from: process.env.EMAIL_FROM, to, subject, text, html };
  await transporter.sendMail(msg);
};

/**
 * Send verification email with JWT
 * @param {string} to
 * @param {string} code
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, code) => {
  const subject = 'Vérification de votre compte ImmoSmart';
  const text = `Bonjour,\n\nMerci de vous être inscrit sur ImmoSmart. Votre code de vérification est : ${code}\n\nCe code expirera dans 24 heures.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2EC4C7; text-align: center;">Bienvenue sur ImmoSmart</h2>
      <p>Bonjour,</p>
      <p>Merci de vous être inscrit sur notre plateforme. Pour finaliser la création de votre compte, veuillez utiliser le code de vérification suivant :</p>
      
      <div style="background: #f3f4f6; padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0; border: 1.5px dashed #2EC4C7;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280; font-weight: 600;">VOTRE CODE DE VÉRIFICATION</p>
        <span style="font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #111827;">${code}</span>
      </div>
      
      <p>Ce code est valable pendant <strong>24 heures</strong>.</p>
      <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2024 ImmoSmart. Tous droits réservés.</p>
    </div>
  `;

  // Log to terminal for convenience
  console.log('---------------------------------------------------------');
  console.log(`[VERIFICATION CODE] Account: ${to} | CODE: ${code}`);
  console.log('---------------------------------------------------------');

  try {
    await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error(`[SMTP ERROR]:`, error.message);
  }
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} code
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, code) => {
  const subject = 'Réinitialisation de votre mot de passe ImmoSmart';
  const text = `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe. Votre code de récupération est : ${code}\n\nCe code expirera dans 15 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; borderRadius: 10px;">
      <h2 style="color: #F27D72; textAlign: center;">Réinitialisation de mot de passe</h2>
      <p>Bonjour,</p>
      <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte. Veuillez utiliser le code suivant pour procéder :</p>
      <div style="background: #fef2f2; padding: 20px; textAlign: center; borderRadius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626;">${code}</span>
      </div>
      <p>Ce code est valable pendant <strong>15 minutes</strong>.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
      <hr style="border: 0; borderTop: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; textAlign: center;">&copy; 2024 ImmoSmart. Tous droits réservés.</p>
    </div>
  `;
  
  try {
    await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error(`[SMTP ERROR]:`, error.message);
  }
};

/**
 * Send contract notification email
 * @param {string} to
 * @param {object} contractData
 * @returns {Promise}
 */
const sendContractEmail = async (to, contractData) => {
  const subject = 'Contrat de location à signer - ImmoSmart';
  const text = `Bonjour,\n\nLe propriétaire a signé et envoyé le contrat de location pour le bien "${contractData.propertyTitle}". Veuillez vous connecter à votre compte ImmoSmart pour le consulter et le signer.\n\nCordialement,\nL'équipe ImmoSmart`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2EC4C7; text-align: center;">Contrat de location à signer</h2>
      <p>Bonjour,</p>
      <p>Le propriétaire a signé et envoyé le contrat de location pour le bien suivant :</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px; color: #111827;">${contractData.propertyTitle}</h3>
        <p style="margin: 0; color: #6b7280;">${contractData.propertyAddress}</p>
        <p style="margin: 10px 0 0; font-weight: bold;">Loyer: ${contractData.rent}€/mois</p>
      </div>
      <p>Veuillez vous connecter à votre compte ImmoSmart pour consulter le contrat et le signer.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tenant/dashboard" style="background: #2EC4C7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accéder à mon compte</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2024 ImmoSmart. Tous droits réservés.</p>
    </div>
  `;
  
  try {
    await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error(`[SMTP ERROR]:`, error.message);
  }
};

/**
 * Send contract signed notification email
 * @param {string} to
 * @param {object} contractData
 * @returns {Promise}
 */
const sendContractSignedEmail = async (to, contractData) => {
  const subject = 'Contrat signé par le locataire - ImmoSmart';
  const text = `Bonjour,\n\nLe locataire a signé le contrat de location pour le bien "${contractData.propertyTitle}". Vous pouvez maintenant l'activer dans votre compte ImmoSmart.\n\nCordialement,\nL'équipe ImmoSmart`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2EC4C7; text-align: center;">Contrat signé par le locataire</h2>
      <p>Bonjour,</p>
      <p>Le locataire a signé le contrat de location pour le bien suivant :</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px; color: #111827;">${contractData.propertyTitle}</h3>
        <p style="margin: 0; color: #6b7280;">${contractData.propertyAddress}</p>
        <p style="margin: 10px 0 0; font-weight: bold;">Loyer: ${contractData.rent}€/mois</p>
      </div>
      <p>Vous pouvez maintenant activer le contrat dans votre compte ImmoSmart.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/owner/dashboard" style="background: #2EC4C7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accéder à mon compte</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2024 ImmoSmart. Tous droits réservés.</p>
    </div>
  `;
  
  try {
    await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error(`[SMTP ERROR]:`, error.message);
  }
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendContractEmail,
  sendContractSignedEmail,
};
