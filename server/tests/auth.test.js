const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { execSync } = require("child_process");

// Set up mock environment variables
process.env.JWT_KEY = "test-secret-key-12345";
process.env.NODE_ENV = "test";

// In-memory user store
const usersDB = [];

// Mock userModel
const mockUserModel = {
  find: (query) => {
    let results = usersDB.slice();
    if (query?.username instanceof RegExp) {
      results = results.filter((u) => query.username.test(u.username));
    }
    if (query?.$or) {
      results = results.filter((u) =>
        query.$or.some((sub) => {
          if (sub.accountStatus && u.accountStatus === sub.accountStatus) {
            if (sub.createdAt?.$lt && u.createdAt < sub.createdAt.$lt) {
              return true;
            }
          }
          if (sub.isDemo && u.isDemo === true) {
            if (sub.createdAt?.$lt && u.createdAt < sub.createdAt.$lt) {
              return true;
            }
          }
          return false;
        }),
      );
    }
    const queryObj = {
      select: () => queryObj,
      sort: () => queryObj,
      skip: () => queryObj,
      limit: () => queryObj,
      session: () => queryObj,
      then: (resolve, reject) => Promise.resolve(results).then(resolve, reject),
      catch: (reject) => Promise.resolve(results).catch(reject),
      [Symbol.iterator]: () => results[Symbol.iterator](),
    };
    return queryObj;
  },
  findOne: async (query) => {
    return (
      usersDB.find((u) => {
        for (const key of Object.keys(query)) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      }) || null
    );
  },
  exists: async (query) => {
    if (query.$or) {
      return usersDB.some((u) =>
        query.$or.some((subQuery) => {
          for (const key of Object.keys(subQuery)) {
            if (u[key] === subQuery[key]) return true;
          }
          return false;
        }),
      );
    }
    return false;
  },
  create: async (data) => {
    if (mockUserModel._createHook) {
      const err = mockUserModel._createHook(data);
      if (err) throw err;
    }
    if (data.email && usersDB.some((u) => u.email === data.email)) {
      const err = new Error("E11000 duplicate key error collection: users index: email_1 dup key");
      err.code = 11000;
      throw err;
    }
    const doc = {
      _id: "user_id_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      save: async function () {
        return this;
      },
    };
    usersDB.push(doc);
    return doc;
  },
  deleteMany: async (query) => {
    let deletedCount = 0;
    const toKeep = [];
    for (const u of usersDB) {
      let shouldDelete = false;
      if (query?.$or) {
        for (const sub of query.$or) {
          if (sub.accountStatus && u.accountStatus === sub.accountStatus) {
            if (sub.createdAt?.$lt && u.createdAt < sub.createdAt.$lt) {
              shouldDelete = true;
              break;
            }
          }
          if (sub.isDemo && u.isDemo === true) {
            if (sub.createdAt?.$lt && u.createdAt < sub.createdAt.$lt) {
              shouldDelete = true;
              break;
            }
          }
        }
      }
      if (query?._id?.$in) {
        const idStrings = query._id.$in.map((id) => String(id));
        if (idStrings.includes(String(u._id))) {
          shouldDelete = true;
        }
      }
      if (shouldDelete) {
        deletedCount++;
      } else {
        toKeep.push(u);
      }
    }
    usersDB.length = 0;
    usersDB.push(...toKeep);
    return { acknowledged: true, deletedCount };
  },
};

// In-memory reservation store
const reservationsDB = [];

// Mock reservationModel
const mockReservationModel = {
  find: (query) => {
    let results = reservationsDB.slice();
    if (query?.userId?.$in) {
      const allowedUserIds = query.userId.$in.map(String);
      results = results.filter((r) => allowedUserIds.includes(String(r.userId)));
    }
    const queryObj = {
      session: () => queryObj,
      then: (resolve, reject) => Promise.resolve(results).then(resolve, reject),
      catch: (reject) => Promise.resolve(results).catch(reject),
      [Symbol.iterator]: () => results[Symbol.iterator](),
    };
    return queryObj;
  },
  deleteMany: async (query) => {
    let deletedCount = 0;
    const toKeep = [];
    for (const r of reservationsDB) {
      let shouldDelete = false;
      if (query?.userId?.$in) {
        const allowedUserIds = query.userId.$in.map(String);
        if (allowedUserIds.includes(String(r.userId))) {
          shouldDelete = true;
        }
      }
      if (shouldDelete) {
        deletedCount++;
      } else {
        toKeep.push(r);
      }
    }
    reservationsDB.length = 0;
    reservationsDB.push(...toKeep);
    return { acknowledged: true, deletedCount };
  },
  create: async (data) => {
    const doc = {
      _id: "res_id_" + Math.random().toString(36).substring(2, 9),
      products: [],
      ...data,
    };
    reservationsDB.push(doc);
    return doc;
  },
};

// In-memory product store
const productsDB = [];

// Mock productModel
const mockProductModel = {
  findById: async (id) => {
    return productsDB.find((p) => String(p._id) === String(id)) || null;
  },
  find: (query = {}) => {
    let results = productsDB.slice();
    if (query?._id?.$in) {
      const ids = query._id.$in.map(String);
      results = results.filter((p) => ids.includes(String(p._id)));
    }
    const queryObj = {
      session: () => queryObj,
      then: (resolve, reject) => Promise.resolve(results).then(resolve, reject),
      catch: (reject) => Promise.resolve(results).catch(reject),
      [Symbol.iterator]: () => results[Symbol.iterator](),
    };
    return queryObj;
  },
  updateOne: async (filter, update) => {
    const product = productsDB.find(
      (p) => String(p._id) === String(filter?._id),
    );
    if (product && update?.$inc) {
      for (const [key, incVal] of Object.entries(update.$inc)) {
        if (key.startsWith("stock.")) {
          const variant = key.split(".")[1];
          product.stock = product.stock || {};
          product.stock[variant] = (product.stock[variant] || 0) + incVal;
        } else if (key === "stock") {
          product.stock = (product.stock || 0) + incVal;
        }
      }
    }
    return { acknowledged: true, modifiedCount: product ? 1 : 0 };
  },
  bulkWrite: async (ops = []) => {
    let modifiedCount = 0;
    for (const op of ops) {
      if (op?.updateOne) {
        const { filter, update } = op.updateOne;
        const res = await mockProductModel.updateOne(filter, update);
        modifiedCount += res.modifiedCount;
      }
    }
    return { acknowledged: true, modifiedCount };
  },
  create: async (data) => {
    const doc = {
      _id: "prod_id_" + Math.random().toString(36).substring(2, 9),
      stock: data?.stock,
      ...data,
    };
    productsDB.push(doc);
    return doc;
  },
};

