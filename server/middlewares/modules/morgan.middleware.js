const morgan = require("morgan");

// Middleware instance for logging requests
const morganMiddleware = morgan("dev"); // Logs requests for debugging

module.exports = morganMiddleware;
