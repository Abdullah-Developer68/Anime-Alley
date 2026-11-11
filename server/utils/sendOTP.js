// Loaded on first use: only signup sends email, and nodemailer slows every cold start
let transporter = null;
const getTransporter = () => {
  if (!transporter)
    transporter = require("nodemailer").createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  return transporter;
};

const sendOTP = async (email, otp) => {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await getTransporter().sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for verification for Anime Alley",
        text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      });
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to send OTP email after 3 attempts");
};

module.exports = sendOTP;
