// Centralized validation and data parsing utilities across controllers
// All validators take pure data parameters (decoupled from HTTP req objects)

// Validate and parse product data for creation and updates
const validateProductData = (body, { isMultipart = false } = {}) => {
  let {
    name,
    price,
    variants,
    category,
    description,
    merchType,
    toyType,
    genres,
  } = body || {};

  // For multipart requests, deserialize wire-format strings into native types
  if (isMultipart) {
    if (typeof price === "string" && price.trim() !== "") {
      const parsedPrice = Number(price);
      if (Number.isFinite(parsedPrice))
        price = parsedPrice;
    }
    if (typeof variants === "string" && variants.trim() !== "") {
      try {
        variants = JSON.parse(variants);
      } catch {
        return {
          valid: false,
          status: 400,
          message: "Invalid variants format: must be valid JSON",
        };
      }
    }
    if (typeof genres === "string" && genres.trim() !== "") {
      try {
        genres = JSON.parse(genres);
      } catch {
        // Leave as string if not valid JSON
      }
    }
  }

  const hasVariants =
    variants !== undefined &&
    variants !== null &&
    (typeof variants !== "string" || variants.trim() !== "");

  // Reject missing fields, null/undefined values, and whitespace-only strings
  if (
    !name ||
    (typeof name === "string" && !name.trim()) ||
    price == null ||
    (typeof price === "string" && !price.trim()) ||
    !hasVariants ||
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

  // Variants must strictly be a non-empty array
  if (!Array.isArray(variants) || variants.length === 0)
    return {
      valid: false,
      status: 400,
      message: "Variants must be a non-empty array",
    };

  const variantsData = [];
  for (const v of variants) {
    if (!v || typeof v !== "object" || typeof v.label !== "string" || !v.label.trim())
      return {
        valid: false,
        status: 400,
        message: "Each variant must have a non-empty label",
      };

    if (typeof v.stock !== "number" || !Number.isInteger(v.stock) || v.stock < 0)
      return {
        valid: false,
        status: 400,
        message: `Variant ${v.label} must have a non-negative integer stock`,
      };

    variantsData.push({ label: v.label.trim(), stock: v.stock });
  }

  // Assemble sanitized product fields
  const productData = {
    name: typeof name === "string" ? name.trim() : name,
    price,
    category: catLower,
    description,
    variants: variantsData,
  };

  // Attach category-specific metadata fields
  if (catLower === "comics")
    productData.genres = genres;
  else if (catLower === "clothes" || catLower === "shoes")
    productData.merchType = merchType;
  else if (catLower === "toys")
    productData.toyType = toyType;

  return {
    valid: true,
    data: productData,
  };
};

// Validates coupon fields shared between createCoupon and updateCoupon
const validateCouponFields = ({ discountPercentage, expiryDate } = {}) => {
  if (
    discountPercentage !== undefined &&
    (typeof discountPercentage !== "number" ||
      discountPercentage <= 0 ||
      discountPercentage > 100)
  )
    return {
      valid: false,
      status: 400,
      message: "Discount percentage must be a number between 1 and 100",
    };

  if (expiryDate !== undefined) {
    const parsed = new Date(expiryDate);
    if (isNaN(parsed.getTime()))
      return {
        valid: false,
        status: 400,
        message: "Invalid expiry date",
      };
  }

  return { valid: true };
};

// Validates essential order parameters before session acquisition
const validateOrderData = (body) => {
  const { couponCode, userInfo, deliveryAddress, paymentMethod } = body || {};

  if (!userInfo?.email || !deliveryAddress || !paymentMethod)
    return {
      valid: false,
      status: 400,
      message: "User information, delivery address and payment method are required",
    };

  const VALID_PAYMENT_METHODS = ["cod", "stripe"];
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod))
    return {
      valid: false,
      status: 400,
      message: `Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`,
    };

  return {
    valid: true,
    data: { couponCode, userInfo, deliveryAddress, paymentMethod },
  };
};

// Validates stock reservation parameters
const validateReservationData = (body) => {
  const { productId, variant, quantity } = body || {};

  if (!productId || quantity === undefined || quantity === null)
    return {
      valid: false,
      status: 400,
      message: "Missing required fields",
    };

  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1)
    return {
      valid: false,
      status: 400,
      message: "Quantity must be a positive integer",
    };

  return {
    valid: true,
    data: { productId, variant, quantity },
  };
};

// Validates export route parameters
const validateExportData = (params) => {
  const { format, dataType } = params || {};

  if (!format || !dataType)
    return {
      valid: false,
      status: 400,
      message: "Format and data type are required!",
    };

  const validFormats = ["excel", "pdf"];
  const validDataTypes = ["products", "orders", "users", "coupons"];

  if (!validFormats.includes(format.toLowerCase()))
    return {
      valid: false,
      status: 400,
      message: "Invalid format! Allowed formats are: excel, pdf",
    };

  if (!validDataTypes.includes(dataType.toLowerCase()))
    return {
      valid: false,
      status: 400,
      message: "Invalid data type! Allowed types are: products, orders, users, coupons",
    };

  return {
    valid: true,
    data: { format: format.toLowerCase(), dataType: dataType.toLowerCase() },
  };
};

// Validates pagination query parameters
const validatePagination = (query) => {
  const currPage = query?.currPage;

  if (!currPage)
    return {
      valid: false,
      status: 400,
      message: "Current page is required!",
    };

  const parsedPage = parseInt(currPage, 10);
  if (isNaN(parsedPage) || parsedPage < 1)
    return {
      valid: false,
      status: 400,
      message: "Current page must be a positive integer",
    };

  return {
    valid: true,
    page: parsedPage,
  };
};

module.exports = {
  validateProductData,
  validateCouponFields,
  validateOrderData,
  validateReservationData,
  validateExportData,
  validatePagination,
};

