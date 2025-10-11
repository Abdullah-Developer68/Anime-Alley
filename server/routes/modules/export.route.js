const express = require("express");
const router = express.Router();
const verifyTokenMiddleware = require("../../middlewares/custom/auth.middleware.js");
const {
  requireAdmin,
} = require("../../middlewares/custom/roleAuth.middleware.js");
const { exportData } = require("../../controllers/export.controller.js");

// All export routes require authentication and admin role
router.use(verifyTokenMiddleware);
router.use(requireAdmin);

// Generic route for exporting data
// Example: GET /api/export/users?format=excel
router.get("/:dataType", exportData);

module.exports = router;
