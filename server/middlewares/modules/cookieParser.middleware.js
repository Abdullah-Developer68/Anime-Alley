const cookieParser = require("cookie-parser");

// Middleware instance for cookie parsing
const cookieParserMiddleware = cookieParser();

module.exports = cookieParserMiddleware;
