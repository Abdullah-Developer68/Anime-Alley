const express = require("express");

// Middleware instance for parsing JSON bodies (explicit cap; file uploads go through multer instead)
const jsonParserMiddleware = express.json({ limit: "100kb" });

module.exports = jsonParserMiddleware;
