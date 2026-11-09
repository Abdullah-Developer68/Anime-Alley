const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const { exportData } = require("../../controllers/export.controller.js");
const {
  exportLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");

// All export routes require authentication and admin role
router.use(verifyTokenMiddleware, requireAdmin, exportLimiter);

// Example: GET /api/exports/users?format=excel
router.get("/:dataType", exportData);

module.exports = router;
