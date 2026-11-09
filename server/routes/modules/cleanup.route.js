const express = require("express");
const router = express.Router();
const {
  cleanupUnverifiedUsersController,
  cleanupReservationsController,
} = require("../../controllers/cleanup.controller.js");
const { verifyCronSecret } = require("../../middlewares/custom/cron.middleware.js");

// Called by Vercel Cron Jobs (see vercel.json), which authenticate with Bearer CRON_SECRET.
// These are GET despite changing data because Vercel Cron can only send GET requests.
router.use(verifyCronSecret);

router.get("/users", cleanupUnverifiedUsersController);
router.get("/reservations", cleanupReservationsController);

module.exports = router;
