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
const {
  getProducts,
  createProduct,
  deleteProduct,
  updateProduct,
} = require("../../controllers/product.controller.js");

// Public route - anyone can view products
router.get("/getProducts", productSearchLimiter, getProducts);

// Admin-only routes - require authentication and admin role
router.post(
  "/createProduct",
  verifyTokenMiddleware,
  requireAdmin,
  upload.single("image"),
  createProduct
);
router.post(
  "/deleteProduct",
  verifyTokenMiddleware,
  requireAdmin,
  deleteProduct
);
router.put(
  "/updateProduct",
  verifyTokenMiddleware,
  requireAdmin,
  upload.single("image"),
  updateProduct
);

module.exports = router;
