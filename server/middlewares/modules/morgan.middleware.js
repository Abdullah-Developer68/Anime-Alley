const morgan = require("morgan");

// Request logging is for local debugging only; Vercel already logs production requests
const morganMiddleware =
  process.env.NODE_ENV === "production" ? (req, res, next) => next() : morgan("dev");

module.exports = morganMiddleware;
