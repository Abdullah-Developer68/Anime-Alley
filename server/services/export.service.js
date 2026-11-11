const excel = require("exceljs");
const PDFDocument = require("pdfkit");

const userModel = require("../db/models/user.model.js");
const productModel = require("../db/models/product.model.js");
const couponModel = require("../db/models/coupon.model.js");
const orderModel = require("../db/models/order.model.js");

// --- Value helpers ---

const ROLE_LABELS = { superAdmin: "Super admin", admin: "Admin", user: "Customer" };

const capitalize = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);

const variantsOf = (product) => (Array.isArray(product?.variants) ? product.variants : []);

const totalStock = (product) => variantsOf(product).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

// "Default" is the single variant of products without sizes or volumes, so it has nothing to list
const variantBreakdown = (product) => {
  const variants = variantsOf(product);
  if (variants.length === 0 || (variants.length === 1 && variants[0].label === "Default"))
    return "";
  return variants.map((v) => `${v.label}: ${v.stock}`).join(", ");
};

const itemCount = (order) => (order.products || []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

const isCouponActive = (coupon) => new Date(coupon.expiryDate) > new Date();

// --- Export definitions ---
// Each column: header, Excel width (characters), PDF width (relative share of the page), type and value getter.
// Types drive formatting: numbers, money and dates stay real values in Excel and are formatted as text in the PDF.
const dataConfigs = {
  users: {
    title: "Users",
    model: userModel,
    select: "username email role accountStatus isDemo createdAt",
    columns: [
      { header: "Username", width: 24, pdfWidth: 3, value: (u) => u.username },
      { header: "Email", width: 34, pdfWidth: 4.5, value: (u) => u.email },
      { header: "Role", width: 14, pdfWidth: 1.6, value: (u) => ROLE_LABELS[u.role] || u.role },
      { header: "Account", width: 14, pdfWidth: 1.6, value: (u) => (u.accountStatus === "verifying" ? "Unverified" : "Active") },
      { header: "Demo", width: 8, pdfWidth: 1, value: (u) => (u.isDemo ? "Yes" : "No") },
      { header: "Joined", width: 14, pdfWidth: 1.6, type: "date", value: (u) => u.createdAt },
    ],
  },

  products: {
    title: "Products",
    model: productModel,
    select: "productID name category price variants",
    columns: [
      { header: "Product ID", width: 16, pdfWidth: 1.6, value: (p) => p.productID },
      { header: "Name", width: 36, pdfWidth: 4, value: (p) => p.name },
      { header: "Category", width: 12, pdfWidth: 1.3, value: (p) => capitalize(p.category) },
      { header: "Price", width: 12, pdfWidth: 1.2, type: "money", value: (p) => p.price },
      { header: "Total stock", width: 12, pdfWidth: 1.2, type: "number", value: totalStock },
      { header: "Stock by variant", width: 48, pdfWidth: 4.5, value: variantBreakdown },
    ],
  },

  coupons: {
    title: "Coupons",
    model: couponModel,
    select: "couponCode discountPercentage totalUsage lifeTimeDiscount expiryDate",
    columns: [
      { header: "Code", width: 20, pdfWidth: 2.4, value: (c) => c.couponCode },
      { header: "Discount", width: 11, pdfWidth: 1.2, type: "percent", value: (c) => c.discountPercentage },
      { header: "Uses", width: 9, pdfWidth: 1, type: "number", value: (c) => c.totalUsage || 0 },
      { header: "Total discounted", width: 17, pdfWidth: 1.8, type: "money", value: (c) => c.lifeTimeDiscount || 0 },
      { header: "Valid until", width: 14, pdfWidth: 1.6, type: "date", value: (c) => c.expiryDate },
      { header: "Status", width: 10, pdfWidth: 1.2, value: (c) => (isCouponActive(c) ? "Active" : "Expired") },
    ],
  },

  orders: {
    title: "Orders",
    model: orderModel,
    select: "orderID user products status subtotal shippingCost discount finalAmount couponCode paymentMethod createdAt orderDate",
    populate: { path: "user", select: "username email" },
    columns: [
      { header: "Order ID", width: 24, pdfWidth: 2.6, value: (o) => o.orderID },
      { header: "Date", width: 12, pdfWidth: 1.4, type: "date", value: (o) => o.createdAt || o.orderDate },
      { header: "Customer", width: 20, pdfWidth: 2, value: (o) => o.user?.username || "Deleted user" },
      { header: "Email", width: 30, pdfWidth: 3, value: (o) => o.user?.email || "" },
      { header: "Items", width: 8, pdfWidth: 0.8, type: "number", value: itemCount },
      { header: "Subtotal", width: 12, pdfWidth: 1.3, type: "money", value: (o) => o.subtotal },
      { header: "Shipping", width: 11, pdfWidth: 1.2, type: "money", value: (o) => o.shippingCost },
      { header: "Discount", width: 11, pdfWidth: 1.2, type: "money", value: (o) => o.discount || 0 },
      { header: "Coupon", width: 14, pdfWidth: 1.5, value: (o) => o.couponCode || "" },
      { header: "Total", width: 12, pdfWidth: 1.3, type: "money", value: (o) => o.finalAmount },
      { header: "Status", width: 12, pdfWidth: 1.3, value: (o) => capitalize(o.status) },
    ],
  },
};

// --- Shared data loading ---

const fetchRecords = (config) => {
  let query = config.model.find().select(config.select).lean();
  if (config.populate)
    query = query.populate(config.populate);
  // _id is time-ordered, so this is newest first even for models without timestamps
  return query.sort({ _id: -1 });
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Excel cell value: real numbers and dates so the sheet can sort and sum them
const excelValue = (column, record) => {
  const raw = column.value(record);
  if (column.type === "date")
    return toDate(raw);
  if (column.type === "percent") {
    const number = toNumber(raw);
    return number === null ? null : number / 100;
  }
  if (column.type === "money" || column.type === "number")
    return toNumber(raw);
  return raw ?? "";
};

const moneyText = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateText = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

// PDF cell text: the same values, formatted for reading
const pdfText = (column, record) => {
  const raw = column.value(record);
  if (column.type === "date") {
    const date = toDate(raw);
    return date ? dateText.format(date) : "";
  }
  const number = toNumber(raw);
  if (column.type === "money")
    return number === null ? "" : moneyText.format(number);
  if (column.type === "percent")
    return number === null ? "" : `${number}%`;
  if (column.type === "number")
    return number === null ? "" : number.toLocaleString("en-US");
  return String(raw ?? "");
};

const NUMBER_FORMATS = { money: '"$"#,##0.00', percent: "0%", number: "#,##0", date: "dd mmm yyyy" };

const isNumeric = (column) => ["money", "percent", "number"].includes(column.type);

// --- Excel ---

const buildExcel = async (config, records) => {
  const workbook = new excel.Workbook();
  workbook.creator = "Anime Alley";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(config.title, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = config.columns.map((column, index) => ({
    header: column.header,
    key: String(index),
    width: column.width,
    style: {
      numFmt: NUMBER_FORMATS[column.type],
      alignment: { vertical: "top", horizontal: isNumeric(column) ? "right" : "left", wrapText: !isNumeric(column) },
    },
  }));

  records.forEach((record) => {
    const row = {};
    config.columns.forEach((column, index) => (row[String(index)] = excelValue(column, record)));
    const added = sheet.addRow(row);
    // "0%" would round 12.5% to 13%, so fractional percentages get two decimals
    config.columns.forEach((column, index) => {
      const cell = added.getCell(index + 1);
      if (column.type === "percent" && typeof cell.value === "number" && !Number.isInteger(Math.round(cell.value * 1e6) / 1e4))
        cell.numFmt = "0.00%";
    });
  });

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FF1F2937" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  header.alignment = { vertical: "middle" };
  header.height = 20;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: config.columns.length } };

  return workbook.xlsx.writeBuffer();
};

// --- PDF ---

const PAGE = { size: "A4", layout: "landscape", margin: 36 };
const CELL_PAD_X = 5;
const CELL_PAD_Y = 5;
const FONT_SIZE = 8.5;
const COLORS = { text: "#1F2937", muted: "#6B7280", rule: "#D1D5DB", header: "#E5E7EB", zebra: "#F6F7F9" };

const buildPdf = (config, records) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...PAGE, bufferPages: true, info: { Title: `${config.title} export`, Author: "Anime Alley" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const usableWidth = doc.page.width - left - doc.page.margins.right;
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 18;
    const totalShare = config.columns.reduce((sum, column) => sum + column.pdfWidth, 0);
    const widths = config.columns.map((column) => (column.pdfWidth / totalShare) * usableWidth);

    // Tallest wrapped cell decides the row height, so long values never overlap the next row
    const rowHeight = (cells, font) => {
      doc.font(font).fontSize(FONT_SIZE);
      const tallest = cells.reduce(
        (max, text, i) => Math.max(max, doc.heightOfString(text || " ", { width: widths[i] - CELL_PAD_X * 2 })),
        0,
      );
      return tallest + CELL_PAD_Y * 2;
    };

    const drawRow = (cells, y, { font, fill }) => {
      const height = rowHeight(cells, font);
      if (fill)
        doc.rect(left, y, usableWidth, height).fill(fill);
      doc.font(font).fontSize(FONT_SIZE).fillColor(COLORS.text);
      let x = left;
      cells.forEach((text, i) => {
        const align = isNumeric(config.columns[i]) ? "right" : "left";
        doc.text(text, x + CELL_PAD_X, y + CELL_PAD_Y, { width: widths[i] - CELL_PAD_X * 2, align });
        x += widths[i];
      });
      doc.moveTo(left, y + height).lineTo(left + usableWidth, y + height).lineWidth(0.5).strokeColor(COLORS.rule).stroke();
      return y + height;
    };

    const headers = config.columns.map((column) => column.header);
    const drawHeader = (y) => drawRow(headers, y, { font: "Helvetica-Bold", fill: COLORS.header });

    doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.text).text(`${config.title}`, left, doc.page.margins.top);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(`${records.length} records  |  Generated ${dateText.format(new Date())}`, left, doc.y + 2);

    let y = drawHeader(doc.y + 10);

    if (records.length === 0)
      doc.font("Helvetica").fontSize(FONT_SIZE).fillColor(COLORS.muted).text("No records to export.", left, y + 10);

    records.forEach((record, index) => {
      const cells = config.columns.map((column) => pdfText(column, record));
      if (y + rowHeight(cells, "Helvetica") > bottomLimit) {
        doc.addPage();
        y = drawHeader(doc.page.margins.top);
      }
      y = drawRow(cells, y, { font: "Helvetica", fill: index % 2 === 1 ? COLORS.zebra : null });
    });

    // Page numbers go in once every page exists, which bufferPages makes possible
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - doc.page.margins.bottom;
      // Text placed inside the bottom margin would otherwise make pdfkit start a new page
      doc.page.margins.bottom = 0;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Page ${i + 1} of ${count}`, left, footerY, { width: usableWidth, align: "right", lineBreak: false });
    }

    doc.end();
  });

// --- Response writers ---
// Files are built fully in memory first, so a failure still returns a clean JSON error instead of a truncated download

const sendFile = (res, buffer, { contentType, filename }) => {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.end(buffer);
};

const generateExcel = async (res, config) => {
  const records = await fetchRecords(config);
  const buffer = Buffer.from(await buildExcel(config, records));
  sendFile(res, buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `${config.title.toLowerCase()}.xlsx`,
  });
};

const generatePdf = async (res, config) => {
  const records = await fetchRecords(config);
  const buffer = await buildPdf(config, records);
  sendFile(res, buffer, { contentType: "application/pdf", filename: `${config.title.toLowerCase()}.pdf` });
};

module.exports = {
  dataConfigs,
  generateExcel,
  generatePdf,
  buildExcel,
  buildPdf,
};