// Mock bcrypt
const mockBcrypt = {
  hash: async (pass, salt) => `hashed_${pass}`,
  compare: async (plain, hashed) => hashed === `hashed_${plain}`,
};

// Mock jsonwebtoken
const mockJwt = {
  sign: (payload, secret, options = {}) => {
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64");
    let exp;
    if (options.expiresIn === "15m") {
      exp = Date.now() + 15 * 60 * 1000;
    } else if (options.expiresIn === "-1s") {
      exp = Date.now() - 1000; // Expired
    } else {
      exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    }
    const body = Buffer.from(
      JSON.stringify({ ...payload, exp }),
    ).toString("base64");
    const sig = Buffer.from(`${header}.${body}.${secret}`).toString("base64");
    return `${header}.${body}.${sig}`;
  },
  verify: (token, secret) => {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");
    const [header, body, sig] = parts;
    const expectedSig = Buffer.from(
      `${header}.${body}.${secret}`,
    ).toString("base64");
    if (sig !== expectedSig) {
      const err = new Error("Invalid signature");
      err.name = "JsonWebTokenError";
      throw err;
    }
    const payload = JSON.parse(Buffer.from(body, "base64").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) {
      const err = new Error("Token expired");
      err.name = "TokenExpiredError";
      throw err;
    }
    return payload;
  },
};

// Mock mongoose
class MockSchema {
  constructor() {}
  index() {}
}
MockSchema.Types = {
  ObjectId: String,
  Mixed: Object,
};

const mockMongoose = {
  Schema: MockSchema,
  startSession: async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {},
  }),
  model: (name) => {
    if (name === "reservations") return mockReservationModel;
    if (name === "products") return mockProductModel;
    return mockUserModel;
  },
};

// Intercept module requires
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "mongoose") return mockMongoose;
  if (request === "bcrypt") return mockBcrypt;
  if (request === "jsonwebtoken") return mockJwt;
  if (request === "dotenv") return { config: () => {} };
  if (request === "cloudinary") {
    return { v2: { config: () => {}, uploader: { destroy: async () => {} } } };
  }
  if (request === "express") {
    const createRoute = (path) => {
      const routeObj = {
        path,
        methods: {},
        get(fn) {
          routeObj.methods.get = true;
          routeObj.getHandler = fn;
          return routeObj;
        },
        post(fn) {
          routeObj.methods.post = true;
          routeObj.postHandler = fn;
          return routeObj;
        },
        put(fn) {
          routeObj.methods.put = true;
          return routeObj;
        },
        delete(fn) {
          routeObj.methods.delete = true;
          return routeObj;
        },
      };
      return routeObj;
    };

    return {
      Router: () => {
        const routes = [];
        const findOrCreateRoute = (path) => {
          let r = routes.find((entry) => entry.path === path);
          if (!r) {
            r = createRoute(path);
            routes.push(r);
          }
          return r;
        };

        const routerObj = {
          post: (path, ...handlers) => {
            if (typeof path === "string") {
              const r = findOrCreateRoute(path);
              r.methods.post = true;
              r.postHandler = handlers[handlers.length - 1];
            }
            return routerObj;
          },
          get: (path, ...handlers) => {
            if (typeof path === "string") {
              const r = findOrCreateRoute(path);
              r.methods.get = true;
              r.getHandler = handlers[handlers.length - 1];
            }
            return routerObj;
          },
          use: (...args) => routerObj,
          put: (path, ...handlers) => {
            if (typeof path === "string") {
              const r = findOrCreateRoute(path);
              r.methods.put = true;
              r.putHandler = handlers[handlers.length - 1];
            }
            return routerObj;
          },
          delete: (path, ...handlers) => {
            if (typeof path === "string") {
              const r = findOrCreateRoute(path);
              r.methods.delete = true;
              r.deleteHandler = handlers[handlers.length - 1];
            }
            return routerObj;
          },
          patch: (path, ...handlers) => {
            if (typeof path === "string") {
              const r = findOrCreateRoute(path);
              r.methods.patch = true;
              r.patchHandler = handlers[handlers.length - 1];
            }
            return routerObj;
          },
          route: (path) => findOrCreateRoute(path),
          _routes: routes,
        };
        return routerObj;
      },
    };
  }
  if (request === "express-rate-limit") return () => (req, res, next) => next();
  if (
    request === "../models/user.model.js" ||
    request === "../../models/user.model.js"
  ) {
    return mockUserModel;
  }
  if (
    request === "../models/reservation.model.js" ||
    request === "../../models/reservation.model.js"
  ) {
    return mockReservationModel;
  }
  if (
    request === "../models/product.model.js" ||
    request === "../../models/product.model.js"
  ) {
    return mockProductModel;
  }
  if (request === "../config/dbConnect.js") return async () => {};
  if (request === "../../config/dbConnect.js") return async () => {};
  if (request === "../utils/sendOTP.js") return async () => {};
  if (request === "../utils/otpGenerator.js") {
    return () => ({
      otp: "123456",
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });
  }
  if (request === "../utils/tempPasswordHash.js") return async () => "temp_hash";
  if (request.includes("multerConfig")) return { single: () => () => {} };
  if (request.includes("rateLimiters.middleware")) {
    const pass = (req, res, next) => next && next();
    return {
      otpSendLimiter: pass,
      otpVerifyLimiter: pass,
      loginLimiter: pass,
      signupLimiter: pass,
      productSearchLimiter: pass,
    };
  }

  return originalLoad.apply(this, arguments);
};

