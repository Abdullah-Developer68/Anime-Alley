// Middleware to parse multipart numeric and JSON fields into native types
// Since multipart/form-data transmits fields as strings, this converts valid JSON numeric values
const parseMultipartProductData = (req, res, next) => {
  if (req.is("multipart/form-data") && req.body) {
    if (typeof req.body.price === "string" && req.body.price.trim() !== "") {
      try {
        const parsedPrice = JSON.parse(req.body.price);
        if (typeof parsedPrice === "number")
          req.body.price = parsedPrice;
      } catch {
        // Leave as string so controller strictly rejects invalid type
      }
    }
    if (typeof req.body.stock === "string" && req.body.stock.trim() !== "") {
      try {
        const parsedStock = JSON.parse(req.body.stock);
        if (typeof parsedStock === "number" || (typeof parsedStock === "object" && parsedStock !== null))
          req.body.stock = parsedStock;
      } catch {
        // Leave as string so controller strictly rejects invalid type
      }
    }
  }
  next();
};

module.exports = parseMultipartProductData;
