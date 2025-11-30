const express = require("express");

// Middleware instance for parsing JSON bodies
const jsonParserMiddleware = express.json();

module.exports = jsonParserMiddleware;
