const reservationModel = require("../models/reservation.model.js");
const productModel = require("../models/product.model.js");
const mongoose = require("mongoose");
const dbConnect = require("../config/dbConnect.js");

const reserveStock = async (req, res) => {
  let mongoSession = null;
  try {
    const userId = req.user?.id; // Get userId from verified token

    if (!userId)
      return res.status(401).json({ success: false, message: "Invalid user session" });

    const { productId, variant, quantity } = req.body || {};

    // productId and quantity are required
    if (!productId || quantity === undefined || quantity === null)
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });

    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1)
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be a positive integer" });

    await dbConnect();
    // Start a MongoDB session to track/record multiple operations as a single transaction.
    // This allows us to commit all changes together or roll them back entirely if any operation fails.
    mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    let requestedQuantity = quantity;

    // Find product
    const product = await productModel
      .findById(productId)
      .session(mongoSession);

    if (!product) {
      await mongoSession.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check and decrement stock
    let stockAvailable;
    let actualQuantity = requestedQuantity;
    const MAX_RETRIES = 3; // used to restart verification of stock if it was changed in the middle of a transaction

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const isSingleDefault = variants.length === 1 && variants[0].label === "Default";
    const requiresVariant = !isSingleDefault;

    if (requiresVariant && !variant) {
      await mongoSession.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Variant required" });
    }

    const targetVariant = variant || variants[0]?.label || "Default";

    // Stock lookup strictly using unified variants array
    const variantDoc = variants.find((v) => v.label === targetVariant);
    stockAvailable = variantDoc ? variantDoc.stock : 0;

    if (stockAvailable === 0) {
      await mongoSession.abortTransaction();
      return res.status(400).json({
        success: false,
        stock: 0,
        message: "Stock not available",
      });
    }

    if (stockAvailable < requestedQuantity)
      actualQuantity = stockAvailable; // Give the max available stock to the user

    // Retry logic for stock update
    let updated = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Re-check stock before each attempt
      const freshProduct = await productModel
        .findById(productId)
        .session(mongoSession);

      const freshVariants = Array.isArray(freshProduct?.variants) ? freshProduct.variants : [];
      const currentVariantDoc = freshVariants.find((v) => v.label === targetVariant);
      const currentStock = currentVariantDoc ? currentVariantDoc.stock : 0;

      if (currentStock === 0) {
        await mongoSession.abortTransaction();
        return res.status(400).json({
          success: false,
          stock: 0,
          message: "Stock not available",
        });
      }

      // Adjust quantity if needed
      const availableQuantity = Math.min(actualQuantity, currentStock);

      // Perform atomic decrement on variant stock
      updated = await productModel.updateOne(
        { _id: productId, "variants.label": targetVariant, "variants.stock": { $gte: availableQuantity } },
        { $inc: { "variants.$.stock": -availableQuantity } },
        { session: mongoSession },
      );

      // If 0 documents were modified, it means stock was changed by another user during a transaction
      if (updated.modifiedCount > 0) {
        actualQuantity = availableQuantity;
        stockAvailable = currentStock;
        break; // Success! Exit retry loop
      }

      // If this was the last attempt, give up
      if (attempt === MAX_RETRIES) {
        await mongoSession.abortTransaction();
        return res.status(409).json({
          success: false,
          stock: -1, // Special indicator for concurrent modification
          message:
            "Stock is being modified frequently. Please try again later.",
          retryAfter: 2000, // Suggest client retry after 2 seconds
        });
      }

      // Wait a bit before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }

    // Upsert reservation - authenticated users only
    let reservation;

    reservation = await reservationModel
      .findOne({ userId })
      .session(mongoSession);

    if (!reservation)
      reservation = new reservationModel({
        userId,
        products: [],
      });

    // Find if product already reserved
    const prodIdx = reservation.products.findIndex(
      (p) => p.productId.toString() === productId && p.variant === variant
    );

    // If index is found, increment quantity, else add new product
    if (prodIdx !== -1)
      reservation.products[prodIdx].quantity += actualQuantity;
    else
      reservation.products.push({
        productId,
        variant,
        quantity: actualQuantity,
      });

    reservation.reservedAt = new Date();
    await reservation.save({ session: mongoSession }); // attach the session to the save operation
    // Commit the transaction
    await mongoSession.commitTransaction();

    if (stockAvailable < requestedQuantity)
      return res.json({
        success: true,
        stock: stockAvailable - actualQuantity,
        message: `Only ${actualQuantity} items reserved, stock was less than requested`,
        reservedQuantity: actualQuantity,
        requestedQuantity: requestedQuantity,
      });
    return res.json({
      success: true,
      stock: stockAvailable - actualQuantity,
      message: "Stock reserved",
      reservedQuantity: actualQuantity,
      requestedQuantity: requestedQuantity,
    });
  } catch (err) {
    if (mongoSession && mongoSession.inTransaction()) {
      try {
        await mongoSession.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("Error in reserveStock:", {
      error: err.message,
      stack: err.stack,
      requestBody: req.body,
      timestamp: new Date().toISOString(),
    });
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  } finally {
    // End the session
    if (mongoSession) {
      if (mongoSession.inTransaction()) {
        try {
          await mongoSession.abortTransaction();
        } catch (abortErr) {
          console.error("Error aborting transaction in finally:", abortErr);
        }
      }
      try {
        await mongoSession.endSession();
      } catch (endErr) {
        console.error("Error ending session:", endErr);
      }
    }
  }
};

// Get user's cart items from server
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id; // Get userId from verified token

    if (!userId)
      return res.status(401).json({ success: false, message: "Invalid user session" });

    await dbConnect();

    // Find user's cart reservation
    const reservation = await reservationModel
      .findOne({ userId })
      .populate("products.productId");

    if (!reservation)
      return res.json({
        success: true,
        cartItems: [],
        message: "Cart is empty",
      });

    // Transform reservation data to cart format, filtering out any products deleted from DB
    const validProducts = (reservation.products || []).filter(
      (item) => item.productId != null
    );

    const cartItems = validProducts.map((item) => {
      const product = item.productId;
      return {
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        selectedVariant: item.variant,
        itemQuantity: item.quantity,
        variants: product.variants,
      };
    });

    res.json({
      success: true,
      cartItems,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  let session = null;

  try {
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ success: false, message: "Invalid user session" });

    const { productId, variant, newQuantity } = req.body || {};

    if (!productId)
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });

    if (typeof newQuantity !== "number" || !Number.isInteger(newQuantity) || newQuantity < 0)
      return res.status(400).json({
        success: false,
        message: "newQuantity must be a non-negative integer",
      });

    await dbConnect();
    session = await mongoose.startSession();
    session.startTransaction();

    const reservation = await reservationModel
      .findOne({ userId })
      .session(session);

    if (!reservation) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const productIndex = reservation.products.findIndex(
      (p) => p.productId.toString() === productId && p.variant === variant
    );

    if (productIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    const currentQuantity = reservation.products[productIndex].quantity;
    const quantityDiff = newQuantity - currentQuantity;

    // Handle stock adjustment
    if (quantityDiff !== 0) {
      const product = await productModel.findById(productId).session(session);

      const productVariants = Array.isArray(product?.variants) ? product.variants : [];
      const isSingleDefault = productVariants.length === 1 && productVariants[0]?.label === "Default";
      const targetVariant = variant || (isSingleDefault ? "Default" : null);

      if (!targetVariant) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Variant required",
        });
      }

      const variantDoc = productVariants.find((v) => v.label === targetVariant);
      if (!variantDoc) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Variant not found",
        });
      }

      const availableStock = variantDoc.stock || 0;

      if (quantityDiff > 0 && availableStock < quantityDiff) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Insufficient stock available",
        });
      }

      // Update product stock atomically on variant
      await productModel.updateOne(
        { _id: productId, "variants.label": targetVariant },
        { $inc: { "variants.$.stock": -quantityDiff } },
        { session },
      );
    }

    // Update reservation
    if (newQuantity === 0)
      reservation.products.splice(productIndex, 1);
    else
      reservation.products[productIndex].quantity = newQuantity;

    reservation.reservedAt = new Date();

    if (reservation.products.length === 0)
      await reservationModel
        .deleteOne({ _id: reservation._id })
        .session(session);
    else
      await reservation.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Cart updated successfully",
    });
  } catch (error) {
    if (session && session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("Error updating cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update cart",
    });
  } finally {
    if (session) {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          console.error("Error aborting transaction in finally:", abortErr);
        }
      }
      try {
        await session.endSession();
      } catch (endErr) {
        console.error("Error ending session:", endErr);
      }
    }
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  let session = null;

  try {
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ success: false, message: "Invalid user session" });

    await dbConnect();
    session = await mongoose.startSession();
    session.startTransaction();

    const reservation = await reservationModel
      .findOne({ userId })
      .session(session);

    if (!reservation) {
      await session.abortTransaction();
      return res.json({
        success: true,
        message: "Cart is already empty",
      });
    }

    // Release all stock back to products
    for (const item of reservation.products) {
      const product = await productModel
        .findById(item.productId)
        .session(session);
      if (!product)
        continue;

      const variants = Array.isArray(product.variants) ? product.variants : [];
      const isSingleDefault = variants.length === 1 && variants[0]?.label === "Default";
      const targetVariant = item.variant || (isSingleDefault ? "Default" : null);
      if (!targetVariant)
        continue;

      const variantDoc = variants.find((v) => v.label === targetVariant);
      if (!variantDoc)
        continue;

      await productModel.updateOne(
        { _id: item.productId, "variants.label": targetVariant },
        { $inc: { "variants.$.stock": item.quantity } },
        { session },
      );
    }

    // Delete reservation
    await reservationModel.deleteOne({ _id: reservation._id }).session(session);

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    if (session && session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
    });
  } finally {
    if (session) {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          console.error("Error aborting transaction in finally:", abortErr);
        }
      }
      try {
        await session.endSession();
      } catch (endErr) {
        console.error("Error ending session:", endErr);
      }
    }
  }
};

module.exports = {
  reserveStock,
  getCart,
  updateCartItem,
  clearCart,
};
