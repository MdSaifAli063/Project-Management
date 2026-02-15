const nodemailer = require("nodemailer");

function createTransporter() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html }) {
  // If SMTP not configured or missing credentials/from address, log email to console (development convenience)
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.EMAIL_FROM
  ) {
    console.log("Email (dev) ->", { to, subject });
    console.log("HTML:", html);
    return { accepted: [to], messageId: "dev-simulated" };
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
  // For Ethereal preview:
  if (nodemailer.getTestMessageUrl) {
    const url = nodemailer.getTestMessageUrl(info);
    if (url) console.log("Preview URL:", url);
  }
  return info;
}

module.exports = { sendMail };
