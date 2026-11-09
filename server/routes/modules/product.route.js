const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  productSearchLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");
const upload = require("../../middlewares/modules/multerConfig.js");
// Multipart bodies are parsed after the app-wide check, so they are checked again after multer
const { rejectOperatorKeys } = require("../../middlewares/custom/rejectOperators.middleware.js");
const {
  getProducts,
  createProduct,
  deleteProduct,
  updateProduct,
} = require("../../controllers/product.controller.js");

// Public route - anyone can view products
router.get("/", productSearchLimiter, getProducts);

// Admin-only routes - require authentication and admin role
router.post("/", verifyTokenMiddleware, requireAdmin, upload.single("image"), rejectOperatorKeys, createProduct);
router.put("/:productId", verifyTokenMiddleware, requireAdmin, upload.single("image"), rejectOperatorKeys, updateProduct);
router.delete("/:productId", verifyTokenMiddleware, requireAdmin, deleteProduct);

module.exports = router;
