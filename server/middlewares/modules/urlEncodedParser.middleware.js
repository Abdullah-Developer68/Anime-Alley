const express = require("express");

// Middleware instance for parsing URL-encoded bodies
const urlEncodedParser = express.urlencoded({
  extended: true, // Support nested objects
  limit: "50mb",
});

module.exports = urlEncodedParser;
