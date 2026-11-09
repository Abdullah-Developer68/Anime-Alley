const dbConnect = require("../../db/dbConnect.js");
const rateLimitModel = require("../../db/models/rateLimit.model.js");
const { escapeRegex } = require("../../utils/validation.utils.js");

// A slow database must never hold a request up for long: after this, the limiter gives up and
// express-rate-limit lets the request through (passOnStoreError)
const STORE_TIMEOUT_MS = 2000;
// After a timeout, every limiter skips the database for a while, so only one request pays the wait
const PAUSE_AFTER_TIMEOUT_MS = 10000;
let pausedUntil = 0;

const withTimeout = (run) => {
  if (Date.now() < pausedUntil)
    return Promise.reject(new Error("Rate limit store paused after a timeout"));
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      pausedUntil = Date.now() + PAUSE_AFTER_TIMEOUT_MS;
      reject(new Error("Rate limit store timed out"));
    }, STORE_TIMEOUT_MS);
  });
  return Promise.race([dbConnect().then(run), timeout]).finally(() => clearTimeout(timer));
};

// express-rate-limit store that keeps counters in MongoDB. The default in-memory store doesn't work
// on Vercel: every serverless instance has its own memory and loses it on a cold start, so each
// instance would allow the full limit again. With MongoDB all instances share one count.
class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    // Counts are shared between instances, not kept in this process
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  // Fixed windows: every hit in the same window updates the same document
  currentWindow(key) {
    const start = Math.floor(Date.now() / this.windowMs) * this.windowMs;
    return { id: `${this.prefix}:${key}:${start}`, resetTime: new Date(start + this.windowMs) };
  }

  async increment(key) {
    const { id, resetTime } = this.currentWindow(key);
    // A single atomic upsert, so parallel requests can't both read the old count
    const doc = await withTimeout(() =>
      rateLimitModel.findOneAndUpdate(
        { _id: id },
        { $inc: { hits: 1 }, $setOnInsert: { expiresAt: resetTime } },
        { upsert: true, new: true, lean: true },
      ));
    return { totalHits: doc.hits, resetTime };
  }

  async decrement(key) {
    const { id } = this.currentWindow(key);
    await withTimeout(() => rateLimitModel.updateOne({ _id: id }, { $inc: { hits: -1 } }));
  }

  async resetKey(key) {
    const prefix = `^${escapeRegex(`${this.prefix}:${key}:`)}`;
    await withTimeout(() => rateLimitModel.deleteMany({ _id: { $regex: prefix } }));
  }
}

module.exports = MongoRateLimitStore;
