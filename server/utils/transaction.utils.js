const mongoose = require("mongoose");

// Thrown inside a transaction to roll it back and answer the request with this status and body
class RequestError extends Error {
  constructor(status, body) {
    super(body?.message || "Request failed");
    this.status = status;
    this.body = { success: false, ...body };
  }
}

// Runs work(session) in a transaction and returns what it returns. MongoDB retries the whole
// callback on transient errors (e.g. two shoppers taking the same stock), so it must only read
// and write through `session` and must not send the response itself.
const inTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } finally {
    await session.endSession().catch((error) => console.error("Error ending session:", error));
  }
};

// Sends a RequestError's answer, or a generic 500 for anything unexpected
const sendTransactionError = (res, error, logLabel) => {
  if (error instanceof RequestError)
    return res.status(error.status).json(error.body);
  console.error(logLabel, error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

module.exports = { RequestError, inTransaction, sendTransactionError };
