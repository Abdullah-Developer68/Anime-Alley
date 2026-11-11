// Anyone can open a demo account with one click, so demo accounts may look around but never change
// shared data. Runs after requireAdmin on admin routes: reads pass, every write is refused.
const blockDemoWrites = (req, res, next) => {
  if (req.user?.isDemo && req.method !== "GET")
    return res.status(403).json({
      success: false,
      message: "Demo accounts are read-only. Create a free account to make changes.",
    });
  next();
};

module.exports = { blockDemoWrites };
