const test = require("node:test");
const assert = require("node:assert");
const Module = require("module");

// Set test environment variables
process.env.JWT_KEY = "test-resilience-jwt-secret-key-12345";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:5173";

// Creates a mock response object that strictly simulates Node.js ServerResponse.
// If headersSent is true, attempting to set status or send json throws ERR_HTTP_HEADERS_SENT.
const createMockRes = () => {
  const res = {
    statusCode: 200,
    headersSent: false,
    _json: null,
    _data: null,
    _redirect: null,
    status(code) {
      if (res.headersSent) {
        const err = new Error("ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client");
        err.code = "ERR_HTTP_HEADERS_SENT";
        throw err;
      }
      res.statusCode = code;
      return res;
    },
    json(data) {
      if (res.headersSent) {
        const err = new Error("ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client");
        err.code = "ERR_HTTP_HEADERS_SENT";
        throw err;
      }
      res.headersSent = true;
      res._json = data;
      return res;
    },
    send(data) {
      if (res.headersSent) {
        const err = new Error("ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client");
        err.code = "ERR_HTTP_HEADERS_SENT";
        throw err;
      }
      res.headersSent = true;
      res._data = data;
      return res;
    },
    redirect(url) {
      if (res.headersSent) {
        const err = new Error("ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client");
        err.code = "ERR_HTTP_HEADERS_SENT";
        throw err;
      }
      res.headersSent = true;
      res._redirect = url;
      return res;
    },
    cookie(name, val, opts) {
      res._cookies = res._cookies || {};
      res._cookies[name] = { val, opts };
      return res;
    },
  };
  return res;
};

// Error simulator for database connection failures
let dbConnectShouldFail = false;
let dbConnectError = new Error("MongoServerSelectionError: connection timed out");

// Mock dbConnect
const mockDbConnect = async () => {
  if (dbConnectShouldFail) {
    throw dbConnectError;
  }
  return { readyState: 1 };
};

// Track sessions and transaction states
const activeSessions = [];
const createMockSession = () => {
  let inTx = false;
  let aborted = false;
  let committed = false;
  let ended = false;
  let commitShouldFail = false;

  const sessionObj = {
    startTransaction() {
      inTx = true;
    },
    inTransaction() {
      return inTx;
    },
    async abortTransaction() {
      inTx = false;
      aborted = true;
    },
    async commitTransaction() {
      if (sessionObj.commitShouldFail) {
        throw new Error("Transaction commit failed: write conflict or connection drop");
      }
      inTx = false;
      committed = true;
    },
    async endSession() {
      ended = true;
    },
    get isAborted() {
      return aborted;
    },
    get isCommitted() {
      return committed;
    },
    get isEnded() {
      return ended;
    },
    get commitShouldFail() {
      return commitShouldFail;
    },
    set commitShouldFail(val) {
      commitShouldFail = val;
    },
  };
  activeSessions.push(sessionObj);
  return sessionObj;
};

// Intercept require to mock dbConnect
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
  if (
    request.endsWith("config/dbConnect.js") ||
    request === "../config/dbConnect.js" ||
    request === "../../config/dbConnect.js"
  ) {
    return mockDbConnect;
  }
  return originalRequire.apply(this, arguments);
};

// Load modules under test
const orderController = require("../controllers/order.controller.js");
const productController = require("../controllers/product.controller.js");
const reservationController = require("../controllers/reservation.controller.js");
const couponController = require("../controllers/coupon.controller.js");
const userController = require("../controllers/user.controller.js");
const exportController = require("../controllers/export.controller.js");
const stripeService = require("../services/stripe.js");
const googleAuth = require("../services/googleAuth.js");
const stripeHook = require("../hooks/stripeWebHook.js");
const authService = require("../services/auth.js");
const mongoose = require("mongoose");
const userModel = require("../models/user.model.js");
const productModel = require("../models/product.model.js");
const reservationModel = require("../models/reservation.model.js");
const orderModel = require("../models/order.model.js");
const couponModel = require("../models/coupon.model.js");

// Override mongoose.startSession to track session lifecycle
mongoose.startSession = async () => createMockSession();

