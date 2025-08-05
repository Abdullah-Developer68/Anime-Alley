const orderModel = require("../models/order.model.js");
const userModel = require("../models/user.model.js");
const productModel = require("../models/product.model.js");
const couponModel = require("../models/coupon.model.js");
const Reservation = require("../models/reservation.model.js");
const mongoose = require("mongoose");
const dbConnect = require("../config/dbConnect.js");

const placeOrder = async (req, res) => {
  dbConnect();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      cartId,
      couponCode,
      userInfo,
      deliveryAddress,
      paymentMethod,
      userId,
    } = req.body;

    if (!cartId) {
      return res
        .status(400)
        .json({ success: false, message: "cartId is required" });
    }

    // Validate essential order information
    if (!userInfo?.email || !deliveryAddress || !paymentMethod || !userId) {
      return res.status(400).json({
        success: false,
        message:
          "User information, delivery address and payment method are required",
      });
    }

    // Pricing validation removed - all calculations done server-side for security

    // Verify user exists in database
    const user = await userModel
      .findOne({ email: userInfo.email })
      .session(session);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If a coupon is provided, check if the user has already used it
    let couponDoc = null;
    if (couponCode) {
      couponDoc = await couponModel.findOne({ couponCode }).session(session);

      if (!couponDoc) {
        return res.status(400).json({
          success: false,
          message: "Coupon not found.",
        });
      }

      if (user.couponCodeUsed.includes(couponDoc._id)) {
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon.",
        });
      }
    }

    // Define shipping cost (server-controlled)
    const SHIPPING_COST = 5;

    // === RESERVATION PROCESSING ===
    // For authenticated users, prioritize userId over cartId
    let reservation;
    if (userId) {
      reservation = await Reservation.findOne({ userId }).session(session);
    } else {
      reservation = await Reservation.findOne({ cartId }).session(session);
    }

    if (
      !reservation ||
      !reservation.products ||
      reservation.products.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No reserved products found for this cart.",
      });
    }

    // Extract product data from reservation (productId, variant, quantity)
    const productsArray = reservation.products.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: null, // will populate below
      selectedVariant: item.variant,
    }));

    // === ORDER DATA PREPARATION ===

    // Loop through reservation products and fetch product prices (with session)
    for (let item of productsArray) {
      const product = await productModel
        .findById(item.productId)
        .session(session);

      // Fail entire order if any product is not found
      if (!product) {
        // throws an error and moves onto executing the catch block skipping the rest of the try block
        throw new Error(
          `Product not found for ID: ${item.productId}. Order cannot be processed.`
        );
      }

      item.price = product.price;
    }

    // Calculate subtotal from actual database prices
    const subtotal = productsArray.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    // Calculate discount if coupon is provided
    let discount = 0;
    let discountedPrice = subtotal;

    if (couponDoc) {
      discount = Math.round(subtotal * (couponDoc.discountPercentage / 100));
      discountedPrice = subtotal - discount;
    }

    // Calculate final cost
    const finalCost = discountedPrice + SHIPPING_COST;

    // Generate unique orderID
    const orderID = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

    // Create complete order object with server-calculated values (SECURITY)
    const orderData = {
      orderID,
      products: productsArray, // Mapped reservation data with prices
      user: user._id,
      shippingAddress: deliveryAddress,
      paymentMethod,
      subtotal: subtotal, // Server-calculated subtotal
      shippingCost: SHIPPING_COST, // Server-controlled shipping cost
      discount: discount, // Server-calculated discount
      finalAmount: finalCost, // Server-calculated final cost
      couponCode,
    };

    const newOrder = await orderModel.create([orderData], { session });

    // === COUPON PROCESSING  ===

    // Update coupon statistics and user coupon usage (if coupon was applied)
    if (couponCode && discount > 0) {
      // Update coupon statistics (totalUsage, lifeTimeDiscount) with session
      await couponModel.findOneAndUpdate(
        { couponCode },
        {
          $inc: {
            totalUsage: 1,
            lifeTimeDiscount: discount, // Use server-calculated discount
          },
        },
        { session }
      );

      // Add coupon to user's couponCodeUsed array with session
      if (couponDoc && !user.couponCodeUsed.includes(couponDoc._id)) {
        await userModel.findByIdAndUpdate(
          user._id,
          {
            $addToSet: { couponCodeUsed: couponDoc._id },
          },
          { session }
        );
      }
    }

    // === USER ORDER HISTORY UPDATE  ===

    // Add order reference to user's orders array using session
    await userModel.findByIdAndUpdate(
      user._id,
      {
        $push: { orders: newOrder[0]._id },
      },
      { session }
    );

    // === RESERVATION CLEANUP  ===

    await Reservation.deleteOne({ cartId }).session(session);

    // Get populated order details for response
    const populatedOrder = await orderModel
      .findById(newOrder[0]._id)
      .populate({ path: "products.productId" }) // is there is no select then evey thing is selected
      .populate({ path: "user", select: "email username" })
      .session(session);

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: populatedOrder,
    });

    // Commit transaction on success
    await session.commitTransaction();
  } catch (error) {
    // Rollback transaction on any error
    await session.abortTransaction();
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  } finally {
    // Always end the session
    session.endSession();
  }
};

