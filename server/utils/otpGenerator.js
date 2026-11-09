const crypto = require("crypto");
const { keyFor } = require("./tokenKeys.utils.js");

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// crypto.randomInt is unpredictable; Math.random() is not meant for secrets
const otpData = () => ({
  otp: String(crypto.randomInt(100000, 1000000)),
  otpExpiry: new Date(Date.now() + OTP_TTL_MS),
});

// Only this hash is stored. It is keyed with a server secret, because a plain hash of a
// 6-digit code could be reversed by trying all million codes if the database leaked.
const hashOtp = (email, otp) =>
  crypto.createHmac("sha256", keyFor("signup-otp")).update(`${email}:${otp}`).digest("hex");

const otpMatches = (email, otp, storedHash) => {
  const expected = Buffer.from(hashOtp(email, otp));
  const stored = Buffer.from(typeof storedHash === "string" ? storedHash : "");
  return expected.length === stored.length && crypto.timingSafeEqual(expected, stored);
};

module.exports = { otpData, hashOtp, otpMatches, MAX_OTP_ATTEMPTS };
