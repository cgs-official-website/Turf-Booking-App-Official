const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
      console.log('✅ Nodemailer SMTP pooled transporter initialized');
    }
  }
  return transporter;
}

const nodemailerService = {
  /**
   * Send 6-digit OTP verification code via Email
   * @param {string} email - Recipient email
   * @param {string} otp - 6-digit numeric OTP code
   */
  async sendOtpEmail(email, otp) {
    const mailer = getTransporter();

    if (!mailer) {
      console.log(`\n========================================`);
      console.log(`📧 [MOCK EMAIL OTP] To: ${email}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`⏱️ Expiry: 5 minutes`);
      console.log(`========================================\n`);
      return { success: true, mock: true, message: 'Mock Email sent' };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #10b981; text-align: center;">Turf Booking App</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #555;">Your one-time verification code is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111; background: #f3f4f6; padding: 10px 24px; border-radius: 6px; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 14px; color: #777; text-align: center;">This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #aaa; text-align: center;">If you did not request this OTP, you can safely ignore this email.</p>
      </div>
    `;

    try {
      const info = await mailer.sendMail({
        from: process.env.EMAIL_FROM || '"Turf Booking" <no-reply@turfbookingapp.com>',
        to: email,
        subject: `${otp} is your Turf Booking verification code`,
        html: htmlContent,
      });

      console.log(`📧 Sent OTP Email to ${email} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('❌ Nodemailer Error:', err.message);
      throw new Error('Failed to send Email OTP. Please check SMTP configuration.');
    }
  },
};

module.exports = nodemailerService;
