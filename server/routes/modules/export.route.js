const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const { exportData } = require("../../controllers/export.controller.js");

// All export routes require authentication and admin role
router.use(verifyTokenMiddleware);
router.use(requireAdmin);

// Generic route for exporting data
// Example: GET /api/export/users?format=excel
router.get("/:dataType", exportData);

module.exports = router;
