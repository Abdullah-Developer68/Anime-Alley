const verifyCronSecret = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ success: false });
  }
  // Pass on the control to the next function (cleanup controllers in this case)
  next();
};

module.exports = { verifyCronSecret };
