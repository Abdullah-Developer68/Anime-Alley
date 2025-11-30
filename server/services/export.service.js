// Import required libraries for Excel and PDF generation
const excel = require("exceljs");
const PDFDocument = require("pdfkit");

// Import database models for different entities
const userModel = require("../models/user.model.js");
const productModel = require("../models/product.model.js");
const couponModel = require("../models/coupon.model.js");
const orderModel = require("../models/order.model.js");

// --- Helper function to format stock for display ---

const formatStock = (product) => {
  if (product.category === "toys") {
    return product.stock > 0 ? `${product.stock} available` : "Out of Stock";
  }

  // For products with object-based stock (e.g., sizes, variants)
  // Display as key-value pairs (e.g., "S: 10, M: 5, L: 2")
  if (typeof product.stock === "object" && product.stock !== null) {
    return Object.entries(product.stock)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  }

  // Fallback for unknown stock format
  return "N/A";
};

const formatUser = (order) => {
  // If user data is populated, return formatted string with username and email
  if (order.user) {
    return `${order.user.username} (${order.user.email})`;
  }
  // Fallback for orders without user data
  return "Unknown User";
};

// --- Data Fetching and Configuration ---
/**
 * Configuration object defining how different data types should be exported
 * Each configuration includes:
 * - model: The database model to query
 * - populate: (optional) Relations to populate from other collections
 * - fields: Array of field definitions for export columns
 */
const dataConfigs = {
  // User export configuration
  users: {
    model: userModel, // <--- This tells the export logic to fetch users
    // these fields define the columns in the exported file
    fields: [
      { header: "Username", key: "username", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Role", key: "role", width: 15 },
      { header: "Joined Date", key: "createdAt", width: 20, isDate: true },
    ],
  },

  // Product export configuration
  products: {
    model: productModel, // <--- This tells the export logic to fetch products
    fields: [
      { header: "Product ID", key: "productID", width: 20 },
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 15 },
      { header: "Price", key: "price", width: 10 },
      { header: "Stock", key: "stock", width: 40, formatter: formatStock }, // Uses custom formatter
    ],
  },

  // Coupon export configuration
  coupons: {
    model: couponModel, // <--- This tells the export logic to fetch coupons
    fields: [
      { header: "Coupon Code", key: "couponCode", width: 25 },
      {
        header: "Discount",
        key: "discountPercentage",
        width: 15,
        formatter: (coupon) => `${coupon.discountPercentage}%`, // Adds % symbol
      },
      { header: "Expiry Date", key: "expiryDate", width: 20, isDate: true },
    ],
  },

  // Order export configuration with user population
  orders: {
    model: orderModel, // <--- This tells the export logic to fetch orders
    populate: { path: "user", select: "username email" }, // Populate user data for orders
    fields: [
      { header: "Order ID", key: "orderID", width: 25 },
      {
        header: "Customer",
        key: "user",
        width: 30,
        formatter: formatUser, // Uses custom user formatter
      },
      {
        header: "Amount",
        key: "finalAmount",
        width: 15,
        formatter: (order) => `$${order.finalAmount}`, // Adds currency symbol
      },
      { header: "Status", key: "status", width: 15 },
      { header: "Date", key: "createdAt", width: 20, isDate: true },
      { header: "Coupon", key: "couponCode", width: 30 },
    ],
  },
};

// --- Generic Excel Generation ---
/**
 * Generates an Excel file and streams it to the response
 * @param {Object} res - Express response object
 * @param {Object} config - Configuration object containing model and field definitions (dataConfig)
 */
const generateExcel = async (res, config) => {
  // Build database query with optional population
  let query = config.model.find(); // ← This becomes userModel/productModel/couponModel/orderModel.find()

  if (config.populate) {
    query = query.populate(config.populate); // populate loads data for referenced fields
  }

  // Execute query and sort by creation date (newest first)
  const data = await query.sort({ createdAt: -1 });

  // Create new Excel workbook and worksheet
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet(
    // Capitalize the model name (the name stored in DB, "users" etc) for worksheet title
    config.model.modelName.charAt(0).toUpperCase() +
      config.model.modelName.slice(1)
  );

  // Set up worksheet columns based on field configuration
  worksheet.columns = config.fields;

  // Process each data item and add as a row
  data.forEach((item) => {
    const row = {};
    config.fields.forEach((field) => {
      let value = item[field.key];

      // Apply custom formatter if specified
      if (field.formatter) {
        value = field.formatter(item);
      }
      // Format dates to YYYY-MM-DD format
      else if (field.isDate && value) {
        value = new Date(value).toISOString().split("T")[0];
      }

      row[field.key] = value;
    });
    worksheet.addRow(row);
  });

  // Set response headers for Excel file download
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${config.model.modelName}.xlsx`
  );

  // Write Excel file to response and end the response
  await workbook.xlsx.write(res);
  res.end();
};

// --- Generic PDF Generation ---
/**
 * Generates a PDF file and streams it to the response
 * @param {Object} res - Express response object
 * @param {Object} config - Configuration object containing model and field definitions
 */
const generatePdf = async (res, config) => {
  // Build database query with population just for referenced fields
  let query = config.model.find();
  if (config.populate) {
    query = query.populate(config.populate);
  }

  // Execute query and sort by creation date (newest first)
  const data = await query.sort({ createdAt: -1 });

  // Create new PDF document with A4 size and margins
  const doc = new PDFDocument({ margin: 30, size: "A4" });

  // Set response headers for PDF file download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${config.model.modelName}.pdf`
  );

  // Pipe doc (RS) to res (WS)
  doc.pipe(res);

  // Add document title (centered, large font)
  doc
    .fontSize(20)
    .text(
      `${
        config.model.modelName.charAt(0).toUpperCase() +
        config.model.modelName.slice(1)
      } List`,
      { align: "center" }
    );
  doc.moveDown();

  // Create table headers
  const tableTop = doc.y; // Gets the current Y position to draw headers.
  let x = 30; // Starting X position
  doc.fontSize(10).font("Helvetica-Bold");

  // Draw each column header
  config.fields.forEach((field) => {
    doc.text(field.header, x, tableTop, { width: field.width * 5 - 10 });
    x += field.width * 5; // Spacing out each column by width.
  });

  // Reset font to normal weight
  doc.font("Helvetica");

  // Draw horizontal line under headers
  doc
    .moveTo(30, doc.y + 5) // p1 -> x, p2 -> y
    .lineTo(570, doc.y + 5) // p1 -> x, p2 -> y
    .stroke(); // draws a line across the page as you instructed using moveTo and lineTo
  doc.moveDown(2);

  // Add table rows with data
  data.forEach((item) => {
    const y = doc.y; // Current Y position for this row
    let rowX = 30; // Starting X position for this row

    // Process each field for current row
    config.fields.forEach((field) => {
      let value = item[field.key];

      // Apply custom formatter if specified
      if (field.formatter) {
        value = field.formatter(item);
      }
      // Format dates to YYYY-MM-DD format
      else if (field.isDate && value) {
        value = new Date(value).toISOString().split("T")[0];
      }

      // Add text to PDF with specified width constraint
      doc
        .fontSize(9)
        .text(String(value ?? ""), rowX, y, { width: field.width * 5 - 10 });

      // Move to next column position
      rowX += field.width * 5;
    });

    // Move down for next row
    doc.moveDown(1.5);
  });

  // Finalize the PDF document
  doc.end();
};

// Export the main functions and configuration for use in other modules
module.exports = {
  dataConfigs, // Configuration object for different data types
  generateExcel,
  generatePdf,
};