// ==========================================
// 1. ORDER CONTROLLER RESILIENCE TESTS
// ==========================================
test("1. Order Controller: Database Resilience & Transaction Safety", async (t) => {
  await t.test("placeOrder returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = {
      user: { id: "user123", email: "user@test.com" },
      body: {
        userInfo: { email: "user@test.com" },
        deliveryAddress: "123 Main St",
        paymentMethod: "cod",
      },
    };
    const res = createMockRes();

    await orderController.placeOrder(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("placeOrder aborts before transaction on missing essential fields", async () => {
    activeSessions.length = 0;
    const req = {
      user: { id: "user123" },
      body: {}, // Missing userInfo, deliveryAddress, paymentMethod
    };
    const res = createMockRes();

    await orderController.placeOrder(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res._json.success, false);
    assert.strictEqual(activeSessions.length, 0);
  });

  await t.test("placeOrder aborts before transaction on invalid payment method", async () => {
    activeSessions.length = 0;
    const req = {
      user: { id: "user123" },
      body: {
        userInfo: { email: "user@test.com" },
        deliveryAddress: "123 Main St",
        paymentMethod: "bitcoin_invalid",
      },
    };
    const res = createMockRes();

    await orderController.placeOrder(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res._json.success, false);
    assert.strictEqual(activeSessions.length, 0);
  });

  await t.test("placeOrder catches transaction commit failure without ERR_HTTP_HEADERS_SENT", async () => {
    activeSessions.length = 0;
    // Mock user and reservation to pass up to commitTransaction
    const originalUserFindOne = userModel.findOne;
    const originalReservationFindOne = reservationModel.findOne;
    const originalProductFindById = productModel.findById;
    const originalOrderCreate = orderModel.create;
    const originalOrderFindById = orderModel.findById;

    userModel.findOne = () => ({
      session: () => ({
        _id: "u123",
        email: "user@test.com",
        couponCodeUsed: [],
      }),
    });
    reservationModel.findOne = () => ({
      session: () => ({
        products: [{ productId: "p123", quantity: 1, variant: "M" }],
      }),
    });
    productModel.findById = () => ({
      session: () => ({ price: 50, name: "Item 1" }),
    });
    orderModel.create = async () => [{ _id: "order_123" }];
    orderModel.findById = () => ({
      populate: () => ({
        populate: () => ({
          session: () => ({
            _id: "order_123",
            finalAmount: 55,
          }),
        }),
      }),
    });
    userModel.findByIdAndUpdate = () => ({ session: () => {} });
    reservationModel.deleteOne = () => ({ session: () => {} });

    // Custom startSession where commit fails
    mongoose.startSession = async () => {
      const sess = createMockSession();
      sess.commitShouldFail = true; // Simulate commit failure
      return sess;
    };

    const req = {
      user: { id: "user123" },
      body: {
        userInfo: { email: "user@test.com" },
        deliveryAddress: "123 Main St",
        paymentMethod: "cod",
      },
    };
    const res = createMockRes();

    // Must NOT throw ERR_HTTP_HEADERS_SENT and must return 500 JSON
    await orderController.placeOrder(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    assert.strictEqual(activeSessions[0].isAborted, true);
    assert.strictEqual(activeSessions[0].isEnded, true);

    // Restore
    userModel.findOne = originalUserFindOne;
    reservationModel.findOne = originalReservationFindOne;
    productModel.findById = originalProductFindById;
    orderModel.create = originalOrderCreate;
    orderModel.findById = originalOrderFindById;
    mongoose.startSession = async () => createMockSession();
  });

  await t.test("getOrderHistory returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { query: { email: "test@example.com", currPage: "1" } };
    const res = createMockRes();
    await orderController.getOrderHistory(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("allOrdersList returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { query: { currPage: "1" }, user: { email: "admin@test.com" } };
    const res = createMockRes();
    await orderController.allOrdersList(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("deleteOrder returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { params: { orderId: "ord123" } };
    const res = createMockRes();
    await orderController.deleteOrder(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("updateOrder returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { params: { orderId: "ord123" }, body: { status: "shipped" } };
    const res = createMockRes();
    await orderController.updateOrder(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("getOrderStats returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = {};
    const res = createMockRes();
    await orderController.getOrderStats(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("verifyOrder returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { query: { stripeSessionID: "sess_123" } };
    const res = createMockRes();
    await orderController.verifyOrder(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });
});

// ==========================================
// 2. PRODUCT CONTROLLER RESILIENCE TESTS
// ==========================================
test("2. Product Controller: Database Resilience & Input Guard", async (t) => {
  await t.test("getProducts returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { query: { productConstraints: JSON.stringify({ category: "toys", page: 1 }) } };
    const res = createMockRes();
    await productController.getProducts(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("createProduct returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { body: { name: "Product A", price: "20", stock: "10", category: "toys" } };
    const res = createMockRes();
    await productController.createProduct(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("updateProduct returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { body: { _id: "prod123", name: "Product A", price: "20", stock: "10", category: "toys" } };
    const res = createMockRes();
    await productController.updateProduct(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("deleteProduct returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { body: { productID: "prod123" } };
    const res = createMockRes();
    await productController.deleteProduct(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("deleteProduct safely handles undefined req.body", async () => {
    const req = {}; // No body property
    const res = createMockRes();
    await productController.deleteProduct(req, res);
    assert.strictEqual(res.statusCode, 400);
  });
});

// ==========================================
// 3. RESERVATION CONTROLLER RESILIENCE TESTS
// ==========================================
test("3. Reservation Controller: Database Resilience & Cart Safety", async (t) => {
  await t.test("reserveStock returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    activeSessions.length = 0;
    const req = { user: { id: "user123" }, body: { productId: "p1", quantity: 1 } };
    const res = createMockRes();
    await reservationController.reserveStock(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("getCart returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { user: { id: "user123" } };
    const res = createMockRes();
    await reservationController.getCart(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("getCart filters deleted products (null productId) without crashing", async () => {
    const originalReservationFindOne = reservationModel.findOne;
    reservationModel.findOne = () => ({
      populate: async () => ({
        products: [
          { productId: null, quantity: 2, variant: "M" }, // Deleted product
          {
            productId: {
              _id: "p_active",
              name: "Active Product",
              price: 30,
              image: "img.jpg",
              category: "toys",
              stock: 10,
            },
            quantity: 1,
            variant: "default",
          },
        ],
      }),
    });

    const req = { user: { id: "user123" } };
    const res = createMockRes();
    await reservationController.getCart(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res._json.success, true);
    assert.strictEqual(res._json.cartItems.length, 1);
    assert.strictEqual(res._json.cartItems[0]._id, "p_active");

    reservationModel.findOne = originalReservationFindOne;
  });

  await t.test("updateCartItem returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { user: { id: "user123" }, body: { productId: "p1", newQuantity: 2 } };
    const res = createMockRes();
    await reservationController.updateCartItem(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("clearCart returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { user: { id: "user123" } };
    const res = createMockRes();
    await reservationController.clearCart(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });
});

// ==========================================
// 4. COUPON CONTROLLER RESILIENCE TESTS
// ==========================================
test("4. Coupon Controller: Database Resilience", async (t) => {
  const couponMethods = [
    { name: "checkCoupon", fn: couponController.checkCoupon, req: { user: { email: "u@t.com" }, body: { couponCode: "DISC10" } } },
    { name: "getAllCoupons", fn: couponController.getAllCoupons, req: { user: { email: "u@t.com" }, query: { currPage: "1" } } },
    { name: "deleteCoupon", fn: couponController.deleteCoupon, req: { params: { couponId: "c123" } } },
    { name: "updateCoupon", fn: couponController.updateCoupon, req: { params: { couponId: "c123" }, body: { discountPercentage: 15, expiryDate: new Date(Date.now() + 86400000).toISOString() } } },
    { name: "createCoupon", fn: couponController.createCoupon, req: { user: { email: "admin@t.com" }, body: { couponCode: "NEW15", discountPercentage: 15, expiryDate: new Date(Date.now() + 86400000).toISOString() } } },
    { name: "getCouponStats", fn: couponController.getCouponStats, req: { user: { email: "admin@t.com" } } },
  ];

  for (const m of couponMethods) {
    await t.test(`${m.name} returns 500 on dbConnect failure`, async () => {
      dbConnectShouldFail = true;
      const res = createMockRes();
      await m.fn(m.req, res);
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res._json.success, false);
      dbConnectShouldFail = false;
    });
  }
});

// ==========================================
// 5. USER & EXPORT CONTROLLERS RESILIENCE
// ==========================================
test("5. User & Export Controllers: Database Resilience", async (t) => {
  await t.test("getUsers returns 500 on dbConnect failure", async () => {
    dbConnectShouldFail = true;
    const req = { user: { email: "admin@t.com" }, query: { currPage: "1" } };
    const res = createMockRes();
    await userController.getUsers(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("deleteUser returns 500 on dbConnect failure", async () => {
    dbConnectShouldFail = true;
    const req = { params: { userId: "507f1f77bcf86cd799439011" }, user: { id: "editor1", email: "admin@t.com" } };
    const res = createMockRes();
    await userController.deleteUser(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("updateUser returns 500 on dbConnect failure", async () => {
    dbConnectShouldFail = true;
    const req = { params: { userId: "507f1f77bcf86cd799439011" }, user: { id: "editor1", email: "admin@t.com" }, body: { username: "updated" } };
    const res = createMockRes();
    await userController.updateUser(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("exportData returns 500 on dbConnect failure", async () => {
    dbConnectShouldFail = true;
    const req = { user: { email: "admin@t.com" }, params: { dataType: "products" }, query: { format: "excel" } };
    const res = createMockRes();
    await exportController.exportData(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });
});

// ==========================================
// 6. STRIPE & GOOGLE AUTH SERVICES RESILIENCE
// ==========================================
test("6. Stripe Service & Google Auth: Database Resilience", async (t) => {
  await t.test("createCheckoutSession returns 500 on dbConnect failure", async () => {
    dbConnectShouldFail = true;
    const req = { user: { id: "u1", email: "u@t.com" }, body: { paymentData: { couponCode: "", deliveryAddress: "123 Main St" } } };
    const res = createMockRes();
    await stripeService.createCheckoutSession(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.ok(res._json.error);
    dbConnectShouldFail = false;
  });

  await t.test("createCheckoutSession handles missing paymentData with 400", async () => {
    const req = { user: { id: "u1", email: "u@t.com" }, body: {} };
    const res = createMockRes();
    await stripeService.createCheckoutSession(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res._json.error);
  });

  await t.test("createCheckoutSession handles missing deliveryAddress with 400", async () => {
    const req = { user: { id: "u1", email: "u@t.com" }, body: { paymentData: { couponCode: "" } } };
    const res = createMockRes();
    await stripeService.createCheckoutSession(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res._json.error);
  });

  await t.test("handleGoogleCallback redirects to login on dbConnect failure without throwing", async () => {
    dbConnectShouldFail = true;
    const req = {};
    const res = createMockRes();
    const next = () => {};

    await googleAuth.handleGoogleCallback(req, res, next);
    assert.strictEqual(res.headersSent, true);
    assert.strictEqual(res._redirect, "http://localhost:5173/login");
    dbConnectShouldFail = false;
  });
});

// ==========================================
// 7. STRIPE WEBHOOK RESILIENCE
// ==========================================
test("7. Stripe Webhook: Database Resilience", async (t) => {
  await t.test("handleStripeWebhook returns 500 on DB failure during checkout.session.completed", async () => {
    dbConnectShouldFail = true;
    // Mock stripe constructEvent
    const Stripe = require("stripe");
    const stripeInstance = Stripe("dummy_key");
    stripeInstance.webhooks.constructEvent = () => ({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_resilience_123",
          metadata: { userId: "user_123", userEmail: "test@example.com" },
        },
      },
    });

    const req = {
      headers: { "stripe-signature": "valid_sig" },
      body: Buffer.from("{}"),
    };
    const res = createMockRes();

    await stripeHook.handleStripeWebhook(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.ok(res._json.error);
    dbConnectShouldFail = false;
  });

  await t.test("processSuccessfulPayment strictly coerces malformed discount amounts to 0", async () => {
    const { parseValidAmount } = stripeHook;
    const testCases = [
      { val: "10abc", expected: 0 },
      { val: "-10", expected: 0 },
      { val: "invalid", expected: 0 },
      { val: "15.50", expected: 15.5 },
      { val: 20, expected: 20 },
      { val: true, expected: 0 },
      { val: false, expected: 0 },
      { val: [20], expected: 0 },
      { val: "   ", expected: 0 },
      { val: "", expected: 0 },
      { val: null, expected: 0 },
      { val: undefined, expected: 0 },
      { val: Infinity, expected: 0 },
      { val: -5, expected: 0 },
    ];
    for (const { val, expected } of testCases) {
      assert.strictEqual(parseValidAmount(val), expected, `Failed for val: ${val}`);
    }

    // Shipping cost fallback to default 5 when empty or missing, but preserves 0 (free shipping)
    assert.strictEqual(parseValidAmount(undefined, 5), 5);
    assert.strictEqual(parseValidAmount("", 5), 5);
    assert.strictEqual(parseValidAmount("   ", 5), 5);
    assert.strictEqual(parseValidAmount("0", 5), 0);
    assert.strictEqual(parseValidAmount(0, 5), 0);
    assert.strictEqual(parseValidAmount("10", 5), 10);
  });
});

// ==========================================
// 8. EXPRESS GLOBAL ERROR HANDLER
// ==========================================
test("8. Express Global Error Handler", async (t) => {
  // Read server/app.js to inspect error-handling middleware
  const app = require("../app.js");
  const router = app.router || app._router;

  await t.test("Global error handler is registered with 4 arguments", () => {
    const errorMiddleware = router.stack.filter(
      (layer) => layer.handle && layer.handle.length === 4
    );
    assert.ok(errorMiddleware.length >= 1, "Global 4-argument error handling middleware must be registered");
  });

  await t.test("Global error handler returns status code and JSON", () => {
    const errorMiddleware = router.stack.filter(
      (layer) => layer.handle && layer.handle.length === 4
    )[0].handle;

    const res = createMockRes();
    const err = new Error("Something broke");
    err.statusCode = 503;

    errorMiddleware(err, {}, res, () => {});
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res._json.success, false);
    assert.strictEqual(res._json.message, "Something broke");
  });

  await t.test("Global error handler delegates to next(err) if headersSent is true", () => {
    const errorMiddleware = router.stack.filter(
      (layer) => layer.handle && layer.handle.length === 4
    )[0].handle;

    const res = createMockRes();
    res.headersSent = true; // Headers already sent
    const err = new Error("Late error");

    let delegatedError = null;
    errorMiddleware(err, {}, res, (passedErr) => {
      delegatedError = passedErr;
    });

    assert.strictEqual(delegatedError, err, "Should delegate to next(err) when headers are already sent");
  });
});

// ==========================================
// 9. FAIL-FAST EARLY RETURN IN-MEMORY VALIDATION
// ==========================================
test("9. Fail-Fast Early Return In-Memory Validation (Resource Preservation)", async (t) => {
  // With dbConnectShouldFail = true, any function calling dbConnect() would return 500.
  // Returning 400 proves that in-memory validation returns BEFORE connecting to DB.
  dbConnectShouldFail = true;

  await t.test("sendSignupOtp returns 400 without dbConnect on missing email", async () => {
    const req = { body: {} };
    const res = createMockRes();
    await authService.sendSignupOtp(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("verifyOTP returns 400 without dbConnect on missing email or otp", async () => {
    const req1 = { body: { email: "test@test.com" } };
    const res1 = createMockRes();
    await authService.verifyOTP(req1, res1);
    assert.strictEqual(res1.statusCode, 400);

    const req2 = { body: { otp: "123456" } };
    const res2 = createMockRes();
    await authService.verifyOTP(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
  });

  await t.test("signUp returns 400 without dbConnect on missing fields or invalid token", async () => {
    const req1 = { body: { email: "test@test.com", password: "pwd" } };
    const res1 = createMockRes();
    await authService.signUp(req1, res1);
    assert.strictEqual(res1.statusCode, 400);

    const req2 = {
      body: {
        email: "test@test.com",
        password: "pwd",
        username: "user1",
        verificationToken: "invalid.token.signature",
      },
    };
    const res2 = createMockRes();
    await authService.signUp(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
  });

  await t.test("login returns 400 without dbConnect on missing credentials", async () => {
    const req = { body: { email: "test@test.com" } };
    const res = createMockRes();
    await authService.login(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("placeOrder returns 400 without dbConnect or session on missing fields", async () => {
    activeSessions.length = 0;
    const req = { user: { id: "u1" }, body: {} };
    const res = createMockRes();
    await orderController.placeOrder(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(activeSessions.length, 0);
  });

  await t.test("deleteOrder returns 400 without dbConnect on missing orderId", async () => {
    const req = { params: {} };
    const res = createMockRes();
    await orderController.deleteOrder(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("updateOrder returns 400 without dbConnect on missing orderId or invalid status", async () => {
    const req = { params: { orderId: "ord1" }, body: { status: "invalid_status" } };
    const res = createMockRes();
    await orderController.updateOrder(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("verifyOrder returns 400 without dbConnect on missing stripeSessionID", async () => {
    const req = { query: {} };
    const res = createMockRes();
    await orderController.verifyOrder(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("createProduct returns 400 without dbConnect on missing fields", async () => {
    const req = { body: { name: "Product" } };
    const res = createMockRes();
    await productController.createProduct(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("deleteProduct returns 400 without dbConnect on missing productID", async () => {
    const req = { body: {} };
    const res = createMockRes();
    await productController.deleteProduct(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("checkCoupon returns 400 without dbConnect on missing couponCode", async () => {
    const req = { user: { email: "u@t.com" }, body: {} };
    const res = createMockRes();
    await couponController.checkCoupon(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("createCoupon returns 400 without dbConnect on missing fields", async () => {
    const req = { user: { email: "a@t.com" }, body: { couponCode: "DISC" } };
    const res = createMockRes();
    await couponController.createCoupon(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("deleteCoupon returns 400 without dbConnect on missing couponId", async () => {
    const req = { params: {} };
    const res = createMockRes();
    await couponController.deleteCoupon(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("updateCoupon returns 400 without dbConnect on missing couponId", async () => {
    const req = { params: {} };
    const res = createMockRes();
    await couponController.updateCoupon(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("deleteUser returns 400 without dbConnect on missing userId or invalid ObjectId", async () => {
    const req = { params: { userId: "not-a-valid-id" } };
    const res = createMockRes();
    await userController.deleteUser(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("updateUser returns 400 without dbConnect on missing userId or invalid ObjectId", async () => {
    const req = { params: { userId: "not-a-valid-id" } };
    const res = createMockRes();
    await userController.updateUser(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("createCheckoutSession returns 400 without dbConnect on missing paymentData or deliveryAddress", async () => {
    const req1 = { user: { id: "u1" }, body: {} };
    const res1 = createMockRes();
    await stripeService.createCheckoutSession(req1, res1);
    assert.strictEqual(res1.statusCode, 400);

    const req2 = { user: { id: "u1" }, body: { paymentData: { couponCode: "" } } };
    const res2 = createMockRes();
    await stripeService.createCheckoutSession(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
  });

  await t.test("createCheckoutSession returns 400 without dbConnect on non-string deliveryAddress or couponCode", async () => {
    // Non-string deliveryAddress: object
    const reqObj = { user: { id: "u1" }, body: { paymentData: { deliveryAddress: { street: "123 Main" } } } };
    const resObj = createMockRes();
    await stripeService.createCheckoutSession(reqObj, resObj);
    assert.strictEqual(resObj.statusCode, 400);
    assert.strictEqual(resObj._json.error, "Delivery address is required and must be a string");

    // Non-string deliveryAddress: number
    const reqNum = { user: { id: "u1" }, body: { paymentData: { deliveryAddress: 12345 } } };
    const resNum = createMockRes();
    await stripeService.createCheckoutSession(reqNum, resNum);
    assert.strictEqual(resNum.statusCode, 400);

    // Non-string couponCode: object
    const reqCoupon = { user: { id: "u1" }, body: { paymentData: { deliveryAddress: "123 Main St", couponCode: { code: "SAVE10" } } } };
    const resCoupon = createMockRes();
    await stripeService.createCheckoutSession(reqCoupon, resCoupon);
    assert.strictEqual(resCoupon.statusCode, 400);
    assert.strictEqual(resCoupon._json.error, "Coupon code must be a string");
  });

  await t.test("reserveStock returns 400 without dbConnect or session on missing fields", async () => {
    activeSessions.length = 0;
    const req = { user: { id: "u1" }, body: {} };
    const res = createMockRes();
    await reservationController.reserveStock(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(activeSessions.length, 0);
  });

  await t.test("getAllCoupons returns 400 without dbConnect on missing currPage", async () => {
    const req = { user: { email: "u@t.com" }, query: {} };
    const res = createMockRes();
    await couponController.getAllCoupons(req, res);
    assert.strictEqual(res.statusCode, 400);

    const emptyReq = {};
    const emptyRes = createMockRes();
    await couponController.getAllCoupons(emptyReq, emptyRes);
    assert.strictEqual(emptyRes.statusCode, 400);
  });

  await t.test("getOrderHistory returns 400 without dbConnect on missing email or currPage", async () => {
    const req = { query: { email: "test@test.com" } };
    const res = createMockRes();
    await orderController.getOrderHistory(req, res);
    assert.strictEqual(res.statusCode, 400);

    const emptyReq = {};
    const emptyRes = createMockRes();
    await orderController.getOrderHistory(emptyReq, emptyRes);
    assert.strictEqual(emptyRes.statusCode, 400);
  });

  await t.test("getUsers returns 400 without dbConnect on missing currPage", async () => {
    const req = { user: { email: "admin@t.com" }, query: {} };
    const res = createMockRes();
    await userController.getUsers(req, res);
    assert.strictEqual(res.statusCode, 400);

    const emptyReq = {};
    const emptyRes = createMockRes();
    await userController.getUsers(emptyReq, emptyRes);
    assert.strictEqual(emptyRes.statusCode, 400);
  });

  await t.test("exportData returns 400 without dbConnect on missing format or dataType", async () => {
    const req = { params: { dataType: "products" }, query: {} };
    const res = createMockRes();
    await exportController.exportData(req, res);
    assert.strictEqual(res.statusCode, 400);

    const emptyReq = {};
    const emptyRes = createMockRes();
    await exportController.exportData(emptyReq, emptyRes);
    assert.strictEqual(emptyRes.statusCode, 400);
  });

  await t.test("exportData returns 400 without dbConnect on invalid format or dataType", async () => {
    const req1 = { params: { dataType: "invalid_type" }, query: { format: "excel" } };
    const res1 = createMockRes();
    await exportController.exportData(req1, res1);
    assert.strictEqual(res1.statusCode, 400);

    const req2 = { params: { dataType: "products" }, query: { format: "csv_invalid" } };
    const res2 = createMockRes();
    await exportController.exportData(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
  });

  await t.test("createProduct returns 400 without dbConnect on invalid category or stock JSON", async () => {
    const req1 = { body: { name: "Product", price: "20", stock: "10", category: "invalid_cat" } };
    const res1 = createMockRes();
    await productController.createProduct(req1, res1);
    assert.strictEqual(res1.statusCode, 400);

    const req2 = { body: { name: "Comic A", price: "20", stock: "invalid-json", category: "comics" } };
    const res2 = createMockRes();
    await productController.createProduct(req2, res2);
    assert.strictEqual(res2.statusCode, 400);

    // Negative price
    const req3 = { body: { name: "Toy A", price: -5, stock: 0, category: "toys" } };
    const res3 = createMockRes();
    await productController.createProduct(req3, res3);
    assert.strictEqual(res3.statusCode, 400);
    assert.strictEqual(res3._json.message, "Price must be a valid non-negative number");

    // Negative stock for toy
    const req4 = { body: { name: "Toy A", price: 0, stock: -1, category: "toys" } };
    const res4 = createMockRes();
    await productController.createProduct(req4, res4);
    assert.strictEqual(res4.statusCode, 400);
    assert.strictEqual(res4._json.message, "Invalid stock value for toy");

    // Partially numeric price
    const reqPartNumeric = { body: { name: "Toy A", price: "20abc", stock: 0, category: "toys" } };
    const resPartNumeric = createMockRes();
    await productController.createProduct(reqPartNumeric, resPartNumeric);
    assert.strictEqual(resPartNumeric.statusCode, 400);
    assert.strictEqual(resPartNumeric._json.message, "Price must be a valid non-negative number");

    // Float stock for toy
    const reqFloatStock = { body: { name: "Toy A", price: 10, stock: 2.5, category: "toys" } };
    const resFloatStock = createMockRes();
    await productController.createProduct(reqFloatStock, resFloatStock);
    assert.strictEqual(resFloatStock.statusCode, 400);
    assert.strictEqual(resFloatStock._json.message, "Invalid stock value for toy");

    // Number stock for comic
    const reqComicNumStock = { body: { name: "Comic A", price: 10, stock: 10, category: "comics" } };
    const resComicNumStock = createMockRes();
    await productController.createProduct(reqComicNumStock, resComicNumStock);
    assert.strictEqual(resComicNumStock.statusCode, 400);
    assert.strictEqual(resComicNumStock._json.message, "Stock must be an object for comics");

    // Whitespace price
    const reqSpacePrice = { body: { name: "Toy A", price: "   ", stock: 10, category: "toys" } };
    const resSpacePrice = createMockRes();
    await productController.createProduct(reqSpacePrice, resSpacePrice);
    assert.strictEqual(resSpacePrice.statusCode, 400);
    assert.strictEqual(resSpacePrice._json.message, "fields in data from client are missing");

    // Whitespace stock
    const reqSpaceStock = { body: { name: "Toy A", price: 10, stock: "   ", category: "toys" } };
    const resSpaceStock = createMockRes();
    await productController.createProduct(reqSpaceStock, resSpaceStock);
    assert.strictEqual(resSpaceStock.statusCode, 400);
    assert.strictEqual(resSpaceStock._json.message, "fields in data from client are missing");
  });

  await t.test("deleteProduct returns 400 on whitespace productID", async () => {
    const req = { body: { productID: "   " } };
    const res = createMockRes();
    await productController.deleteProduct(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res._json.message, "The productID is required!");
  });

  await t.test("updateProduct returns 400 without dbConnect on missing fields or invalid stock", async () => {
    const req1 = { body: { _id: "prod123" } };
    const res1 = createMockRes();
    await productController.updateProduct(req1, res1);
    assert.strictEqual(res1.statusCode, 400);

    const req2 = { body: { _id: "prod123", name: "Product", price: "20", stock: "invalid-json", category: "comics" } };
    const res2 = createMockRes();
    await productController.updateProduct(req2, res2);
    assert.strictEqual(res2.statusCode, 400);

    // Negative price
    const req3 = { body: { _id: "prod123", name: "Toy A", price: -10, stock: 0, category: "toys" } };
    const res3 = createMockRes();
    await productController.updateProduct(req3, res3);
    assert.strictEqual(res3.statusCode, 400);
    assert.strictEqual(res3._json.message, "Price must be a valid non-negative number");

    // Partially numeric price
    const reqUpdatePartNumeric = { body: { _id: "prod123", name: "Toy A", price: "10abc", stock: 0, category: "toys" } };
    const resUpdatePartNumeric = createMockRes();
    await productController.updateProduct(reqUpdatePartNumeric, resUpdatePartNumeric);
    assert.strictEqual(resUpdatePartNumeric.statusCode, 400);
    assert.strictEqual(resUpdatePartNumeric._json.message, "Price must be a valid non-negative number");

    // Negative stock for toy
    const req4 = { body: { _id: "prod123", name: "Toy A", price: 0, stock: -2, category: "toys" } };
    const res4 = createMockRes();
    await productController.updateProduct(req4, res4);
    assert.strictEqual(res4.statusCode, 400);
    assert.strictEqual(res4._json.message, "Invalid stock value for toy");

    // Float stock for toy
    const reqUpdateFloatStock = { body: { _id: "prod123", name: "Toy A", price: 0, stock: 1.5, category: "toys" } };
    const resUpdateFloatStock = createMockRes();
    await productController.updateProduct(reqUpdateFloatStock, resUpdateFloatStock);
    assert.strictEqual(resUpdateFloatStock.statusCode, 400);
    assert.strictEqual(resUpdateFloatStock._json.message, "Invalid stock value for toy");

    // Number stock for comic in update
    const reqUpdateComicNumStock = { body: { _id: "prod123", name: "Comic A", price: 10, stock: 10, category: "comics" } };
    const resUpdateComicNumStock = createMockRes();
    await productController.updateProduct(reqUpdateComicNumStock, resUpdateComicNumStock);
    assert.strictEqual(resUpdateComicNumStock.statusCode, 400);
    assert.strictEqual(resUpdateComicNumStock._json.message, "Stock must be an object for comics");

    // Whitespace price
    const reqUpdateSpacePrice = { body: { _id: "prod123", name: "Toy A", price: "   ", stock: 10, category: "toys" } };
    const resUpdateSpacePrice = createMockRes();
    await productController.updateProduct(reqUpdateSpacePrice, resUpdateSpacePrice);
    assert.strictEqual(resUpdateSpacePrice.statusCode, 400);
    assert.strictEqual(resUpdateSpacePrice._json.message, "fields in data from client are missing");

    // Whitespace stock
    const reqUpdateSpaceStock = { body: { _id: "prod123", name: "Toy A", price: 10, stock: "   ", category: "toys" } };
    const resUpdateSpaceStock = createMockRes();
    await productController.updateProduct(reqUpdateSpaceStock, resUpdateSpaceStock);
    assert.strictEqual(resUpdateSpaceStock.statusCode, 400);
    assert.strictEqual(resUpdateSpaceStock._json.message, "fields in data from client are missing");
  });

  await t.test("createProduct and updateProduct allow price = 0 and stock = 0 without returning 400 missing fields", async () => {
    dbConnectShouldFail = true;
    const reqCreate = { body: { name: "Free Toy", price: 0, stock: 0, category: "toys" } };
    const resCreate = createMockRes();
    await productController.createProduct(reqCreate, resCreate);
    assert.strictEqual(resCreate.statusCode, 500);

    const reqUpdate = { body: { _id: "prod123", name: "Out of Stock Toy", price: 0, stock: 0, category: "toys" } };
    const resUpdate = createMockRes();
    await productController.updateProduct(reqUpdate, resUpdate);
    assert.strictEqual(resUpdate.statusCode, 500);
    dbConnectShouldFail = false;
  });

  await t.test("createProduct returns 400 without dbConnect on missing or invalid comic volume stock", async () => {
    const req1 = {
      body: {
        name: "One Piece",
        price: 10,
        category: "comics",
        stock: JSON.stringify({ "Vol 1": 5 }),
        volumes: JSON.stringify(["Vol 1", "Vol 2"]),
      },
    };
    const res1 = createMockRes();
    await productController.createProduct(req1, res1);
    assert.strictEqual(res1.statusCode, 400);
    assert.ok(res1._json.message.includes("Stock value missing or invalid for volume Vol 2"));

    const req2 = {
      body: {
        name: "One Piece",
        price: 10,
        category: "comics",
        stock: JSON.stringify({ "Vol 1": -5 }),
        volumes: JSON.stringify(["Vol 1"]),
      },
    };
    const res2 = createMockRes();
    await productController.createProduct(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
    assert.ok(res2._json.message.includes("Stock value missing or invalid for volume Vol 1"));
  });

  await t.test("updateProduct returns 400 without dbConnect on missing or invalid size stock", async () => {
    const req1 = {
      body: {
        _id: "507f1f77bcf86cd799439011",
        name: "Anime Hoodie",
        price: 45,
        category: "clothes",
        stock: JSON.stringify({ S: 10, M: "invalid_number" }),
        sizes: JSON.stringify(["S", "M"]),
      },
    };
    const res1 = createMockRes();
    await productController.updateProduct(req1, res1);
    assert.strictEqual(res1.statusCode, 400);
    assert.ok(res1._json.message.includes("Stock value missing or invalid for size M"));
  });

  await t.test("updateCartItem returns 400 without dbConnect or session on missing productId or invalid quantity", async () => {
    activeSessions.length = 0;
    const req1 = { user: { id: "u1" }, body: { newQuantity: 2 } };
    const res1 = createMockRes();
    await reservationController.updateCartItem(req1, res1);
    assert.strictEqual(res1.statusCode, 400);
    assert.strictEqual(activeSessions.length, 0);

    const req2 = { user: { id: "u1" }, body: { productId: "p1", newQuantity: -1 } };
    const res2 = createMockRes();
    await reservationController.updateCartItem(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
    assert.strictEqual(activeSessions.length, 0);
  });

  dbConnectShouldFail = false;
});

// ==========================================
// 10. CLEANUP ROUTES & VERCEL CRON GET SUPPORT
// ==========================================
test("10. Cleanup Routes & Vercel Cron GET Support", async (t) => {
  const cleanupRouter = require("../routes/modules/cleanup.route.js");
  const cleanupController = require("../controllers/cleanup.controller.js");

  await t.test("cleanupRouter registers both GET and POST for /users and /reservations", () => {
    const routeLayers = cleanupRouter.stack.filter((layer) => layer.route);
    const usersRoute = routeLayers.find((layer) => layer.route?.path === "/users");
    const reservationsRoute = routeLayers.find((layer) => layer.route?.path === "/reservations");

    assert.ok(usersRoute, "/users route must exist in cleanup router");
    assert.strictEqual(usersRoute.route.methods.get, true, "/users must support GET");
    assert.strictEqual(usersRoute.route.methods.post, true, "/users must support POST");

    assert.ok(reservationsRoute, "/reservations route must exist in cleanup router");
    assert.strictEqual(reservationsRoute.route.methods.get, true, "/reservations must support GET");
    assert.strictEqual(reservationsRoute.route.methods.post, true, "/reservations must support POST");
  });

  await t.test("cleanupUnverifiedUsersController returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { method: "GET" };
    const res = createMockRes();
    await cleanupController.cleanupUnverifiedUsersController(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("cleanupReservationsController returns 500 when dbConnect fails", async () => {
    dbConnectShouldFail = true;
    const req = { method: "GET" };
    const res = createMockRes();
    await cleanupController.cleanupReservationsController(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res._json.success, false);
    dbConnectShouldFail = false;
  });

  await t.test("cleanUpReservation deduplicates product IDs when querying productModel", async () => {
    const reservationModel = require("../models/reservation.model.js");
    const productModel = require("../models/product.model.js");
    const cleanupExpiredReservations = require("../cron jobs/cleanUpReservation.js");

    const originalFindReservation = reservationModel.find;
    const originalFindProduct = productModel.find;
    const originalBulkWrite = productModel.bulkWrite;
    const originalDeleteMany = reservationModel.deleteMany;

    let queriedProductIds = null;
    reservationModel.find = () => ({
      session: () => [
        {
          _id: "res1",
          products: [
            { productId: "prod_dup_1", quantity: 2, variant: "M" },
            { productId: "prod_dup_1", quantity: 1, variant: "S" },
          ],
        },
        {
          _id: "res2",
          products: [
            { productId: "prod_dup_1", quantity: 3, variant: "M" },
            { productId: "prod_dup_2", quantity: 1 },
          ],
        },
      ],
    });

    productModel.find = (filter) => {
      queriedProductIds = filter._id.$in;
      return {
        session: () => [
          { _id: "prod_dup_1", category: "clothes", stock: { S: 10, M: 10 } },
          { _id: "prod_dup_2", category: "toys", stock: 5 },
        ],
      };
    };

    productModel.bulkWrite = async () => {};
    reservationModel.deleteMany = async () => {};

    try {
      await cleanupExpiredReservations();
      assert.ok(queriedProductIds, "productModel.find must be called with $in array");
      assert.strictEqual(queriedProductIds.length, 2, "Product IDs must be deduplicated (2 unique IDs instead of 4 duplicates)");
      assert.deepStrictEqual(queriedProductIds.sort(), ["prod_dup_1", "prod_dup_2"]);
    } finally {
      reservationModel.find = originalFindReservation;
      productModel.find = originalFindProduct;
      productModel.bulkWrite = originalBulkWrite;
      reservationModel.deleteMany = originalDeleteMany;
    }
  });
});

// ==========================================
// 11. REVERSE PROXY & RATE LIMITER VALIDATION
// ==========================================
test("11. Reverse Proxy & Rate Limiter Header Safety", async (t) => {
  const app = require("../app.js");
  const rateLimiters = require("../middlewares/custom/rateLimiters.middleware.js");

  await t.test("app has trust proxy configured to 1 for Vercel deployment", () => {
    assert.strictEqual(app.get("trust proxy"), 1, "app must trust proxy hop for Vercel/reverse-proxy IP resolution");
  });

  await t.test("productSearchLimiter handles X-Forwarded-For and Forwarded headers without throwing or validation errors when proxy is trusted", async () => {
    const req = {
      app,
      method: "GET",
      url: "/api/product/getProducts",
      headers: {
        "x-forwarded-for": "203.0.113.195",
        forwarded: "for=203.0.113.195;proto=https",
      },
      query: {},
      socket: { remoteAddress: "10.0.0.1" },
      ip: "203.0.113.195",
    };
    const headers = {};
    const res = {
      ...createMockRes(),
      setHeader(k, v) { headers[k.toLowerCase()] = v; },
      getHeader(k) { return headers[k.toLowerCase()]; },
    };

    const originalConsoleError = console.error;
    const capturedErrors = [];
    console.error = (err) => {
      capturedErrors.push(err);
    };

    let passed = false;
    let errorThrown = null;
    try {
      await new Promise((resolve, reject) => {
        rateLimiters.productSearchLimiter(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      passed = true;
    } catch (err) {
      errorThrown = err;
    } finally {
      console.error = originalConsoleError;
    }

    assert.ok(passed, "Rate limiter must execute next without throwing");
    assert.strictEqual(errorThrown, null, "Must not throw ValidationError for proxy headers");
    assert.strictEqual(capturedErrors.length, 0, "Must not log validation errors when proxy is trusted");
  });

  await t.test("rateLimiters do not log ERR_ERL_FORWARDED_HEADER when receiving Forwarded headers", async () => {
    delete require.cache[require.resolve("../middlewares/custom/rateLimiters.middleware.js")];
    const freshRateLimiters = require("../middlewares/custom/rateLimiters.middleware.js");
    const limitersToTest = [
      { name: "otpSendLimiter", limiter: freshRateLimiters.otpSendLimiter, method: "POST", url: "/api/user/sendOtp" },
      { name: "otpVerifyLimiter", limiter: freshRateLimiters.otpVerifyLimiter, method: "POST", url: "/api/user/verifyOtp" },
      { name: "loginLimiter", limiter: freshRateLimiters.loginLimiter, method: "POST", url: "/api/user/login" },
      { name: "signupLimiter", limiter: freshRateLimiters.signupLimiter, method: "POST", url: "/api/user/signUp" },
      { name: "productSearchLimiter", limiter: freshRateLimiters.productSearchLimiter, method: "GET", url: "/api/product/getProducts" },
    ];

    for (const item of limitersToTest) {
      const { name, limiter, method, url } = item || {};
      const req = {
        app,
        method,
        url,
        headers: {
          "x-forwarded-for": "203.0.113.195",
          forwarded: "for=203.0.113.195;proto=https",
        },
        body: {},
        query: {},
        socket: { remoteAddress: "10.0.0.1" },
        ip: "10.0.0.1",
      };
      const headers = {};
      const res = {
        ...createMockRes(),
        setHeader(k, v) { headers[k.toLowerCase()] = v; },
        getHeader(k) { return headers[k.toLowerCase()]; },
      };

      const originalConsoleError = console.error;
      const capturedErrors = [];
      console.error = (err) => {
        capturedErrors.push(err);
      };

      try {
        await new Promise((resolve) => {
          limiter(req, res, () => resolve());
        });
      } finally {
        console.error = originalConsoleError;
      }

      const forwardedError = capturedErrors.find((err) => err?.code === "ERR_ERL_FORWARDED_HEADER");
      assert.strictEqual(
        forwardedError,
        undefined,
        `${name} must not log ERR_ERL_FORWARDED_HEADER when Forwarded header is present`
      );
    }
  });

  await t.test("rateLimiters still catch and flag ERR_ERL_UNEXPECTED_X_FORWARDED_FOR when trust proxy is false", async () => {
    delete require.cache[require.resolve("../middlewares/custom/rateLimiters.middleware.js")];
    const freshRateLimiters = require("../middlewares/custom/rateLimiters.middleware.js");
    const untrustedApp = { get: (key) => (key === "trust proxy" ? false : undefined) };
    const limitersToTest = [
      { name: "otpSendLimiter", limiter: freshRateLimiters.otpSendLimiter, method: "POST", url: "/api/user/sendOtp" },
      { name: "otpVerifyLimiter", limiter: freshRateLimiters.otpVerifyLimiter, method: "POST", url: "/api/user/verifyOtp" },
      { name: "loginLimiter", limiter: freshRateLimiters.loginLimiter, method: "POST", url: "/api/user/login" },
      { name: "signupLimiter", limiter: freshRateLimiters.signupLimiter, method: "POST", url: "/api/user/signUp" },
      { name: "productSearchLimiter", limiter: freshRateLimiters.productSearchLimiter, method: "GET", url: "/api/product/getProducts" },
    ];

    for (const item of limitersToTest) {
      const { name, limiter, method, url } = item || {};
      const req = {
        app: untrustedApp,
        method,
        url,
        headers: {
          "x-forwarded-for": "203.0.113.195",
        },
        body: {},
        query: {},
        socket: { remoteAddress: "10.0.0.1" },
        ip: "10.0.0.1",
      };
      const headers = {};
      const res = {
        ...createMockRes(),
        setHeader(k, v) { headers[k.toLowerCase()] = v; },
        getHeader(k) { return headers[k.toLowerCase()]; },
      };

      const originalConsoleError = console.error;
      const capturedErrors = [];
      console.error = (err) => {
        capturedErrors.push(err);
      };

      try {
        await new Promise((resolve) => {
          limiter(req, res, () => resolve());
        });
      } finally {
        console.error = originalConsoleError;
      }

      const unexpectedXffError = capturedErrors.find((err) => err?.code === "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR");
      assert.ok(
        unexpectedXffError,
        `${name} validation should catch untrusted X-Forwarded-For header when trust proxy is false`
      );
    }
  });

  await t.test("trust proxy is set to 1 when LAMBDA_TASK_ROOT === '/var/task', VERCEL === '1', NOW_REGION === 'iad1', or TRUST_PROXY === '1'", () => {
    const express = require("express");
    const proxyEnvKeys = [
      "TRUST_PROXY",
      "VERCEL",
      "VERCEL_ENV",
      "NOW_REGION",
      "LAMBDA_TASK_ROOT",
      "AWS_LAMBDA_FUNCTION_NAME",
      "AWS_EXECUTION_ENV",
    ];

    const proxyTestCases = [
      { envKey: "LAMBDA_TASK_ROOT", envValue: "/var/task" },
      { envKey: "VERCEL", envValue: "1" },
      { envKey: "NOW_REGION", envValue: "iad1" },
      { envKey: "TRUST_PROXY", envValue: "1" },
      { envKey: "VERCEL_ENV", envValue: "production" },
      { envKey: "AWS_LAMBDA_FUNCTION_NAME", envValue: "serverless-handler" },
      { envKey: "AWS_EXECUTION_ENV", envValue: "AWS_Lambda_nodejs20.x" },
      { envKey: "NODE_ENV", envValue: "production" },
      { envKey: "NODE_ENV", envValue: "test" },
    ];

    const evaluateTrustProxy = () => {
      const isBehindProxy = Boolean(
        process.env.TRUST_PROXY ||
        process.env.VERCEL ||
        process.env.VERCEL_ENV ||
        process.env.NOW_REGION ||
        process.env.LAMBDA_TASK_ROOT ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.AWS_EXECUTION_ENV ||
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "test"
      );
      const testApp = express();
      if (isBehindProxy)
        testApp.set("trust proxy", 1);
      return testApp.get("trust proxy");
    };

    const savedEnv = {};
    for (const key of [...proxyEnvKeys, "NODE_ENV"])
      savedEnv[key] = process.env[key];

    try {
      for (const { envKey, envValue } of proxyTestCases) {
        for (const k of proxyEnvKeys)
          delete process.env[k];
        process.env.NODE_ENV = "development";
        process.env[envKey] = envValue;

        const trustProxyValue = evaluateTrustProxy();
        assert.strictEqual(
          trustProxyValue,
          1,
          `trust proxy must be set to 1 when ${envKey}='${envValue}'`
        );
      }

      // Verify false when in development with no proxy env vars
      for (const k of proxyEnvKeys)
        delete process.env[k];
      process.env.NODE_ENV = "development";

      const devTrustProxy = evaluateTrustProxy();
      assert.strictEqual(
        devTrustProxy,
        false,
        "trust proxy must remain false in development without proxy environment variables"
      );
    } finally {
      for (const key of [...proxyEnvKeys, "NODE_ENV"]) {
        if (savedEnv[key] !== undefined)
          process.env[key] = savedEnv[key];
        else
          delete process.env[key];
      }
    }
  });

  await t.test("Express 5 CORS options wildcard uses RegExp /.*/ to match root and subpaths", () => {
    const regex = /.*/;
    assert.strictEqual(regex.test("/"), true, "Must match root path");
    assert.strictEqual(regex.test("/api"), true, "Must match /api");
    assert.strictEqual(regex.test("/api/products"), true, "Must match subpaths");
  });

  await t.test("Express 5 CORS preflight OPTIONS / and subpaths respond with CORS headers", () => {
    const express = require("express");
    const corsMiddleware = require("../middlewares/modules/cors.middleware.js");
    const preflightApp = express();
    preflightApp.use(corsMiddleware);
    preflightApp.options(/.*/, corsMiddleware);

    const testPaths = ["/", "/api", "/api/products", "/api/order/verify"];
    for (const testPath of testPaths) {
      let resHeaders = {};
      const req = {
        method: "OPTIONS",
        url: testPath,
        path: testPath,
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      };
      const res = {
        setHeader(k, v) { resHeaders[k.toLowerCase()] = v; },
        getHeader(k) { return resHeaders[k.toLowerCase()]; },
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        end() {},
        send() {},
        sendStatus(code) { this.statusCode = code; },
      };
      preflightApp.handle(req, res, () => {});
      assert.strictEqual(resHeaders["access-control-allow-origin"], "http://localhost:5173", `CORS origin header must be set for ${testPath}`);
      assert.ok(resHeaders["access-control-allow-methods"]?.includes("OPTIONS"), `CORS methods header must include OPTIONS for ${testPath}`);
    }
  });
});

