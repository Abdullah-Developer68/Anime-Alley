const reservationModel = require("../models/reservation.model.js");
const productModel = require("../models/product.model.js");
const mongoose = require("mongoose");
const dbConnect = require("../config/dbConnect.js");

const reserveStock = async (req, res) => {
  await dbConnect();
  // Start a MongoDB session to track/record multiple operations as a single transaction.
  // This allows us to commit all changes together or roll them back entirely if any operation fails.
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const userId = req.user.id; // Get userId from verified token
    const { productId, variant, quantity } = req.body;

    // productId and quantity are required
    if (!productId || !quantity) {
      await mongoSession.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

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

    if (
      product.category === "comics" ||
      product.category === "clothes" ||
      product.category === "shoes"
    ) {
      if (!variant) {
        await mongoSession.abortTransaction();
        return res
          .status(400)
          .json({ success: false, message: "Variant required" });
      }

      stockAvailable = product.stock[variant] || 0;

      if (stockAvailable === 0) {
        await mongoSession.abortTransaction();
        return res.status(400).json({
          success: false,
          stock: 0,
          message: "Stock not available",
        });
      }

      if (stockAvailable < requestedQuantity) {
        actualQuantity = stockAvailable; // Give the max available stock to the user
      }

      // Retry logic for stock update
      let updated = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Re-check stock before each attempt
        const freshProduct = await productModel
          .findById(productId)
          .session(mongoSession);
        const currentStock = freshProduct.stock[variant] || 0;

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

        const update = {};
        update[`stock.${variant}`] = -availableQuantity;

        // If someone else has changed the stock since we checked, this will fail
        updated = await productModel.updateOne(
          { _id: productId, [`stock.${variant}`]: { $gte: availableQuantity } },
          { $inc: update },
          { session: mongoSession } // attach the session to the operation
        );

        // If 0 documents were modified, it means stock was changed by an other user during a transaction
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
    } else {
      // For toys Stock is a single number
      stockAvailable = product.stock;

      if (stockAvailable === 0) {
        await mongoSession.abortTransaction();
        return res.status(400).json({
          success: false,
          stock: 0,
          message: "Stock not available",
        });
      }

      if (stockAvailable < requestedQuantity) {
        actualQuantity = stockAvailable; // Give the max available stock to the user
      }

      // Retry logic for toys
      let updated = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Re-check stock before each attempt
        const freshProduct = await productModel
          .findById(productId)
          .session(mongoSession);
        const currentStock = freshProduct.stock;

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

        // If someone else has changed the stock since we checked, this will fail
        updated = await productModel.updateOne(
          { _id: productId, stock: { $gte: availableQuantity } },
          { $inc: { stock: -availableQuantity } },
          { session: mongoSession } // attach the session to the operation
        );
        // If 0 documents were modified, it means stock was changed by an other user during a transaction
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
    }

    // Upsert reservation - authenticated users only
    let reservation;

    reservation = await reservationModel
      .findOne({ userId })
      .session(mongoSession);

    if (!reservation) {
      reservation = new reservationModel({
        userId,
        products: [],
      });
    }

    // Find if product already reserved
    const prodIdx = reservation.products.findIndex(
      (p) => p.productId.toString() === productId && p.variant === variant
    );

    // If index is found, increment quantity, else add new product
    if (prodIdx !== -1) {
      reservation.products[prodIdx].quantity += actualQuantity;
    } else {
      reservation.products.push({
        productId,
        variant,
        quantity: actualQuantity,
      });
    }
    reservation.reservedAt = new Date();
    await reservation.save({ session: mongoSession }); // attach the session to the save operation
    // Commit the transaction
    await mongoSession.commitTransaction();

    if (stockAvailable < requestedQuantity) {
      return res.json({
        success: true,
        stock: stockAvailable - actualQuantity,
        message: `Only ${actualQuantity} items reserved, stock was less than requested`,
        reservedQuantity: actualQuantity,
        requestedQuantity: requestedQuantity,
      });
    }
    return res.json({
      success: true,
      stock: stockAvailable - actualQuantity,
      message: "Stock reserved",
      reservedQuantity: actualQuantity,
      requestedQuantity: requestedQuantity,
    });
  } catch (err) {
    await mongoSession.abortTransaction();
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
    mongoSession.endSession();
  }
};

// Get user's cart items from server
const getCart = async (req, res) => {
  await dbConnect();
  try {
    const userId = req.user.id; // Get userId from verified token

    // Find user's cart reservation
    const reservation = await reservationModel
      .findOne({ userId })
      .populate("products.productId");

    if (!reservation) {
      return res.json({
        success: true,
        cartItems: [],
        message: "Cart is empty",
      });
    }

    // Transform reservation data to cart format
    const cartItems = await Promise.all(
      reservation.products.map(async (item) => {
        const product = item.productId;
        return {
          _id: product._id,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          selectedVariant: item.variant,
          itemQuantity: item.quantity,
          stock: product.stock,
        };
      })
    );

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
  await dbConnect();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const userId = req.user.id;
    const { productId, variant, newQuantity } = req.body;

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

      if (quantityDiff > 0) {
        // Increasing quantity - reserve more stock
        const availableStock =
          product.category === "toys"
            ? product.stock
            : product.stock[variant] || 0;

        if (availableStock < quantityDiff) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Insufficient stock available",
          });
        }

        // Decrease product stock
        const stockUpdate =
          product.category === "toys"
            ? { stock: -quantityDiff }
            : { [`stock.${variant}`]: -quantityDiff };

        await productModel.updateOne(
          { _id: productId },
          { $inc: stockUpdate },
          { session }
        );
      } else {
        // Decreasing quantity - release stock
        const stockUpdate =
          product.category === "toys"
            ? { stock: -quantityDiff }
            : { [`stock.${variant}`]: -quantityDiff };

        await productModel.updateOne(
          { _id: productId },
          { $inc: stockUpdate },
          { session }
        );
      }
    }

    // Update reservation
    if (newQuantity === 0) {
      reservation.products.splice(productIndex, 1);
    } else {
      reservation.products[productIndex].quantity = newQuantity;
    }

    reservation.reservedAt = new Date();

    if (reservation.products.length === 0) {
      await reservationModel
        .deleteOne({ _id: reservation._id })
        .session(session);
    } else {
      await reservation.save({ session });
    }

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Cart updated successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error updating cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update cart",
    });
  } finally {
    session.endSession();
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  await dbConnect();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const userId = req.user.id;

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
      const stockUpdate =
        product.category === "toys"
          ? { stock: item.quantity }
          : { [`stock.${item.variant}`]: item.quantity };

      await productModel.updateOne(
        { _id: item.productId },
        { $inc: stockUpdate },
        { session }
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
    await session.abortTransaction();
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  reserveStock,
  getCart,
  updateCartItem,
  clearCart,
};
