const reservationModel = require("../db/models/reservation.model.js");
const productModel = require("../db/models/product.model.js");
const mongoose = require("mongoose");
const dbConnect = require("../db/dbConnect.js");
const { formatPrice } = require("../utils/formatPrice.utils.js");
const { isOptionalString } = require("../utils/validation.utils.js");
const { RequestError, inTransaction, sendTransactionError } = require("../utils/transaction.utils.js");

// Stock in a cart is held for everyone else, so one account can't hold the whole catalog
const MAX_ITEM_QUANTITY = 10;
const MAX_CART_LINES = 20;
const MAX_VARIANT_LENGTH = 40;

// Products with a single "Default" variant (toys) don't need the client to name it
const resolveVariant = (product, variant) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const isSingleDefault = variants.length === 1 && variants[0].label === "Default";
  return variant || (isSingleDefault ? "Default" : null);
};

// Takes `quantity` units of one variant only if that same variant has them. $elemMatch makes the
// label and the stock check apply to one array element; two separate conditions could each match
// a different variant and take the stock from the wrong one.
const takeStock = (productId, variant, quantity, session) =>
  productModel.updateOne(
    { _id: productId, variants: { $elemMatch: { label: variant, stock: { $gte: quantity } } } },
    { $inc: { "variants.$.stock": -quantity } },
    { session },
  );

const releaseStock = (productId, variant, quantity, session) =>
  productModel.updateOne(
    { _id: productId, "variants.label": variant },
    { $inc: { "variants.$.stock": quantity } },
    { session },
  );

const reserveStock = async (req, res) => {
  const userId = req.user?.id;
  const { productId, variant, quantity } = req.body || {};

  if (!productId || quantity === undefined || quantity === null)
    return res.status(400).json({ success: false, message: "Missing required fields" });

  // Both end up in stock-update filters, so they must be plain values, not operator objects
  if (typeof productId !== "string" || !mongoose.isValidObjectId(productId) || !isOptionalString(variant) || variant?.length > MAX_VARIANT_LENGTH)
    return res.status(400).json({ success: false, message: "Invalid product or variant" });

  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1)
    return res.status(400).json({ success: false, message: "Quantity must be a positive integer" });

  try {
    await dbConnect();
    const result = await inTransaction(async (session) => {
      const product = await productModel.findById(productId).select("variants").lean().session(session);
      if (!product)
        throw new RequestError(404, { message: "Product not found" });

      const targetVariant = resolveVariant(product, variant);
      if (!targetVariant)
        throw new RequestError(400, { message: "Variant required" });

      const available = product.variants.find((v) => v.label === targetVariant)?.stock || 0;
      if (available === 0)
        throw new RequestError(400, { stock: 0, message: "Stock not available" });

      const reservation =
        (await reservationModel.findOne({ userId }).session(session)) ||
        new reservationModel({ userId, products: [] });
      const line = reservation.products.find(
        (p) => p.productId.toString() === productId && p.variant === targetVariant,
      );
      if (!line && reservation.products.length >= MAX_CART_LINES)
        throw new RequestError(400, { message: `A cart can hold at most ${MAX_CART_LINES} different items.` });

      const room = MAX_ITEM_QUANTITY - (line?.quantity || 0);
      if (room <= 0)
        throw new RequestError(400, { message: `You can hold at most ${MAX_ITEM_QUANTITY} of one item.` });

      const reserved = Math.min(quantity, room, available);
      const taken = await takeStock(productId, targetVariant, reserved, session);
      if (taken.modifiedCount === 0)
        throw new RequestError(409, { stock: -1, message: "Stock just changed. Please try again." });

      if (line)
        line.quantity += reserved;
      else
        reservation.products.push({ productId, variant: targetVariant, quantity: reserved });
      reservation.reservedAt = new Date();
      await reservation.save({ session });

      return { reserved, stockLeft: available - reserved };
    });

    return res.json({
      success: true,
      stock: result.stockLeft,
      message: result.reserved < quantity ? `Only ${result.reserved} reserved` : "Stock reserved",
      reservedQuantity: result.reserved,
      requestedQuantity: quantity,
    });
  } catch (error) {
    return sendTransactionError(res, error, "Error in reserveStock:");
  }
};

