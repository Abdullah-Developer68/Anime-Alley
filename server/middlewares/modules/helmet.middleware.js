const helmet = require("helmet");

// Security headers (HSTS, nosniff, frame blocking, no X-Powered-By, ...).
// The API only returns JSON and redirects, so its CSP allows nothing to load or frame it.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },
});

module.exports = helmetMiddleware;
