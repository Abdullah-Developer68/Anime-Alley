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
    if (typeof req.body.variants === "string" && req.body.variants.trim() !== "") {
      try {
        const parsedVariants = JSON.parse(req.body.variants);
        if (Array.isArray(parsedVariants))
          req.body.variants = parsedVariants;
      } catch {
        // Leave as string so controller strictly rejects invalid type
      }
    }
  }
  next();
};

module.exports = parseMultipartProductData;
