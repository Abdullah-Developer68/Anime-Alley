const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const sendOTP = async (email, otp) => {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const transporter = nodemailer.createTransport({
        service: "Gmail", // or any other email provider
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for verification for Anime Alley",
        text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      };

      await transporter.sendMail(mailOptions);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to send OTP email after 3 attempts");
};

module.exports = sendOTP;
