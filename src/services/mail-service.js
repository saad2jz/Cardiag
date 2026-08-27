import nodemailer from 'nodemailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeText(value, max = 160) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

/**
 * SMTP is deliberately opt-in. A missing configuration is reported to the
 * caller instead of silently attempting delivery through an unknown relay.
 */
export function createMailService(env = process.env, transport = null) {
  const configured = Boolean(env.SMTP_HOST && env.SMTP_FROM && (transport || (env.SMTP_USER && env.SMTP_PASSWORD)));
  let transporter = transport;

  function getTransporter() {
    if (!configured) return null;
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number.parseInt(env.SMTP_PORT || '587', 10),
        secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      });
    }
    return transporter;
  }

  async function send({ to, subject, text, html }) {
    if (!EMAIL_RE.test(String(to || ''))) return { sent: false, reason: 'INVALID_RECIPIENT' };
    const client = getTransporter();
    if (!client) return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    await client.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
    return { sent: true };
  }

  return {
    configured,
    send,
    async sendDraftReminder({ to, title, resumeUrl, daysRemaining }) {
      const fiche = safeText(title || 'votre fiche CarDiag');
      const days = Math.max(0, Number.parseInt(daysRemaining || '0', 10));
      const subject = `CarDiag — votre brouillon sera supprimé dans ${days} jour${days === 1 ? '' : 's'}`;
      const text = `Votre brouillon « ${fiche} » n’est pas terminé. Reprenez-le avant sa suppression prévue dans ${days} jour(s) : ${resumeUrl}`;
      return send({
        to,
        subject,
        text,
        html: `<p>Votre brouillon <strong>${fiche}</strong> n’est pas terminé.</p><p>Reprenez-le avant sa suppression prévue dans ${days} jour(s).</p><p><a href="${resumeUrl}">Reprendre ma fiche</a></p>`,
      });
    },
    async sendTeamInvitation({ to, teamName, inviterName, acceptUrl, role }) {
      const team = safeText(teamName || 'votre équipe CarDiag');
      const inviter = safeText(inviterName || 'Un membre de votre équipe');
      const safeRole = safeText(role || 'viewer', 20);
      return send({
        to,
        subject: `${inviter} vous invite dans ${team}`,
        text: `${inviter} vous invite à rejoindre ${team} avec le rôle ${safeRole}. Acceptez l’invitation : ${acceptUrl}`,
        html: `<p><strong>${inviter}</strong> vous invite à rejoindre <strong>${team}</strong>.</p><p>Rôle proposé : ${safeRole}.</p><p><a href="${acceptUrl}">Accepter l’invitation</a></p>`,
      });
    },
  };
}
