// Centralized validation and data parsing utilities across controllers
// All validators take pure data parameters (decoupled from HTTP req objects)
const {
  ALLOWED_GENRES,
  CLOTHES_TYPES,
  SHOE_TYPES,
  TOY_TYPES,
} = require("../db/submodels/product/attributes.schema.js");
const { formatPrice } = require("./formatPrice.utils.js");
const { validateComicVolumes } = require("./volume.utils.js");

// Validate and parse product data for creation and updates
const validateProductData = (body, { isMultipart = false } = {}) => {
  let {
    name,
    price,
    variants,
    category,
    description,
    clothesType,
    shoeType,
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
        return {
          valid: false,
          status: 400,
          message: "Invalid genres format: must be valid JSON",
        };
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

  price = formatPrice(price);

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
  const seenLabels = new Set();
  for (const v of variants) {
    if (!v || typeof v !== "object" || typeof v.label !== "string" || !v.label.trim())
      return {
        valid: false,
        status: 400,
        message: "Each variant must have a non-empty label",
      };

    const trimmedLabel = v.label.trim();
    const lowerLabel = trimmedLabel.toLowerCase();
    if (seenLabels.has(lowerLabel))
      return {
        valid: false,
        status: 400,
        message: "Variant labels must be unique within a product",
      };
    seenLabels.add(lowerLabel);

    if (typeof v.stock !== "number" || !Number.isInteger(v.stock) || v.stock < 0)
      return {
        valid: false,
        status: 400,
        message: `Variant ${v.label} must have a non-negative integer stock`,
      };

    variantsData.push({ label: trimmedLabel, stock: v.stock });
  }

  // Validate single Default variant rule for toys in memory
  if (catLower === "toys" && (variantsData.length !== 1 || variantsData[0].label !== "Default"))
    return {
      valid: false,
      status: 400,
      message: "Toys category must have exactly one variant with label 'Default'",
    };

  // Assemble sanitized product fields
  const productData = {
    name: typeof name === "string" ? name.trim() : name,
    price,
    category: catLower,
    description,
    variants: variantsData,
  };

  // Attach and validate category-specific metadata fields
  if (catLower === "comics") {
    if (!Array.isArray(genres) || genres.length === 0)
      return {
        valid: false,
        status: 400,
        message: "Genres must be a non-empty array for comics",
      };

    const invalidGenre = genres.some(
      (g) => typeof g !== "string" || !g.trim() || !ALLOWED_GENRES.includes(g.trim().toLowerCase()),
    );
    if (invalidGenre)
      return {
        valid: false,
        status: 400,
        message: `Genres must only contain valid options: ${ALLOWED_GENRES.join(", ")}`,
      };

    const volumeValidation = validateComicVolumes(variantsData);
    if (!volumeValidation.valid)
      return {
        valid: false,
        status: 400,
        message: volumeValidation.message,
      };

    productData.genres = genres.map((g) => g.trim());
  } else if (catLower === "clothes") {
    const effectiveClothes = typeof clothesType === "string" ? clothesType.trim() : "";

    if (!effectiveClothes)
      return {
        valid: false,
        status: 400,
        message: "clothesType is required for clothes",
      };

    if (!CLOTHES_TYPES.includes(effectiveClothes.toLowerCase()))
      return {
        valid: false,
        status: 400,
        message: `Invalid clothesType. Valid options are: ${CLOTHES_TYPES.join(", ")}`,
      };

    productData.clothesType = effectiveClothes.toLowerCase();
  } else if (catLower === "shoes") {
    const effectiveShoe = typeof shoeType === "string" ? shoeType.trim() : "";

    if (!effectiveShoe)
      return {
        valid: false,
        status: 400,
        message: "shoeType is required for shoes",
      };

    if (!SHOE_TYPES.includes(effectiveShoe.toLowerCase()))
      return {
        valid: false,
        status: 400,
        message: `Invalid shoeType. Valid options are: ${SHOE_TYPES.join(", ")}`,
      };

    productData.shoeType = effectiveShoe.toLowerCase();
  } else if (catLower === "toys") {
    const effectiveToy = typeof toyType === "string" ? toyType.trim() : "";

    if (!effectiveToy)
      return {
        valid: false,
        status: 400,
        message: "toyType is required for toys",
      };

    if (!TOY_TYPES.includes(effectiveToy.toLowerCase()))
      return {
        valid: false,
        status: 400,
        message: `Invalid toyType. Valid options are: ${TOY_TYPES.join(", ")}`,
      };

    productData.toyType = effectiveToy.toLowerCase();
  }

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

// Values that go into Mongoose filters must be plain strings, never objects like {"$ne": null}
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isOptionalString = (value) => value === undefined || value === null || typeof value === "string";

const PASSWORD_MIN_LENGTH = 8;
// bcrypt ignores everything after 72 bytes, so a longer password would be silently cut short
const PASSWORD_MAX_BYTES = 72;

// Returns why a new password is not allowed, or null if it is fine
const passwordProblem = (password) => {
  if (typeof password !== "string")
    return "Password must be text.";
  if (password.length < PASSWORD_MIN_LENGTH)
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES)
    return `Password must be at most ${PASSWORD_MAX_BYTES} characters.`;
  return null;
};

// Makes user text match literally inside a RegExp, so it can't be a slow or invalid pattern
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Emails are stored lower-case, so "Casey@x.com" and "casey@x.com" are one account
const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const isValidEmail = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 40;

// Returns why a username is not allowed, or null if it is fine
const usernameProblem = (username) => {
  if (typeof username !== "string")
    return "Username must be text.";
  const length = username.trim().length;
  if (length < USERNAME_MIN_LENGTH || length > USERNAME_MAX_LENGTH)
    return `Username must be ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters.`;
  return null;
};

const MAX_ADDRESS_LENGTH = 300;

// A delivery address is free text, but it has to be text and of a sane length
const addressProblem = (address) => {
  if (typeof address !== "string" || !address.trim())
    return "Delivery address is required.";
  if (address.trim().length > MAX_ADDRESS_LENGTH)
    return `Delivery address must be at most ${MAX_ADDRESS_LENGTH} characters.`;
  return null;
};

const MAX_PAGE = 10000;

// Page numbers from the query string; anything that isn't a whole number from 1 to MAX_PAGE is null
const parsePage = (value) => {
  if (typeof value !== "string" && typeof value !== "number")
    return null;
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : null;
};

module.exports = {
  isNonEmptyString,
  isOptionalString,
  escapeRegex,
  normalizeEmail,
  isValidEmail,
  passwordProblem,
  usernameProblem,
  addressProblem,
  parsePage,
  validateProductData,
  validateCouponFields,
};

