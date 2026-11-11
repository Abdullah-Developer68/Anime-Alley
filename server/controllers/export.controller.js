const {
  dataConfigs,
  generateExcel,
  generatePdf,
} = require("../services/export.service.js");
const dbConnect = require("../db/dbConnect.js");

const exportData = async (req, res) => {
  const dataType = req.params?.dataType;
  const format = req.query?.format;

  try {
    // --- Validation ---
    if (!format || !dataType)
      return res
        .status(400)
        .json({ message: "Format and data type are required!" });

    // Own keys only, so "constructor" or "__proto__" can't select something unexpected
    const config = Object.hasOwn(dataConfigs, dataType) ? dataConfigs[dataType] : null;
    if (!config)
      return res.status(400).json({ message: "Invalid data type specified." });

    if (format !== "excel" && format !== "pdf")
      return res.status(400).json({ message: "Invalid format specified." });

    // Customer lists and live coupon codes stay out of reach of one-click demo accounts
    if (req.user?.isDemo && dataType !== "products")
      return res.status(403).json({ success: false, message: "Demo accounts can only export products." });

    await dbConnect();
    // No need to check role again - requireAdmin middleware already verified admin/superAdmin role

    // --- File Generation ---
    if (format === "excel")
      await generateExcel(res, config);
    else if (format === "pdf")
      await generatePdf(res, config);
  } catch (error) {
    console.error(`Error exporting ${dataType}:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error during export.",
    });
  }
};

module.exports = {
  exportData,
};