// Get user's cart items from server
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    await dbConnect();

    const reservation = await reservationModel
      .findOne({ userId })
      .populate({ path: "products.productId", select: "name price image category variants" })
      .lean();

    if (!reservation)
      return res.json({ success: true, cartItems: [], message: "Cart is empty" });

    // Products deleted from the catalog since they were added are left out
    const cartItems = (reservation.products || [])
      .filter((item) => item.productId != null)
      .map((item) => {
        const product = item.productId;
        return {
          _id: product._id,
          name: product.name,
          price: formatPrice(product.price),
          image: product.image,
          category: product.category,
          selectedVariant: item.variant,
          itemQuantity: item.quantity,
          variants: product.variants,
        };
      });

    res.json({ success: true, cartItems });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ success: false, message: "Failed to fetch cart" });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  const userId = req.user?.id;
  const productId = req.params?.productId;
  const { variant, quantity: newQuantity } = req.body || {};

  if (!mongoose.isValidObjectId(productId))
    return res.status(400).json({ success: false, message: "Invalid product id" });

  if (!isOptionalString(variant) || variant?.length > MAX_VARIANT_LENGTH)
    return res.status(400).json({ success: false, message: "Variant must be a string" });

  if (typeof newQuantity !== "number" || !Number.isInteger(newQuantity) || newQuantity < 0)
    return res.status(400).json({ success: false, message: "quantity must be a non-negative integer" });

  if (newQuantity > MAX_ITEM_QUANTITY)
    return res.status(400).json({ success: false, message: `You can hold at most ${MAX_ITEM_QUANTITY} of one item.` });

  try {
    await dbConnect();
    await inTransaction(async (session) => {
      const reservation = await reservationModel.findOne({ userId }).session(session);
      if (!reservation)
        throw new RequestError(404, { message: "Cart not found" });

      const index = reservation.products.findIndex(
        (p) =>
          p.productId.toString() === productId &&
          (p.variant === variant || (!variant && p.variant === "Default") || (!p.variant && variant === "Default")),
      );
      if (index === -1)
        throw new RequestError(404, { message: "Product not found in cart" });

      const line = reservation.products[index];
      const difference = newQuantity - line.quantity;
      const lineVariant = line.variant || "Default";

      if (difference > 0) {
        const taken = await takeStock(productId, lineVariant, difference, session);
        if (taken.modifiedCount === 0)
          throw new RequestError(400, { message: "Insufficient stock available" });
      } else if (difference < 0)
        await releaseStock(productId, lineVariant, -difference, session);

      if (newQuantity === 0)
        reservation.products.splice(index, 1);
      else
        line.quantity = newQuantity;
      reservation.reservedAt = new Date();

      if (reservation.products.length === 0)
        await reservationModel.deleteOne({ _id: reservation._id }).session(session);
      else
        await reservation.save({ session });
    });

    res.json({ success: true, message: "Cart updated successfully" });
  } catch (error) {
    return sendTransactionError(res, error, "Error updating cart:");
  }
};

// Clear entire cart and give its stock back
const clearCart = async (req, res) => {
  const userId = req.user?.id;

  try {
    await dbConnect();
    await inTransaction(async (session) => {
      const reservation = await reservationModel.findOne({ userId }).lean().session(session);
      if (!reservation)
        return;

      // One round trip for all items; a product deleted since then simply matches nothing
      const restores = (reservation.products || []).map((item) => ({
        updateOne: {
          filter: { _id: item.productId, "variants.label": item.variant || "Default" },
          update: { $inc: { "variants.$.stock": item.quantity } },
        },
      }));
      if (restores.length > 0)
        await productModel.bulkWrite(restores, { session });

      await reservationModel.deleteOne({ _id: reservation._id }).session(session);
    });

    res.json({ success: true, message: "Cart cleared successfully" });
  } catch (error) {
    return sendTransactionError(res, error, "Error clearing cart:");
  }
};

module.exports = {
  reserveStock,
  getCart,
  updateCartItem,
  clearCart,
};
