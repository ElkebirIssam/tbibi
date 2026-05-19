const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    console.log('[EMAIL] Ethereal test account created:', testAccount.user);
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

async function sendConfirmationEmail({ to, firstName, lastName, verificationCode }) {
  try {
    const confirmUrl = `${process.env.CLIENT_URL || 'http://localhost:3002'}/verify-email?code=${verificationCode}&email=${to}`;

    const tr = await getTransporter();
    const info = await tr.sendMail({
      from: `"Tbibi.tn" <${process.env.SMTP_FROM || 'noreply@tbibi.tn'}>`,
      to,
      subject: 'Confirmez votre adresse email - Tbibi.tn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0;">🏥 Tbibi.tn</h1>
          </div>
          <div style="padding: 30px; background: #fff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b;">Bienvenue ${firstName} ${lastName} !</h2>
            <p style="color: #64748b; line-height: 1.6;">
              Merci de vous être inscrit sur Tbibi.tn. Pour confirmer votre adresse email, veuillez cliquer sur le lien ci-dessous :
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}"
                 style="background: #2563eb; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Confirmer mon email
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px;">
              Si vous n'avez pas créé de compte, ignorez cet email.
            </p>
            <p style="color: #64748b; font-size: 13px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              L'équipe Tbibi.tn
            </p>
          </div>
        </div>
      `,
    });

    console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL] Preview: ${previewUrl}`);
      return { previewUrl, messageId: info.messageId };
    }

    return { messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Failed:', error.message);
    return null;
  }
}

module.exports = { sendConfirmationEmail };
