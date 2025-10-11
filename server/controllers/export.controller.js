const userModel = require("../models/user.model.js");
const {
  dataConfigs,
  generateExcel,
  generatePdf,
} = require("../services/export.service.js");
const dbConnect = require("../config/dbConnect.js");

const exportData = async (req, res) => {
  dbConnect();
  const { dataType } = req.params;
  const { format } = req.query;

  // Extract email from verified JWT token (set by verifyTokenMiddleware)
  const email = req.user.email;

  // --- Validation ---
  if (!format || !dataType) {
    return res
      .status(400)
      .json({ message: "Format and data type are required!" });
  }

  const config = dataConfigs[dataType]; // selects appropriate config(user, product, coupon, order) based on dataType
  if (!config) {
    return res.status(400).json({ message: "Invalid data type specified." });
  }

  try {
    // No need to check role again - requireAdmin middleware already verified admin/superAdmin role

    // --- File Generation ---
    if (format === "excel") {
      await generateExcel(res, config);
    } else if (format === "pdf") {
      await generatePdf(res, config);
    } else {
      return res.status(400).json({ message: "Invalid format specified." });
    }
  } catch (error) {
    console.error(`Error exporting ${dataType}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during export.",
    });
  }
};

module.exports = {
  exportData,
};
