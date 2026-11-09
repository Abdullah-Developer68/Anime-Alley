// Rejects request data that contains MongoDB operator keys such as {"email": {"$ne": null}}.
// Handlers pass body values straight into Mongoose filters, so a "$" key would change what a query matches.
const MAX_DEPTH = 32;

const hasOperatorKey = (value, depth = 0) => {
  // Anything nested this deep is not a legitimate payload; refuse it rather than recurse further
  if (depth > MAX_DEPTH)
    return true;
  if (Array.isArray(value))
    return value.some((item) => hasOperatorKey(item, depth + 1));
  if (value && typeof value === "object")
    return Object.keys(value).some(
      (key) => key.startsWith("$") || hasOperatorKey(value[key], depth + 1),
    );
  return false;
};

const rejectOperatorKeys = (req, res, next) => {
  if (hasOperatorKey(req.body) || hasOperatorKey(req.query))
    return res.status(400).json({ success: false, message: "Invalid request data" });
  next();
};

module.exports = { rejectOperatorKeys, hasOperatorKey };
