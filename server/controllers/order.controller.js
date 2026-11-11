const crypto = require("crypto");
const mongoose = require("mongoose");
const orderModel = require("../db/models/order.model.js");
const userModel = require("../db/models/user.model.js");
const productModel = require("../db/models/product.model.js");
const couponModel = require("../db/models/coupon.model.js");
const Reservation = require("../db/models/reservation.model.js");
const dbConnect = require("../db/dbConnect.js");
const { formatPrice } = require("../utils/formatPrice.utils.js");
const { validateCouponForUser } = require("../utils/coupon.utils.js");
const { addressProblem, isOptionalString, parsePage } = require("../utils/validation.utils.js");
const { RequestError, inTransaction, sendTransactionError } = require("../utils/transaction.utils.js");
const { maskEmail, maskText, HIDDEN_ADDRESS } = require("../utils/privacy.utils.js");
const { expireOpenSessions } = require("../services/stripe.js");

const SHIPPING_COST = 5;
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered"];

const newOrderID = () => `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

// Cash on delivery. Card payments become orders in the Stripe webhook, never here.
const placeOrder = async (req, res) => {
  const userId = req.user?.id;
  const { couponCode, deliveryAddress, paymentMethod } = req.body || {};

  if (paymentMethod !== "cod")
    return res.status(400).json({ success: false, message: "This endpoint only takes cash on delivery orders" });

  const invalidAddress = addressProblem(deliveryAddress);
  if (invalidAddress)
    return res.status(400).json({ success: false, message: invalidAddress });

  if (!isOptionalString(couponCode))
    return res.status(400).json({ success: false, message: "Coupon code must be text" });

  try {
    await dbConnect();
    const order = await inTransaction(async (session) => {
      const user = await userModel.findById(userId).select("couponCodeUsed").session(session);
      if (!user)
        throw new RequestError(404, { message: "User not found" });

      // Shared rules: exists, not expired, not already used by this user
      let coupon = null;
      if (couponCode && couponCode.trim()) {
        const couponCheck = await validateCouponForUser(couponCode, user, { session });
        if (!couponCheck.valid)
          throw new RequestError(couponCheck.status, { message: couponCheck.message });
        coupon = couponCheck.coupon;
      }

      const reservation = await Reservation.findOne({ userId }).lean().session(session);
      if (!reservation?.products?.length)
        throw new RequestError(400, { message: "No reserved products found for this cart." });

      // Current prices for every cart item in one query
      const ids = reservation.products.map((item) => item.productId);
      const products = await productModel.find({ _id: { $in: ids } }).select("name price image").lean().session(session);
      const byId = new Map(products.map((product) => [String(product._id), product]));
      if (reservation.products.some((item) => !byId.has(String(item.productId))))
        throw new RequestError(409, { message: "Some products in your cart are no longer available. Please review your cart." });

      const lines = reservation.products.map((item) => {
        const product = byId.get(String(item.productId));
        return {
          productId: item.productId,
          variant: item.variant,
          name: product.name,
          image: product.image,
          quantity: item.quantity,
          price: formatPrice(product.price),
        };
      });

      const subtotal = formatPrice(lines.reduce((total, line) => total + line.price * line.quantity, 0));
      const discount = coupon ? formatPrice(subtotal * (coupon.discountPercentage / 100)) : 0;

      const [created] = await orderModel.create(
        [
          {
            orderID: newOrderID(),
            products: lines,
            user: userId,
            shippingAddress: deliveryAddress.trim(),
            paymentMethod: "cod",
            subtotal,
            shippingCost: SHIPPING_COST,
            discount,
            finalAmount: formatPrice(subtotal - discount + SHIPPING_COST),
            couponCode: coupon ? coupon.couponCode : null,
          },
        ],
        { session },
      );

      // The coupon is marked as used even if the discount rounds to 0, so it can't be reused
      if (coupon)
        await couponModel.updateOne(
          { _id: coupon._id },
          { $inc: { totalUsage: 1, lifeTimeDiscount: discount } },
          { session },
        );
      await userModel.updateOne(
        { _id: userId },
        { $push: { orders: created._id }, ...(coupon && { $addToSet: { couponCodeUsed: coupon._id } }) },
        { session },
      );
      await Reservation.deleteOne({ _id: reservation._id }).session(session);

      return created;
    });

    // The cart (and any coupon) is now consumed, so open Stripe sessions for the old cart must not
    // be payable anymore. Best effort: never fail an already-committed order.
    await expireOpenSessions(userId).catch((error) => console.error("Failed to expire open checkout sessions:", error));

    res.status(201).json({ success: true, message: "Order placed successfully", order });
  } catch (error) {
    return sendTransactionError(res, error, "Error placing order:");
  }
};

// Item details for orders made before orders stored their own snapshot
const LEGACY_PRODUCT_FIELDS = "name price image";

const getOrderHistory = async (req, res) => {
  try {
    // Orders are always fetched for the authenticated user from the verified token
    const userId = req.user?.id;
    const page = parsePage(req.query?.currPage);
    if (!page)
      return res.status(400).json({ success: false, message: "Current page must be a positive integer" });

    await dbConnect();

    const ordersPerPage = 5;
    const filter = { user: userId };
    const [totalOrders, paginatedOrders] = await Promise.all([
      orderModel.countDocuments(filter),
      orderModel
        .find(filter)
        .select("-user")
        .populate({ path: "products.productId", select: LEGACY_PRODUCT_FIELDS })
        .sort({ createdAt: -1 })
        .skip((page - 1) * ordersPerPage)
        .limit(ordersPerPage)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      paginatedOrders,
      totalPages: Math.ceil(totalOrders / ordersPerPage),
      totalOrders,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Demo admins see orders without the customer's contact details or address
const maskOrderForDemo = (order, viewerId) => {
  if (String(order.user?._id) === viewerId)
    return order;
  return {
    ...order,
    shippingAddress: HIDDEN_ADDRESS,
    user: order.user && {
      ...order.user,
      email: maskEmail(order.user.email),
      username: maskText(order.user.username),
    },
  };
};

const allOrdersList = async (req, res) => {
  try {
    const page = parsePage(req.query?.currPage);
    if (!page)
      return res.status(400).json({ success: false, message: "Current page must be a positive integer" });

    await dbConnect();

    // requireAdmin has already checked the role from the database
    const ordersPerPage = 20;
    const [totalOrders, orders] = await Promise.all([
      orderModel.estimatedDocumentCount(),
      orderModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * ordersPerPage)
        .limit(ordersPerPage)
        .populate({ path: "products.productId", select: LEGACY_PRODUCT_FIELDS })
        .populate({ path: "user", select: "email username profilePic" })
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      currPageOrders: req.user?.isDemo ? orders.map((order) => maskOrderForDemo(order, req.user.id)) : orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / ordersPerPage),
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params?.orderId;
    if (!mongoose.isValidObjectId(orderId))
      return res.status(400).json({ success: false, message: "Invalid order id" });

    await dbConnect();

    const result = await orderModel.findByIdAndDelete(orderId);
    if (!result)
      return res.status(404).json({ success: false, message: "Order not found." });

    await userModel.updateOne({ _id: result.user }, { $pull: { orders: result._id } });

    res.status(200).json({ success: true, message: `Order ${result.orderID} has been deleted.` });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updateOrder = async (req, res) => {
  try {
    const orderId = req.params?.orderId;
    const status = req.body?.status;

    if (!mongoose.isValidObjectId(orderId))
      return res.status(400).json({ success: false, message: "Invalid order id" });

    if (!ORDER_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}`,
      });

    await dbConnect();

    const updatedOrder = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true, runValidators: true }).lean();
    if (!updatedOrder)
      return res.status(404).json({ success: false, message: "Order not found." });

    res.status(200).json({ success: true, message: "Order status updated successfully.", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Order counts by status
const getOrderStats = async (req, res) => {
  try {
    await dbConnect();
    const stats = await orderModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const result = {};
    stats.forEach((s) => {
      result[s._id] = s.count;
    });
    res.json({ success: true, stats: result });
  } catch (error) {
    console.error("Error getting order stats:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// The success page polls this after a Stripe redirect until the webhook has created the order
const verifyOrder = async (req, res) => {
  try {
    const stripeSessionID = req.params?.sessionId;

    if (typeof stripeSessionID !== "string" || !stripeSessionID.trim() || stripeSessionID.length > 200)
      return res.status(400).json({ success: false, message: "Stripe session ID is required." });

    await dbConnect();
    const exists = await orderModel.exists({ stripeSessionID: stripeSessionID.trim() });

    return res.json({ success: Boolean(exists) });
  } catch (error) {
    console.error("Error verifying order:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  placeOrder,
  getOrderHistory,
  allOrdersList,
  deleteOrder,
  updateOrder,
  getOrderStats,
  verifyOrder,
};
