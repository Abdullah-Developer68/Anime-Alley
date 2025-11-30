// Import all middleware instances
const cookieParserMiddleware = require("./modules/cookieParser.middleware.js");
const corsMiddleware = require("./modules/cors.middleware.js");
const jsonParserMiddleware = require("./modules/jsonParser.middleware.js");
const urlEncodedParser = require("./modules/urlEncodedParser.middleware.js");
const morganMiddleware = require("./modules/morgan.middleware.js");

// Apply all middlewares with app instance
module.exports = (app) => {
  app.use(cookieParserMiddleware); // Cookie parser
  app.use(corsMiddleware); // CORS
  app.options("*", corsMiddleware); // Handle preflight requests () for all routes
  app.use(jsonParserMiddleware); // Parses JSON bodies
  app.use(urlEncodedParser); // Parses URL-encoded bodies
  app.use(morganMiddleware); // Logs requests for debugging
};
