const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
  requireAdmin,
} = require("../../middlewares/custom/auth.middleware.js");
const {
  productSearchLimiter,
  adminWriteLimiter,
} = require("../../middlewares/custom/rateLimiters.middleware.js");
const { singleImage } = require("../../middlewares/modules/multerConfig.js");
const { blockDemoWrites } = require("../../middlewares/custom/demo.middleware.js");
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

// Admin-only routes. Demo accounts and rate limits are checked before multer, so a blocked request
// never gets its file parsed.
const adminWrite = [verifyTokenMiddleware, requireAdmin, blockDemoWrites, adminWriteLimiter];
router.post("/", ...adminWrite, singleImage("image"), rejectOperatorKeys, createProduct);
router.put("/:productId", ...adminWrite, singleImage("image"), rejectOperatorKeys, updateProduct);
router.delete("/:productId", ...adminWrite, deleteProduct);

module.exports = router;