const authService = require("../services/auth.js");
const cleanUpUsers = require("../cron jobs/cleanUpUsers.js");
const userController = require("../controllers/user.controller.js");
const cleanupRoutes = require("../routes/modules/cleanup.route.js");
const cleanupController = require("../controllers/cleanup.controller.js");

function createMockRes() {
  const res = {
    statusCode: 200,
    cookies: {},
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    cookie(name, val, options) {
      this.cookies[name] = { val, options };
      return this;
    },
  };
  return res;
}

test("OTP Verification & Strict SignUp Security", async (t) => {
  usersDB.length = 0;

  await t.test(
    "sendSignupOtp creates unverified user with isOtpVerified=false",
    async () => {
      const req = { body: { email: "alice@example.com" } };
      const res = createMockRes();
      await authService.sendSignupOtp(req, res);

      assert.strictEqual(res.statusCode, 200);
      const user = await mockUserModel.findOne({ email: "alice@example.com" });
      assert.ok(user);
      assert.strictEqual(user.accountStatus, "verifying");
      assert.strictEqual(user.isOtpVerified, false);
      assert.strictEqual(user.otp, "123456");
    },
  );

  await t.test(
    "signUp FAILS if OTP was not verified (Vulnerability prevention)",
    async () => {
      const req = {
        body: {
          email: "alice@example.com",
          username: "alice",
          password: "password123",
        },
      };
      const res = createMockRes();
      await authService.signUp(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.jsonData.message, /verification token/i);

      const user = await mockUserModel.findOne({ email: "alice@example.com" });
      assert.strictEqual(user.accountStatus, "verifying");
    },
  );

  await t.test(
    "signUp FAILS with missing required parameters",
    async () => {
      const req = { body: { email: "alice@example.com" } };
      const res = createMockRes();
      await authService.signUp(req, res);
      assert.strictEqual(res.statusCode, 400);
    },
  );

  await t.test("signUp FAILS with fake verification token", async () => {
    const fakeToken = mockJwt.sign(
      { email: "bob@example.com", purpose: "otp_verification" },
      process.env.JWT_KEY,
    );
    const req = {
      body: {
        email: "alice@example.com",
        username: "alice",
        password: "password123",
        verificationToken: fakeToken,
      },
    };
    const res = createMockRes();
    await authService.signUp(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /invalid verification token/i);
  });

  await t.test("signUp FAILS with expired verification token", async () => {
    const expiredToken = mockJwt.sign(
      { email: "alice@example.com", purpose: "otp_verification" },
      process.env.JWT_KEY,
      { expiresIn: "-1s" },
    );
    const req = {
      body: {
        email: "alice@example.com",
        username: "alice",
        password: "password123",
        verificationToken: expiredToken,
      },
    };
    const res = createMockRes();
    await authService.signUp(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /expired or invalid/i);
  });

  await t.test("verifyOTP FAILS with missing email or otp", async () => {
    let res = createMockRes();
    await authService.verifyOTP({ body: { email: "alice@example.com" } }, res);
    assert.strictEqual(res.statusCode, 400);

    res = createMockRes();
    await authService.verifyOTP({ body: { otp: "123456" } }, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("verifyOTP FAILS with incorrect OTP", async () => {
    const req = { body: { email: "alice@example.com", otp: "999999" } };
    const res = createMockRes();
    await authService.verifyOTP(req, res);

    assert.strictEqual(res.statusCode, 400);
    const user = await mockUserModel.findOne({ email: "alice@example.com" });
    assert.strictEqual(user.isOtpVerified, false);
  });

  await t.test("verifyOTP FAILS with expired OTP", async () => {
    const user = await mockUserModel.findOne({ email: "alice@example.com" });
    user.otpExpiry = new Date(Date.now() - 1000); // Set expired

    const req = { body: { email: "alice@example.com", otp: "123456" } };
    const res = createMockRes();
    await authService.verifyOTP(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(user.isOtpVerified, false);

    // Reset expiry for subsequent tests
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  });

  let validVerificationToken = null;
  await t.test(
    "verifyOTP SUCCEEDS with correct OTP and issues verificationToken",
    async () => {
      const req = { body: { email: "alice@example.com", otp: "123456" } };
      const res = createMockRes();
      await authService.verifyOTP(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.jsonData.verificationToken);
      validVerificationToken = res.jsonData.verificationToken;

      const user = await mockUserModel.findOne({ email: "alice@example.com" });
      assert.strictEqual(user.isOtpVerified, true);
    },
  );

  await t.test(
    "signUp SUCCEEDS when OTP was verified and valid token provided",
    async () => {
      const req = {
        body: {
          email: "alice@example.com",
          username: "alice_wonder",
          password: "supersecretpassword",
          verificationToken: validVerificationToken,
        },
      };
      const res = createMockRes();
      await authService.signUp(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.jsonData.success, true);
      assert.strictEqual(res.jsonData.user.username, "alice_wonder");
      assert.ok(res.jsonData.token);
      assert.ok(res.cookies.token);

      const user = await mockUserModel.findOne({ email: "alice@example.com" });
      assert.strictEqual(user.accountStatus, "active");
      assert.strictEqual(user.isOtpVerified, false);
      assert.strictEqual(user.otp, undefined);
      assert.strictEqual(user.password, "hashed_supersecretpassword");
    },
  );

  await t.test("signUp cannot be reused after account is active", async () => {
    const req = {
      body: {
        email: "alice@example.com",
        username: "alice_wonder_2",
        password: "newpassword",
        verificationToken: validVerificationToken,
      },
    };
    const res = createMockRes();
    await authService.signUp(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /no pending verification/i);
  });

  await t.test(
    "sendSignupOtp resets isOtpVerified to false on subsequent calls even if unexpired",
    async () => {
      // Re-create user in verifying status with isOtpVerified = true
      usersDB.length = 0;
      await mockUserModel.create({
        email: "charlie@example.com",
        accountStatus: "verifying",
        isOtpVerified: true,
        otp: "654321",
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      const req = { body: { email: "charlie@example.com" } };
      const res = createMockRes();
      await authService.sendSignupOtp(req, res);

      assert.strictEqual(res.statusCode, 200);
      const user = await mockUserModel.findOne({ email: "charlie@example.com" });
      assert.strictEqual(user.isOtpVerified, false, "isOtpVerified must be reset to false");
    },
  );

  await t.test("verifyToken preserves isDemo flag in response", async () => {
    // 1. Regular user token
    const normalToken = mockJwt.sign(
      { userid: "user_normal", email: "norm@test.com", username: "norm", role: "user", isDemo: false },
      process.env.JWT_KEY,
    );
    let req = { headers: { authorization: `Bearer ${normalToken}` }, cookies: {} };
    let res = createMockRes();
    await authService.verifyToken(req, res);
    assert.strictEqual(res.jsonData.user.isDemo, false);

    // 2. Demo user token
    const demoToken = mockJwt.sign(
      { userid: "user_demo", email: "demo@test.com", username: "demoUser1", role: "user", isDemo: true },
      process.env.JWT_KEY,
    );
    req = { headers: { authorization: `Bearer ${demoToken}` }, cookies: {} };
    res = createMockRes();
    await authService.verifyToken(req, res);
    assert.strictEqual(res.jsonData.user.isDemo, true);
  });
});

test("Demo Account Feature & Edge Cases", async (t) => {
  usersDB.length = 0;

  await t.test(
    "demoLogin creates demoUser1 when no demo users exist",
    async () => {
      const req = { body: { role: "user" } };
      const res = createMockRes();
      await authService.demoLogin(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.jsonData.success, true);
      assert.strictEqual(res.jsonData.user.username, "demoUser1");
      assert.strictEqual(res.jsonData.user.role, "user");
      assert.strictEqual(res.jsonData.user.email, "demouser1@demo.com");
      assert.strictEqual(res.jsonData.user.isDemo, true);
      assert.ok(res.jsonData.token);
      assert.ok(res.cookies.token);

      const userInDb = await mockUserModel.findOne({ username: "demoUser1" });
      assert.ok(userInDb);
      assert.strictEqual(userInDb.accountStatus, "active");
      assert.strictEqual(userInDb.isDemo, true);
    },
  );

  await t.test(
    "demoLogin creates demoUser2 on subsequent user request",
    async () => {
      const req = { body: { role: "user" } };
      const res = createMockRes();
      await authService.demoLogin(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.jsonData.user.username, "demoUser2");
      assert.strictEqual(res.jsonData.user.email, "demouser2@demo.com");
      assert.strictEqual(res.jsonData.user.role, "user");
      assert.strictEqual(res.jsonData.user.isDemo, true);
    },
  );

  await t.test(
    "demoLogin correctly increments past gaps (e.g. demoUser10 exists -> demoUser11)",
    async () => {
      await mockUserModel.create({
        username: "demoUser10",
        email: "demouser10@demo.com",
        role: "user",
        accountStatus: "active",
        isDemo: true,
      });

      const req = { body: { role: "user" } };
      const res = createMockRes();
      await authService.demoLogin(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.jsonData.user.username, "demoUser11");
    },
  );

  await t.test("demoLogin creates demoAdmin1 with role admin", async () => {
    const req = { body: { role: "admin" } };
    const res = createMockRes();
    await authService.demoLogin(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.jsonData.user.username, "demoAdmin1");
    assert.strictEqual(res.jsonData.user.email, "demoadmin1@demo.com");
    assert.strictEqual(res.jsonData.user.role, "admin");
    assert.strictEqual(res.jsonData.user.isDemo, true);

    const decoded = mockJwt.verify(res.jsonData.token, process.env.JWT_KEY);
    assert.strictEqual(decoded.role, "admin");
    assert.strictEqual(decoded.username, "demoAdmin1");
  });

  await t.test(
    "demoLogin creates demoAdmin2 on second admin request",
    async () => {
      const req = { body: { role: "admin" } };
      const res = createMockRes();
      await authService.demoLogin(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.jsonData.user.username, "demoAdmin2");
      assert.strictEqual(res.jsonData.user.role, "admin");
    },
  );

  await t.test(
    "demoLogin defaults to user role when role is omitted or invalid",
    async () => {
      const req = { body: {} };
      const res = createMockRes();
      await authService.demoLogin(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.jsonData.user.role, "user");
      assert.match(res.jsonData.user.username, /^demoUser\d+$/);
    },
  );

  await t.test("demoLogin handles role in query parameters", async () => {
    const req = { body: {}, query: { role: "admin" } };
    const res = createMockRes();
    await authService.demoLogin(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.jsonData.user.role, "admin");
    assert.match(res.jsonData.user.username, /^demoAdmin\d+$/);
  });

  await t.test("demoLogin handles existing un-numbered demoUser", async () => {
    await mockUserModel.create({
      username: "demoUser",
      email: "demouser@demo.com",
      role: "user",
      accountStatus: "active",
      isDemo: true,
    });

    const req = { body: { role: "user" } };
    const res = createMockRes();
    await authService.demoLogin(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.jsonData.user.username !== "demoUser");
    assert.match(res.jsonData.user.username, /^demoUser\d+$/);
  });

  await t.test(
    "demoLogin recovers and retries when encountering duplicate key collision (code 11000)",
    async () => {
      let collidedOnce = false;
      mockUserModel._createHook = (data) => {
        if (!collidedOnce) {
          collidedOnce = true;
          const err = new Error("E11000 duplicate key error collection");
          err.code = 11000;
          return err;
        }
        return null;
      };

      const req = { body: { role: "user" } };
      const res = createMockRes();
      await authService.demoLogin(req, res);

      mockUserModel._createHook = null;
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(
        collidedOnce,
        true,
        "Collision hook should have fired and been recovered from",
      );
      assert.ok(res.jsonData.user.username);
    },
  );

  await t.test(
    "concurrent demoLogin requests generate unique accounts without collision",
    async () => {
      const res1 = createMockRes();
      const res2 = createMockRes();
      await Promise.all([
        authService.demoLogin({ body: { role: "user" } }, res1),
        authService.demoLogin({ body: { role: "user" } }, res2),
      ]);

      assert.strictEqual(res1.statusCode, 201);
      assert.strictEqual(res2.statusCode, 201);
      assert.notStrictEqual(
        res1.jsonData.user.username,
        res2.jsonData.user.username,
        "Concurrent requests must receive different usernames",
      );
      assert.notStrictEqual(
        res1.jsonData.user.email,
        res2.jsonData.user.email,
        "Concurrent requests must receive different emails",
      );
    },
  );
});

test("Automatic Cleanup of Demo Accounts and Unverified Users", async (t) => {
  usersDB.length = 0;

  const now = Date.now();
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);

  // 1. Old demo account (> 7 days) -> should be deleted
  await mockUserModel.create({
    username: "demoOld1",
    email: "demoold1@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: eightDaysAgo,
  });

  // 2. Fresh demo account (< 7 days) -> should NOT be deleted
  await mockUserModel.create({
    username: "demoFresh1",
    email: "demofresh1@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: twoDaysAgo,
  });

  // 3. Old unverified user (> 7 days) -> should be deleted
  await mockUserModel.create({
    username: "unverifiedOld",
    email: "unverifiedold@example.com",
    role: "user",
    accountStatus: "verifying",
    isDemo: false,
    createdAt: eightDaysAgo,
  });

  // 4. Normal active user (> 7 days) -> should NOT be deleted
  await mockUserModel.create({
    username: "realUser",
    email: "real@example.com",
    role: "user",
    accountStatus: "active",
    isDemo: false,
    createdAt: eightDaysAgo,
  });

  assert.strictEqual(usersDB.length, 4);

  const cleanupResult = await cleanUpUsers();
  assert.strictEqual(cleanupResult.deletedCount, 2);

  assert.strictEqual(usersDB.length, 2);
  const remainingUsernames = usersDB.map((u) => u.username);
  assert.ok(
    remainingUsernames.includes("demoFresh1"),
    "Fresh demo account preserved",
  );
  assert.ok(
    remainingUsernames.includes("realUser"),
    "Regular active user preserved",
  );
  assert.ok(
    !remainingUsernames.includes("demoOld1"),
    "Expired demo account was deleted",
  );
  assert.ok(
    !remainingUsernames.includes("unverifiedOld"),
    "Expired unverified user was deleted",
  );
});

test("cleanupUnverifiedUsers properly restores stock for demo users and unverified users with reservations", async (t) => {
  usersDB.length = 0;
  reservationsDB.length = 0;
  productsDB.length = 0;

  const now = Date.now();
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);

  // Setup products in productsDB
  const comicProduct = await mockProductModel.create({
    name: "One Piece Vol 1",
    category: "comics",
    stock: { vol1: 10, vol2: 5 },
  });
  const clothesProduct = await mockProductModel.create({
    name: "Anime Hoodie",
    category: "clothes",
    stock: { M: 4, L: 8 },
  });
  const shoesProduct = await mockProductModel.create({
    name: "Anime Sneakers",
    category: "shoes",
    stock: { "42": 3, "43": 6 },
  });
  const toyProduct = await mockProductModel.create({
    name: "Luffy Figurine",
    category: "toys",
    stock: 15,
  });

  // Setup users in usersDB
  // 1. Expired demo user (> 7 days)
  const expiredDemo = await mockUserModel.create({
    username: "expiredDemoWithRes",
    email: "expireddemo_res@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: eightDaysAgo,
  });

  // 2. Expired unverified user (> 7 days)
  const expiredUnverified = await mockUserModel.create({
    username: "expiredUnverifiedWithRes",
    email: "expiredunverified_res@example.com",
    role: "user",
    accountStatus: "verifying",
    isDemo: false,
    createdAt: eightDaysAgo,
  });

  // 3. Fresh demo user (< 7 days)
  const freshDemo = await mockUserModel.create({
    username: "freshDemoWithRes",
    email: "freshdemo_res@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: twoDaysAgo,
  });

  // 4. Regular active user (> 7 days)
  const activeUser = await mockUserModel.create({
    username: "activeUserWithRes",
    email: "active_res@example.com",
    role: "user",
    accountStatus: "active",
    isDemo: false,
    createdAt: eightDaysAgo,
  });

  // Setup reservations in reservationsDB
  // Reservation for expired demo user
  await mockReservationModel.create({
    userId: expiredDemo._id,
    products: [
      { productId: comicProduct._id, variant: "vol1", quantity: 2 },
      { productId: clothesProduct._id, variant: "M", quantity: 3 },
      { productId: shoesProduct._id, variant: "42", quantity: 1 },
      { productId: toyProduct._id, quantity: 4 },
    ],
  });

  // Reservation for expired unverified user
  await mockReservationModel.create({
    userId: expiredUnverified._id,
    products: [
      { productId: comicProduct._id, variant: "vol2", quantity: 1 },
      { productId: toyProduct._id, quantity: 2 },
    ],
  });

  // Reservation for active user (must NOT be touched)
  await mockReservationModel.create({
    userId: activeUser._id,
    products: [
      { productId: toyProduct._id, quantity: 5 },
    ],
  });

  assert.strictEqual(usersDB.length, 4);
  assert.strictEqual(reservationsDB.length, 3);

  // Run cleanup
  const cleanupResult = await cleanUpUsers();

  // Verify return value
  assert.strictEqual(cleanupResult.deletedCount, 2);
  assert.strictEqual(cleanupResult.restoredReservationsCount, 2);

  // Verify stock restoration
  assert.strictEqual(comicProduct.stock.vol1, 12, "Comic vol1 stock restored (+2)");
  assert.strictEqual(comicProduct.stock.vol2, 6, "Comic vol2 stock restored (+1)");
  assert.strictEqual(clothesProduct.stock.M, 7, "Clothes M stock restored (+3)");
  assert.strictEqual(clothesProduct.stock.L, 8, "Clothes L stock unaffected");
  assert.strictEqual(shoesProduct.stock["42"], 4, "Shoes 42 stock restored (+1)");
  assert.strictEqual(toyProduct.stock, 21, "Toys stock restored (+4 + 2)");

  // Verify user deletion
  assert.strictEqual(usersDB.length, 2);
  const remainingUsernames = usersDB.map((u) => u.username);
  assert.ok(remainingUsernames.includes("freshDemoWithRes"), "Fresh demo account preserved");
  assert.ok(remainingUsernames.includes("activeUserWithRes"), "Active account preserved");
  assert.ok(!remainingUsernames.includes("expiredDemoWithRes"), "Expired demo user deleted");
  assert.ok(!remainingUsernames.includes("expiredUnverifiedWithRes"), "Expired unverified user deleted");

  // Verify reservation deletion
  assert.strictEqual(reservationsDB.length, 1);
  assert.strictEqual(String(reservationsDB[0].userId), String(activeUser._id), "Active user reservation preserved");

  // Edge case: running cleanup again with no expired users
  const secondRunResult = await cleanUpUsers();
  assert.strictEqual(secondRunResult.deletedCount, 0);
  assert.strictEqual(secondRunResult.restoredReservationsCount, 0);
});

test("Cleanup routes support GET and POST methods for /users and /reservations", async (t) => {
  assert.ok(cleanupRoutes._routes, "cleanupRoutes must define routes");

  const usersRoute = cleanupRoutes._routes.find((r) => r.path === "/users");
  assert.ok(usersRoute, "/users route must be registered");
  assert.strictEqual(usersRoute.methods.get, true, "/users must support GET method");
  assert.strictEqual(usersRoute.methods.post, true, "/users must support POST method");

  const reservationsRoute = cleanupRoutes._routes.find((r) => r.path === "/reservations");
  assert.ok(reservationsRoute, "/reservations route must be registered");
  assert.strictEqual(reservationsRoute.methods.get, true, "/reservations must support GET method");
  assert.strictEqual(reservationsRoute.methods.post, true, "/reservations must support POST method");
});

test("Express Router mock records direct method calls (get, post, put, delete, patch) into _routes", async () => {
  const express = require("express");
  const testRouter = express.Router();

  const mockHandler1 = () => {};
  const mockHandler2 = () => {};
  const mockMiddleware = () => {};

  testRouter.get("/direct-get", mockHandler1);
  testRouter.post("/direct-post", mockHandler2);
  testRouter.put("/direct-multi", mockMiddleware, mockHandler1);
  testRouter.delete("/direct-multi", mockHandler2);
  testRouter.patch("/direct-patch", mockHandler1);

  assert.ok(Array.isArray(testRouter._routes), "_routes must be an array");

  const getRoute = testRouter._routes.find((r) => r.path === "/direct-get");
  assert.ok(getRoute, "/direct-get must be recorded in _routes");
  assert.strictEqual(getRoute.methods.get, true);
  assert.strictEqual(getRoute.getHandler, mockHandler1);

  const postRoute = testRouter._routes.find((r) => r.path === "/direct-post");
  assert.ok(postRoute, "/direct-post must be recorded in _routes");
  assert.strictEqual(postRoute.methods.post, true);
  assert.strictEqual(postRoute.postHandler, mockHandler2);

  const multiRoute = testRouter._routes.find((r) => r.path === "/direct-multi");
  assert.ok(multiRoute, "/direct-multi must be recorded in _routes");
  assert.strictEqual(multiRoute.methods.put, true);
  assert.strictEqual(multiRoute.methods.delete, true);
  assert.strictEqual(multiRoute.putHandler, mockHandler1);
  assert.strictEqual(multiRoute.deleteHandler, mockHandler2);

  const patchRoute = testRouter._routes.find((r) => r.path === "/direct-patch");
  assert.ok(patchRoute, "/direct-patch must be recorded in _routes");
  assert.strictEqual(patchRoute.methods.patch, true);
  assert.strictEqual(patchRoute.patchHandler, mockHandler1);
});

test("cleanupUnverifiedUsers handles edge cases: deleted products, missing variants, case-insensitive categories, and users without reservations", async (t) => {
  usersDB.length = 0;
  reservationsDB.length = 0;
  productsDB.length = 0;

  const now = Date.now();
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

  // 1. Product with mixed-case category
  const mixedCaseProduct = await mockProductModel.create({
    name: "Naruto Manga",
    category: "Comics",
    stock: { ch1: 5 },
  });

  // 2. Toy product with uppercase category
  const upperToyProduct = await mockProductModel.create({
    name: "Zoro Figure",
    category: "TOYS",
    stock: 10,
  });

  // 3. Expired demo user with reservation
  const expiredDemo = await mockUserModel.create({
    username: "edgeDemoUser",
    email: "edgedemo@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: eightDaysAgo,
  });

  // 4. Expired unverified user WITHOUT reservation
  const expiredNoRes = await mockUserModel.create({
    username: "edgeNoResUser",
    email: "edgenores@example.com",
    role: "user",
    accountStatus: "verifying",
    isDemo: false,
    createdAt: eightDaysAgo,
  });

  // Setup reservation for expiredDemo with edge case items:
  // - nonExistentProduct: productId not in DB
  // - invalidQuantity: quantity is 0 or negative or non-number
  // - missingVariant: comic item without variant
  // - valid items with mixed case categories
  await mockReservationModel.create({
    userId: expiredDemo._id,
    products: [
      { productId: "non_existent_prod_123", variant: "default", quantity: 5 },
      { productId: mixedCaseProduct._id, variant: undefined, quantity: 2 },
      { productId: mixedCaseProduct._id, variant: "ch1", quantity: 0 },
      { productId: mixedCaseProduct._id, variant: "ch1", quantity: 3 },
      { productId: upperToyProduct._id, quantity: 4 },
    ],
  });

  assert.strictEqual(usersDB.length, 2);
  assert.strictEqual(reservationsDB.length, 1);

  const result = await cleanUpUsers();

  // Both users deleted, 1 reservation restored
  assert.strictEqual(result.deletedCount, 2);
  assert.strictEqual(result.restoredReservationsCount, 1);
  assert.strictEqual(usersDB.length, 0);
  assert.strictEqual(reservationsDB.length, 0);

  // Stock verified
  assert.strictEqual(mixedCaseProduct.stock.ch1, 8, "Mixed case category comic stock incremented by valid quantity (+3)");
  assert.strictEqual(upperToyProduct.stock, 14, "Upper case category toy stock incremented (+4)");
  assert.strictEqual(mixedCaseProduct.stock.undefined, undefined, "Undefined variant must not corrupt stock object");
});

test("cleanupUnverifiedUsersController supports GET and POST invocations returning success and counts", async (t) => {
  usersDB.length = 0;
  reservationsDB.length = 0;
  productsDB.length = 0;

  const now = Date.now();
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

  // Setup 1 expired demo user with a toy reservation
  const toy = await mockProductModel.create({
    name: "Goku Figure",
    category: "toys",
    stock: 20,
  });

  const demoUser = await mockUserModel.create({
    username: "controllerDemoUser",
    email: "controllerdemo@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: eightDaysAgo,
  });

  await mockReservationModel.create({
    userId: demoUser._id,
    products: [{ productId: toy._id, quantity: 5 }],
  });

  // Test GET request
  const getReq = { method: "GET" };
  const getRes = createMockRes();
  await cleanupController.cleanupUnverifiedUsersController(getReq, getRes);

  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.jsonData.success, true);
  assert.strictEqual(getRes.jsonData.deletedCount, 1);
  assert.strictEqual(getRes.jsonData.restoredReservationsCount, 1);
  assert.strictEqual(toy.stock, 25, "Toy stock restored from 20 to 25");

  // Setup another expired user for POST request
  const demoUserPost = await mockUserModel.create({
    username: "controllerDemoUserPost",
    email: "controllerdemopost@demo.com",
    role: "user",
    accountStatus: "verifying",
    isDemo: false,
    createdAt: eightDaysAgo,
  });

  await mockReservationModel.create({
    userId: demoUserPost._id,
    products: [{ productId: toy._id, quantity: 3 }],
  });

  // Test POST request
  const postReq = { method: "POST" };
  const postRes = createMockRes();
  await cleanupController.cleanupUnverifiedUsersController(postReq, postRes);

  assert.strictEqual(postRes.statusCode, 200);
  assert.strictEqual(postRes.jsonData.success, true);
  assert.strictEqual(postRes.jsonData.deletedCount, 1);
  assert.strictEqual(postRes.jsonData.restoredReservationsCount, 1);
  assert.strictEqual(toy.stock, 28, "Toy stock restored from 25 to 28");
});

test("cleanupUnverifiedUsers batches stock restoration across multiple reservations for same product and variant using bulkWrite", async (t) => {
  usersDB.length = 0;
  reservationsDB.length = 0;
  productsDB.length = 0;

  const now = Date.now();
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);

  // Setup products
  const comic = await mockProductModel.create({
    name: "Bleach",
    category: "comics",
    stock: { vol1: 10, vol2: 5 },
  });
  const clothes = await mockProductModel.create({
    name: "Anime Hoodie",
    category: "clothes",
    stock: { S: 2, M: 4 },
  });
  const toy = await mockProductModel.create({
    name: "Ichigo Figure",
    category: "toys",
    stock: 10,
  });

  // Setup 3 expired demo users
  const user1 = await mockUserModel.create({
    username: "batchDemo1",
    email: "batch1@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: eightDaysAgo,
  });
  const user2 = await mockUserModel.create({
    username: "batchDemo2",
    email: "batch2@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: eightDaysAgo,
  });
  const user3 = await mockUserModel.create({
    username: "batchDemo3",
    email: "batch3@demo.com",
    role: "user",
    accountStatus: "active",
    isDemo: true,
    createdAt: eightDaysAgo,
  });

  // User 1 reservation
  await mockReservationModel.create({
    userId: user1._id,
    products: [
      { productId: comic._id, variant: "vol1", quantity: 3 },
      { productId: clothes._id, variant: "M", quantity: 2 },
      { productId: toy._id, quantity: 4 },
    ],
  });

  // User 2 reservation (overlaps with user 1 products and variants)
  await mockReservationModel.create({
    userId: user2._id,
    products: [
      { productId: comic._id, variant: "vol1", quantity: 5 },
      { productId: comic._id, variant: "vol2", quantity: 2 },
      { productId: clothes._id, variant: "M", quantity: 3 },
      { productId: toy._id, quantity: 6 },
    ],
  });

  // User 3 reservation (overlaps with comic vol1 and clothes)
  await mockReservationModel.create({
    userId: user3._id,
    products: [
      { productId: comic._id, variant: "vol1", quantity: 2 },
      { productId: clothes._id, variant: "S", quantity: 1 },
      { productId: clothes._id, variant: "M", quantity: 1 },
    ],
  });

  // Spy on bulkWrite to verify batching
  let bulkWriteCalls = 0;
  let capturedOps = null;
  const originalBulkWrite = mockProductModel.bulkWrite;
  mockProductModel.bulkWrite = async (ops) => {
    bulkWriteCalls++;
    capturedOps = ops;
    return originalBulkWrite(ops);
  };

  try {
    const result = await cleanUpUsers();

    // Verify cleanup counts
    assert.strictEqual(result.deletedCount, 3);
    assert.strictEqual(result.restoredReservationsCount, 3);

    // Verify bulkWrite was called exactly ONCE (batched, eliminating N+1)
    assert.strictEqual(bulkWriteCalls, 1, "bulkWrite must be called exactly once");
    assert.strictEqual(capturedOps.length, 3, "bulkOps must contain 1 operation per unique product");

    // Verify aggregated increments per product
    const comicOp = capturedOps.find((op) => String(op.updateOne.filter._id) === String(comic._id));
    assert.ok(comicOp, "Comic update op must exist");
    assert.strictEqual(comicOp.updateOne.update.$inc["stock.vol1"], 10, "vol1 aggregated increment (3 + 5 + 2 = 10)");
    assert.strictEqual(comicOp.updateOne.update.$inc["stock.vol2"], 2, "vol2 aggregated increment (2)");

    const clothesOp = capturedOps.find((op) => String(op.updateOne.filter._id) === String(clothes._id));
    assert.ok(clothesOp, "Clothes update op must exist");
    assert.strictEqual(clothesOp.updateOne.update.$inc["stock.M"], 6, "Clothes M aggregated increment (2 + 3 + 1 = 6)");
    assert.strictEqual(clothesOp.updateOne.update.$inc["stock.S"], 1, "Clothes S aggregated increment (1)");

    const toyOp = capturedOps.find((op) => String(op.updateOne.filter._id) === String(toy._id));
    assert.ok(toyOp, "Toy update op must exist");
    assert.strictEqual(toyOp.updateOne.update.$inc["stock"], 10, "Toy aggregated increment (4 + 6 = 10)");

    // Verify final stock values in memory
    assert.strictEqual(comic.stock.vol1, 20, "Comic vol1 stock restored (10 + 10 = 20)");
    assert.strictEqual(comic.stock.vol2, 7, "Comic vol2 stock restored (5 + 2 = 7)");
    assert.strictEqual(clothes.stock.S, 3, "Clothes S stock restored (2 + 1 = 3)");
    assert.strictEqual(clothes.stock.M, 10, "Clothes M stock restored (4 + 6 = 10)");
    assert.strictEqual(toy.stock, 20, "Toy stock restored (10 + 10 = 20)");

    // Verify DB states
    assert.strictEqual(usersDB.length, 0);
    assert.strictEqual(reservationsDB.length, 0);
  } finally {
    mockProductModel.bulkWrite = originalBulkWrite;
  }
});

test("cleanupUnverifiedUsers executes within a MongoDB session/transaction, committing on success and aborting on failure", async (t) => {
  usersDB.length = 0;
  reservationsDB.length = 0;
  productsDB.length = 0;

  let sessionEvents = [];
  const originalStartSession = mockMongoose.startSession;

  mockMongoose.startSession = async () => {
    sessionEvents.push("startSession");
    return {
      startTransaction: () => sessionEvents.push("startTransaction"),
      commitTransaction: async () => sessionEvents.push("commitTransaction"),
      abortTransaction: async () => sessionEvents.push("abortTransaction"),
      endSession: () => sessionEvents.push("endSession"),
    };
  };

  try {
    // 1. Successful run with empty database -> should start, commit, end session
    sessionEvents = [];
    const result = await cleanUpUsers();
    assert.strictEqual(result.deletedCount, 0);
    assert.deepStrictEqual(sessionEvents, [
      "startSession",
      "startTransaction",
      "commitTransaction",
      "endSession",
    ]);

    // 2. Failure during execution -> should start, abort, end session
    const now = Date.now();
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
    await mockUserModel.create({
      username: "failDemo",
      email: "faildemo@demo.com",
      role: "user",
      accountStatus: "active",
      isDemo: true,
      createdAt: eightDaysAgo,
    });

    const originalDeleteMany = mockUserModel.deleteMany;
    mockUserModel.deleteMany = async () => {
      throw new Error("Simulated DB delete failure during transaction");
    };

    sessionEvents = [];
    await assert.rejects(
      async () => {
        await cleanUpUsers();
      },
      /Simulated DB delete failure during transaction/,
      "Must rethrow the underlying error",
    );

    assert.deepStrictEqual(sessionEvents, [
      "startSession",
      "startTransaction",
      "abortTransaction",
      "endSession",
    ]);

    mockUserModel.deleteMany = originalDeleteMany;
  } finally {
    mockMongoose.startSession = originalStartSession;
  }
});

test("Complete Removal of Recruiter Bypass", async (t) => {
  // 1. user.controller.js must not export recruiterBypass
  assert.strictEqual(
    userController.recruiterBypass,
    undefined,
    "user.controller must not export recruiterBypass",
  );

  // 2. RecruiterByPass.jsx file must not exist
  const recruiterComponentExists = fs.existsSync(
    path.join(__dirname, "../../client/src/pages/RecruiterByPass.jsx"),
  );
  assert.strictEqual(
    recruiterComponentExists,
    false,
    "client/src/pages/RecruiterByPass.jsx must not exist",
  );

  // 3. No references to recruiter bypass in files
  const filesToCheck = [
    "server/routes/modules/auth.route.js",
    "server/routes/modules/user.route.js",
    "server/controllers/user.controller.js",
    "client/src/App.jsx",
    "client/src/api/api.js",
    "client/src/pages/Login.jsx",
    "client/src/pages/SignUp.jsx",
  ];

  const repoRoot = path.join(__dirname, "../..");
  for (const relPath of filesToCheck) {
    const content = fs.readFileSync(path.join(repoRoot, relPath), "utf-8");
    assert.strictEqual(
      /recruiter/i.test(content),
      false,
      `File ${relPath} must not contain recruiter references`,
    );
  }

  // 4. Verify SignUp.jsx has 1-click Demo buttons and no recruiter mentions
  const signupContent = fs.readFileSync(
    path.join(repoRoot, "client/src/pages/SignUp.jsx"),
    "utf-8",
  );
  assert.match(signupContent, /handleDemoLogin/);
  assert.match(signupContent, /Demo Admin/);
  assert.match(signupContent, /Demo User/);

  // 5. Verify Login.jsx has 1-click Demo buttons and no duplicate buttons
  const loginContent = fs.readFileSync(
    path.join(repoRoot, "client/src/pages/Login.jsx"),
    "utf-8",
  );
  assert.match(loginContent, /handleDemoLogin/);
  assert.match(loginContent, /Demo Admin/);
  assert.match(loginContent, /Demo User/);
  const demoAdminOccurrences = (loginContent.match(/Demo Admin/g) || []).length;
  assert.strictEqual(
    demoAdminOccurrences,
    1,
    "Login.jsx must have exactly 1 Demo Admin button (no duplicate in form panel)",
  );
});

test("Git History & .gitignore Security", async (t) => {
  const repoRoot = path.join(__dirname, "../..");

  // 1. Root .gitignore exists
  const gitignoreExists = fs.existsSync(path.join(repoRoot, ".gitignore"));
  assert.strictEqual(gitignoreExists, true, "Root .gitignore must exist");

  const gitignoreContent = fs.readFileSync(
    path.join(repoRoot, ".gitignore"),
    "utf-8",
  );
  assert.match(gitignoreContent, /\.env/);
  assert.match(gitignoreContent, /node_modules/);

  // 2. Git log check: no .env in git history
  const logOutput = execSync(
    'git log --all --full-history -- "server/.env" "client/.env" ".env"',
    { cwd: repoRoot, encoding: "utf-8" },
  );
  assert.strictEqual(
    logOutput.trim(),
    "",
    "Git history must contain zero commits with .env",
  );
});
