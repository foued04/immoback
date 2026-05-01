require('../config/env');
const nodemailer = require('nodemailer');

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const smtpConfig = {
  service: process.env.SMTP_SERVICE || undefined,
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parsePort(process.env.SMTP_PORT, 587),
  secure: parseBoolean(process.env.SMTP_SECURE, false),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.EMAIL_FROM || process.env.SMTP_USER,
  ignoreTlsErrors: parseBoolean(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, false) === false,
};

const ensureEmailConfig = () => {
  const missing = ['SMTP_USER', 'SMTP_PASS'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Email configuration incomplete: missing ${missing.join(', ')}`);
  }
};

const createTransporter = () => {
  ensureEmailConfig();

  // On utilise la configuration manuelle plutôt que le mode "service" 
  // pour mieux contrôler la connexion IPv4
  const transportOptions = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // false pour le port 587
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
    family: 4, // FORCER IPv4
    tls: {
      rejectUnauthorized: false
    }
  };

  return nodemailer.createTransport(transportOptions);
};


const transporter = createTransporter();
let verificationPromise = null;

const verifyTransporter = async () => {
  if (!verificationPromise) {
    verificationPromise = transporter
      .verify()
      .then(() => {
        console.log(
          `[email] SMTP ready via ${smtpConfig.service || `${smtpConfig.host}:${smtpConfig.port}`}`,
        );
      })
      .catch((error) => {
        verificationPromise = null;
        throw error;
      });
  }

  return verificationPromise;
};

const formatFromAddress = () => {
  if (!smtpConfig.from) return undefined;
  return smtpConfig.from.includes('<') ? smtpConfig.from : `ImmoSmart <${smtpConfig.from}>`;
};

const logDeliveryResult = (info) => {
  const accepted = Array.isArray(info.accepted) ? info.accepted.join(', ') : '';
  const rejected = Array.isArray(info.rejected) ? info.rejected.join(', ') : '';
  console.log(
    `[email] messageId=${info.messageId || 'n/a'} accepted=${accepted || 'none'} rejected=${rejected || 'none'} response=${info.response || 'n/a'}`,
  );
};

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 * @returns {Promise<import('nodemailer/lib/smtp-transport').SentMessageInfo>}
 */
const sendEmail = async (to, subject, text, html) => {
  await verifyTransporter();

  const msg = {
    from: formatFromAddress(),
    to,
    subject,
    text,
    html,
    replyTo: smtpConfig.from || smtpConfig.user,
  };

  const info = await transporter.sendMail(msg);
  logDeliveryResult(info);
  return info;
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} code
 * @returns {Promise<import('nodemailer/lib/smtp-transport').SentMessageInfo>}
 */
const sendVerificationEmail = async (to, code) => {
  const subject = 'Verification de votre compte ImmoSmart';
  const text = `Bonjour,\n\nMerci de vous etre inscrit sur ImmoSmart. Votre code de verification est : ${code}\n\nCe code expirera dans 24 heures.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2EC4C7; text-align: center;">Bienvenue sur ImmoSmart</h2>
      <p>Bonjour,</p>
      <p>Merci de vous etre inscrit sur notre plateforme. Pour finaliser la creation de votre compte, veuillez utiliser le code de verification suivant :</p>
      <div style="background: #f3f4f6; padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0; border: 1.5px dashed #2EC4C7;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280; font-weight: 600;">VOTRE CODE DE VERIFICATION</p>
        <span style="font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #111827;">${code}</span>
      </div>
      <p>Ce code est valable pendant <strong>24 heures</strong>.</p>
      <p>Si vous n'avez pas cree de compte, vous pouvez ignorer cet email en toute securite.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2026 ImmoSmart. Tous droits reserves.</p>
    </div>
  `;

  console.log('---------------------------------------------------------');
  console.log(`[VERIFICATION CODE] Account: ${to} | CODE: ${code}`);
  console.log('---------------------------------------------------------');

  return sendEmail(to, subject, text, html);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} code
 * @returns {Promise<import('nodemailer/lib/smtp-transport').SentMessageInfo>}
 */
const sendResetPasswordEmail = async (to, code) => {
  const subject = 'Reinitialisation de votre mot de passe ImmoSmart';
  const text = `Bonjour,\n\nVous avez demande la reinitialisation de votre mot de passe. Votre code de recuperation est : ${code}\n\nCe code expirera dans 15 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #F27D72; text-align: center;">Reinitialisation de mot de passe</h2>
      <p>Bonjour,</p>
      <p>Nous avons recu une demande de reinitialisation de mot de passe pour votre compte. Veuillez utiliser le code suivant pour proceder :</p>
      <div style="background: #fef2f2; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626;">${code}</span>
      </div>
      <p>Ce code est valable pendant <strong>15 minutes</strong>.</p>
      <p>Si vous n'avez pas demande cette reinitialisation, veuillez ignorer cet email.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2026 ImmoSmart. Tous droits reserves.</p>
    </div>
  `;

  return sendEmail(to, subject, text, html);
};

/**
 * Send contract notification email
 * @param {string} to
 * @param {object} contractData
 * @returns {Promise<import('nodemailer/lib/smtp-transport').SentMessageInfo>}
 */
const sendContractEmail = async (to, contractData) => {
  const subject = 'Contrat de location a signer - ImmoSmart';
  const text = `Bonjour,\n\nLe proprietaire a signe et envoye le contrat de location pour le bien "${contractData.propertyTitle}". Veuillez vous connecter a votre compte ImmoSmart pour le consulter et le signer.\n\nCordialement,\nL'equipe ImmoSmart`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2EC4C7; text-align: center;">Contrat de location a signer</h2>
      <p>Bonjour,</p>
      <p>Le proprietaire a signe et envoye le contrat de location pour le bien suivant :</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px; color: #111827;">${contractData.propertyTitle}</h3>
        <p style="margin: 0; color: #6b7280;">${contractData.propertyAddress}</p>
        <p style="margin: 10px 0 0; font-weight: bold;">Loyer: ${contractData.rent} EUR/mois</p>
      </div>
      <p>Veuillez vous connecter a votre compte ImmoSmart pour consulter le contrat et le signer.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tenant/dashboard" style="background: #2EC4C7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acceder a mon compte</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2026 ImmoSmart. Tous droits reserves.</p>
    </div>
  `;

  return sendEmail(to, subject, text, html);
};

/**
 * Send contract signed notification email
 * @param {string} to
 * @param {object} contractData
 * @returns {Promise<import('nodemailer/lib/smtp-transport').SentMessageInfo>}
 */
const sendContractSignedEmail = async (to, contractData) => {
  const subject = 'Contrat signe par le locataire - ImmoSmart';
  const text = `Bonjour,\n\nLe locataire a signe le contrat de location pour le bien "${contractData.propertyTitle}". Vous pouvez maintenant l'activer dans votre compte ImmoSmart.\n\nCordialement,\nL'equipe ImmoSmart`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2EC4C7; text-align: center;">Contrat signe par le locataire</h2>
      <p>Bonjour,</p>
      <p>Le locataire a signe le contrat de location pour le bien suivant :</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px; color: #111827;">${contractData.propertyTitle}</h3>
        <p style="margin: 0; color: #6b7280;">${contractData.propertyAddress}</p>
        <p style="margin: 10px 0 0; font-weight: bold;">Loyer: ${contractData.rent} EUR/mois</p>
      </div>
      <p>Vous pouvez maintenant activer le contrat dans votre compte ImmoSmart.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/owner/dashboard" style="background: #2EC4C7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acceder a mon compte</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2026 ImmoSmart. Tous droits reserves.</p>
    </div>
  `;

  return sendEmail(to, subject, text, html);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendContractEmail,
  sendContractSignedEmail,
  verifyTransporter,
};
