const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const sendOTP = async (email, otp) => {
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
};

module.exports = sendOTP;