const getOrderHistory = async (req, res) => {
  dbConnect();
  const { email, currPage } = req.query;

  // Validate user email and current page
  if (!email || !currPage) {
    return res.status(400).json({
      success: false,
      message: "User email and current page are required",
    });
  }

  try {
    // Verify user exists
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const ordersPerPage = 2;
    const page = parseInt(currPage, 10) || 1;
    const startIndex = (page - 1) * ordersPerPage;

    // Get the total count of orders for this specific user
    const totalOrders = await orderModel.countDocuments({ user: user._id });

    if (totalOrders === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found for this user",
        paginatedOrders: [],
        totalPages: 0,
        totalOrders: 0,
      });
    }

    const totalPages = Math.ceil(totalOrders / ordersPerPage);

    // Fetch and populate orders with product and user details using pagination
    const paginatedOrders = await orderModel
      .find({ user: user._id })
      .populate({
        path: "products.productId",
        select: "name price image description",
      })
      .populate({ path: "user", select: "email username" })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(ordersPerPage);

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      paginatedOrders,
      totalPages,
      totalOrders,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const allOrdersList = async (req, res) => {
  dbConnect();
  const { email, currPage } = req.query;

  if (!email || !currPage) {
    return res
      .status(400)
      .json({ message: "Email and current page are required!" });
  }
  const user = await userModel.findOne({ email });
  // Check if user exists and is either admin or superAdmin
  if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
    return res.status(403).json("User is not authorized!");
  }

  const ordersPerPage = 20;
  // Parse the current page number, default to 1 if invalid
  const page = parseInt(currPage, 10) || 1;

  const startIndex = (page - 1) * ordersPerPage;

  try {
    const totalOrders = await orderModel.countDocuments();

    const totalPages = Math.ceil(totalOrders / ordersPerPage);

    // Fetch only the orders for the current page using skip and limit
    const currPageOrders = await orderModel
      .find()
      .sort({ createdAt: -1 }) // Sort orders by creation date, newest first
      .skip(startIndex) // Skip orders from previous pages
      .limit(ordersPerPage) // Limit to ordersPerPage results
      .populate({
        path: "products.productId",
        select: "name price image description",
      })
      .populate({ path: "user", select: "email username profilePic" });

    // Respond with paginated orders and pagination info
    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      currPageOrders, // Orders for the current page
      totalOrders, // Total number of orders (for frontend pagination)
      totalPages,
    });
  } catch (error) {
    // Handle and log any errors
    console.error("Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const deleteOrder = async (req, res) => {
  dbConnect();
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required." });
    }

    const result = await orderModel.findByIdAndDelete(orderId);

    if (!result) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Optional: You might want to remove the order reference from the user's order history as well.
    // await userModel.updateMany({}, { $pull: { orders: orderId } });

    res.status(200).json({
      success: true,
      message: `Order with ID: ${orderId} has been deleted.`,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

const updateOrder = async (req, res) => {
  dbConnect();
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required." });
    }

    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

// Controller to get order stats by status
const getOrderStats = async (req, res) => {
  dbConnect();
  try {
    const stats = await orderModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const result = {};
    stats.forEach((s) => {
      result[s._id] = s.count;
    });
    res.json({ success: true, stats: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  placeOrder,
  getOrderHistory,
  allOrdersList,
  deleteOrder,
  updateOrder,
  getOrderStats,
};
