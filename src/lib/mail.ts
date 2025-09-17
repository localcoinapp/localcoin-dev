
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const asBool = (v?: string) =>
  v ? ['1','true','yes','on'].includes(v.toLowerCase()) : false;

const trim1 = (v?: string) => v?.replace(/\r?\n$/, ''); // drop one trailing newline

function createMailTransport() {
  const host = process.env.SMTP_HOST!;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);

  // 465 => implicit TLS
  const secure = process.env.SMTP_SECURE != null
    ? asBool(process.env.SMTP_SECURE)
    : port === 465;

  const user = trim1(process.env.SMTP_USER);
  const pass = trim1(process.env.SMTP_PASS);

  const opts: SMTPTransport.Options = {
    host,
    port,
    secure,                 // must be true for 465
    auth: user && pass ? { user, pass } : undefined,
    // Optional: pin auth mechanism if your server is picky
    // authMethod: 'LOGIN', // or 'PLAIN' / 'CRAM-MD5'
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
    tls: {
      servername: host,     // proper SNI for cert match
      minVersion: 'TLSv1.2',
      // keep rejectUnauthorized true unless you know you need to relax it
    },
  };

  return nodemailer.createTransport(opts);
}

export async function sendEmail({ to, subject, html }:{
  to: string; subject: string; html: string;
}) {
  const required = ['SMTP_HOST','SMTP_PORT','SMTP_FROM','SMTP_USER','SMTP_PASS'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);

  const transporter = createMailTransport();

  // Helpful during setup
  try {
    await transporter.verify(); // shows CAPA in logs
  } catch (e) {
    console.error('SMTP verify failed:', e);
  }

  const from = process.env.SMTP_FROM || trim1(process.env.SMTP_USER)!;

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log('Message sent:', info.messageId, info.response);
    return info;
  } catch (err: any) {
    console.error('sendMail failed:', {
      code: err?.code, command: err?.command, response: err?.response
    });
    throw err;
  }
}
