const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { keyFor } = require("./tokenKeys.utils.js");

// A SHA-256 hash in base64url is always 43 characters
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const readSigned = (value, purpose) => {
  if (typeof value !== "string")
    return null;
  try {
    return jwt.verify(value, keyFor(purpose), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
};

const isValidChallenge = (value) =>
  typeof value === "string" && CHALLENGE_PATTERN.test(value);

const challengeFromVerifier = (verifier) =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

const challengesMatch = (a, b) =>
  isValidChallenge(a) &&
  isValidChallenge(b) &&
  crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// The OAuth `state` sent to Google, which carries the browser's challenge through the redirect
const signLoginState = (challenge) =>
  jwt.sign({ challenge }, keyFor("google-oauth-state"), { algorithm: "HS256", expiresIn: "10m" });

const readLoginState = (state) => readSigned(state, "google-oauth-state");

// Short-lived code given to the client instead of the JWT; only redeemable with the matching verifier
const signHandoffCode = (userId, challenge) =>
  jwt.sign({ uid: String(userId), challenge }, keyFor("google-handoff"), { algorithm: "HS256", expiresIn: "60s" });

const readHandoffCode = (code) => readSigned(code, "google-handoff");

module.exports = {
  isValidChallenge,
  challengeFromVerifier,
  challengesMatch,
  signLoginState,
  readLoginState,
  signHandoffCode,
  readHandoffCode,
};
