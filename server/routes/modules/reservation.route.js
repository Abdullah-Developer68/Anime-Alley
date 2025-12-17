const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
} = require("../../middlewares/custom/auth.middleware.js");
const { reserveStock } = require("../../controllers/reservation.controller.js");

// All reservation routes require authentication
router.use(verifyTokenMiddleware);

router.post("/reserveStock", reserveStock);

module.exports = router;
