// Import all middleware instances
const corsMiddleware = require("./modules/cors.middleware.js");
const jsonParserMiddleware = require("./modules/jsonParser.middleware.js");
const morganMiddleware = require("./modules/morgan.middleware.js");

// Apply all middlewares with app instance
module.exports = (app) => {
  app.use(corsMiddleware); // CORS
  app.options(/.*/, corsMiddleware); // Handle preflight requests for all routes (RegExp matches / and all subpaths in Express 5)
  app.use(jsonParserMiddleware); // JSON only: no urlencoded parser, so plain HTML forms from other sites have no body
  app.use(morganMiddleware); // Logs requests for debugging
};
