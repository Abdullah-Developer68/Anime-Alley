// Validate and parse incoming product data shared across product creation and updates
const validateProductData = (body) => {
  // Destructure required and optional product fields with empty object fallback
  const {
    name,
    price,
    stock,
    category,
    description,
    merchType,
    toyType,
  } = body || {};

  // Reject missing fields, null/undefined values, and whitespace-only strings
  if (
    !name ||
    (typeof name === "string" && !name.trim()) ||
    price == null ||
    (typeof price === "string" && !price.trim()) ||
    stock == null ||
    (typeof stock === "string" && !stock.trim()) ||
    !category ||
    (typeof category === "string" && !category.trim())
  )
    return {
      valid: false,
      status: 400,
      message: "fields in data from client are missing",
    };

  // Validate numeric type for price (must strictly be a finite non-negative number)
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0)
    return {
      valid: false,
      status: 400,
      message: "Price must be a valid non-negative number",
    };

  // Validate category against allowed whitelist
  const validCategories = ["comics", "toys", "clothes", "shoes"];
  const catLower = typeof category === "string" ? category.toLowerCase() : "";
  if (!validCategories.includes(catLower))
    return {
      valid: false,
      status: 400,
      message: `Invalid category: ${category}. Valid categories are: ${validCategories.join(", ")}`,
    };

  let stockData;
  // Handle single integer stock value for toys
  if (catLower === "toys") {
    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)
      return {
        valid: false,
        status: 400,
        message: "Invalid stock value for toy",
      };
    stockData = stock;
  }

  let volumes, genres, sizes;
  // Handle variant-based stock and metadata for comics
  if (catLower === "comics") {
    // Parse stringified JSON stock if received from multipart forms
    try {
      stockData = typeof stock === "string" ? JSON.parse(stock) : stock;
    } catch {
      return {
        valid: false,
        status: 400,
        message: "Invalid stock format: must be valid JSON",
      };
    }

    // Comics stock must be a plain object mapping volume names to numbers
    if (stockData !== undefined && (typeof stockData !== "object" || stockData === null || Array.isArray(stockData)))
      return {
        valid: false,
        status: 400,
        message: "Stock must be an object for comics",
      };

    // Safely parse volumes and genres arrays if provided as JSON strings
    try {
      volumes = body.volumes !== undefined
        ? (typeof body.volumes === "string" ? JSON.parse(body.volumes) : body.volumes)
        : undefined;
      genres = body.genres !== undefined
        ? (typeof body.genres === "string" ? JSON.parse(body.genres) : body.genres)
        : undefined;
    } catch {
      return {
        valid: false,
        status: 400,
        message: "Invalid volumes or genres format: must be valid JSON",
      };
    }

    // Validate that all entries in stockData have non-negative integer stock
    if (typeof stockData === "object" && stockData !== null) {
      for (const [volume, volStock] of Object.entries(stockData)) {
        if (typeof volStock !== "number" || !Number.isInteger(volStock) || volStock < 0)
          return {
            valid: false,
            status: 400,
            message: `Stock value missing or invalid for volume ${volume}`,
          };
      }
    }

    // Validate that stock exists for each volume and is non-negative
    if (Array.isArray(volumes) && typeof stockData === "object" && stockData !== null) {
      for (const volume of volumes) {
        const volStock = stockData[volume];
        if (typeof volStock !== "number" || !Number.isInteger(volStock) || volStock < 0)
          return {
            valid: false,
            status: 400,
            message: `Stock value missing or invalid for volume ${volume}`,
          };
      }
    }
  } else if (catLower === "clothes" || catLower === "shoes") {
    // Parse stringified JSON stock if received from multipart forms
    try {
      stockData = typeof stock === "string" ? JSON.parse(stock) : stock;
    } catch {
      return {
        valid: false,
        status: 400,
        message: "Invalid stock format: must be valid JSON",
      };
    }

    // Clothes and shoes stock must be a plain object mapping sizes to numbers
    if (stockData !== undefined && (typeof stockData !== "object" || stockData === null || Array.isArray(stockData)))
      return {
        valid: false,
        status: 400,
        message: "Stock must be an object for this category",
      };

    // Safely parse sizes array if provided as a JSON string
    try {
      sizes = body.sizes !== undefined
        ? (typeof body.sizes === "string" ? JSON.parse(body.sizes) : body.sizes)
        : undefined;
    } catch {
      return {
        valid: false,
        status: 400,
        message: "Invalid sizes format: must be valid JSON",
      };
    }

    // Validate that all entries in stockData have non-negative integer stock
    if (typeof stockData === "object" && stockData !== null) {
      for (const [size, sizeStock] of Object.entries(stockData)) {
        if (typeof sizeStock !== "number" || !Number.isInteger(sizeStock) || sizeStock < 0)
          return {
            valid: false,
            status: 400,
            message: `Stock value missing or invalid for size ${size}`,
          };
      }
    }

    // Validate that stock exists for each size and is non-negative
    if (Array.isArray(sizes) && typeof stockData === "object" && stockData !== null) {
      for (const size of sizes) {
        const sizeStock = stockData[size];
        if (typeof sizeStock !== "number" || !Number.isInteger(sizeStock) || sizeStock < 0)
          return {
            valid: false,
            status: 400,
            message: `Stock value missing or invalid for size ${size}`,
          };
      }
    }
  }

  // Assemble sanitized product fields
  const productData = {
    name,
    price,
    category,
    description,
    stock: stockData,
  };

  // Attach category-specific fields
  if (catLower === "comics") {
    productData.volumes = volumes;
    productData.genres = genres;
  } else if (catLower === "clothes" || catLower === "shoes") {
    productData.sizes = sizes;
    productData.merchType = merchType;
  } else if (catLower === "toys")
    productData.toyType = toyType;

  return {
    valid: true,
    data: productData,
  };
};

module.exports = { validateProductData };
