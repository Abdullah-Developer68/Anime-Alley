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
    return {
      select: () => results,
    };
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
      if (query.$or) {
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
const mockMongoose = {
  Schema: class {
    constructor() {}
    index() {}
  },
  model: () => mockUserModel,
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
    return {
      Router: () => ({
        post: () => {},
        get: () => {},
        use: () => {},
        put: () => {},
        delete: () => {},
      }),
    };
  }
  if (request === "express-rate-limit") return () => (req, res, next) => next();
  if (request === "../models/user.model.js") return mockUserModel;
  if (request === "../../models/user.model.js") return mockUserModel;
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
