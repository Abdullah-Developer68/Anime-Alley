const express = require("express");
const router = express.Router();
const verifyTokenMiddleware = require("../../middlewares/custom/auth.middleware.js");
const {
  requireAdmin,
} = require("../../middlewares/custom/roleAuth.middleware.js");
const upload = require("../../middlewares/modules/multerConfig.js");
const {
  getProducts,
  createProduct,
  verifyStock,
  deleteProduct,
  updateProduct,
} = require("../../controllers/product.controller.js");

// Public route - anyone can view products
router.get("/getProducts", getProducts);

// Protected route - authenticated users can verify stock
router.get("/verifyStock", verifyTokenMiddleware, verifyStock);

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
