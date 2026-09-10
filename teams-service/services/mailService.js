const nodemailer = require('nodemailer');

const fromName = process.env.SMTP_FROM_NAME || 'RMS Notification';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@rms-system.com';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT && Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn('[MailService] SMTP not fully configured; skipping email send. Set SMTP_HOST/PORT/USER/PASS.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });
}

/**
 * Send interview scheduled email to array of attendees.
 * attendees: array of email strings or objects with { email }
 */
async function sendInterviewScheduledEmail(attendees, subject, startTime, endTime, joinUrl) {
  const transporter = createTransporter();
  if (!transporter) return;

  const list = Array.isArray(attendees) ? attendees : [];

  const sendPromises = list.map((a) => {
    const email = (typeof a === 'string') ? a : (a.email || a.address || a.emailAddress || '');
    if (!email) return Promise.resolve(null);

    const mailSubject = `Interview Scheduled: ${subject}`;

    const html = `
      <p>Dear Candidate,</p>
      <p>Your interview has been scheduled.</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Start:</strong> ${escapeHtml(startTime)}<br/>
      <strong>End:</strong> ${escapeHtml(endTime)}</p>
      <p><a href="${escapeHtml(joinUrl)}">Join Teams Meeting</a></p>
      <p>Regards,<br/>${escapeHtml(fromName)}</p>
    `;

    return transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: mailSubject,
      html,
    });
  });

  return Promise.all(sendPromises);
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sendInterviewScheduledEmail };
