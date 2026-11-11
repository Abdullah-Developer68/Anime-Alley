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

const newRefreshToken = () => crypto.randomBytes(32).toString("base64url");

const createSession = async (userId) => {
  const refreshToken = newRefreshToken();
  const now = Date.now();
  const session = await authSessionModel.create({
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(now + IDLE_TIMEOUT_MS),
    absoluteExpiresAt: new Date(now + ABSOLUTE_TIMEOUT_MS),
  });
  return { token: signAccessToken(userId, session._id), refreshToken };
};

// Two tabs can refresh at the same moment with the same token; the slower one gets this long to
// present the token the faster one just replaced
const REUSE_GRACE_MS = 30 * 1000;

// Returns a new access token and a new refresh token (the old one stops working), and pushes back
// the idle timeout. Returns null if the session is gone. A replaced token that comes back after the
// grace period means someone kept a copy, so the whole session is ended.
const refreshSession = async (refreshToken) => {
  const now = new Date();
  const presented = hashRefreshToken(refreshToken);
  const session = await authSessionModel.findOne({
    $or: [{ tokenHash: presented }, { previousTokenHash: presented }],
    expiresAt: { $gt: now },
  });
  if (!session)
    return null;

  const accessToken = signAccessToken(session.userId, session._id);
  if (session.tokenHash !== presented) {
    if (!session.rotatedAt || now - session.rotatedAt > REUSE_GRACE_MS) {
      await authSessionModel.deleteOne({ _id: session._id });
      return null;
    }
    // The other tab already stored the new refresh token in the shared localStorage
    return { userId: session.userId, token: accessToken };
  }

  const nextRefreshToken = newRefreshToken();
  // Conditional on the presented token, so of two simultaneous refreshes only one rotates
  const rotated = await authSessionModel.updateOne(
    { _id: session._id, tokenHash: presented },
    {
      $set: {
        tokenHash: hashRefreshToken(nextRefreshToken),
        previousTokenHash: presented,
        rotatedAt: now,
        expiresAt: new Date(Math.min(now.getTime() + IDLE_TIMEOUT_MS, session.absoluteExpiresAt.getTime())),
      },
    },
  );
  if (rotated.modifiedCount === 0)
    return { userId: session.userId, token: accessToken };
  return { userId: session.userId, token: accessToken, refreshToken: nextRefreshToken };
};

const isSessionActive = (sessionId, userId) =>
  authSessionModel.exists({ _id: sessionId, userId, expiresAt: { $gt: new Date() } });

// Works with the current token or the one it just replaced
const revokeSession = (refreshToken) => {
  const presented = hashRefreshToken(refreshToken);
  return authSessionModel.deleteOne({ $or: [{ tokenHash: presented }, { previousTokenHash: presented }] });
};

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
