const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const authSessionModel = require("../db/models/authSession.model.js");

// A leaked access token works for at most 15 minutes; the client renews it with the refresh token
const ACCESS_TOKEN_TTL = "15m";
const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

const hashRefreshToken = (refreshToken) =>
  crypto.createHash("sha256").update(refreshToken).digest("hex");

// Only identifiers go in the token. Role and profile are read from the database on each request.
const signAccessToken = (userId, sessionId) =>
  jwt.sign({ userid: String(userId), sid: String(sessionId) }, process.env.JWT_KEY, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL,
  });

// Pinning the algorithm stops a token from choosing how it is checked (e.g. "none")
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_KEY, { algorithms: ["HS256"] });

const createSession = async (userId) => {
  const refreshToken = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const session = await authSessionModel.create({
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(now + IDLE_TIMEOUT_MS),
    absoluteExpiresAt: new Date(now + ABSOLUTE_TIMEOUT_MS),
  });
  return { token: signAccessToken(userId, session._id), refreshToken };
};

// Returns a new access token and pushes back the idle timeout, or null if the session is gone
const refreshSession = async (refreshToken) => {
  const now = Date.now();
  const session = await authSessionModel.findOne({
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: { $gt: new Date(now) },
  });
  if (!session)
    return null;

  session.expiresAt = new Date(Math.min(now + IDLE_TIMEOUT_MS, session.absoluteExpiresAt.getTime()));
  await session.save();
  return { userId: session.userId, token: signAccessToken(session.userId, session._id) };
};

const isSessionActive = (sessionId, userId) =>
  authSessionModel.exists({ _id: sessionId, userId, expiresAt: { $gt: new Date() } });

const revokeSession = (refreshToken) =>
  authSessionModel.deleteOne({ tokenHash: hashRefreshToken(refreshToken) });

// Logs a user out everywhere, optionally keeping the session making the request
const revokeUserSessions = (userId, exceptSessionId) =>
  authSessionModel.deleteMany({
    userId,
    ...(exceptSessionId && { _id: { $ne: exceptSessionId } }),
  });

module.exports = {
  verifyAccessToken,
  createSession,
  refreshSession,
  isSessionActive,
  revokeSession,
  revokeUserSessions,
};
