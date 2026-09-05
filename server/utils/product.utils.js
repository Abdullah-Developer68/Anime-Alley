// Validate and parse incoming product data shared across product creation and updates
const validateProductData = (body) => {
  // Destructure required and optional product fields with empty object fallback
  const {
    name,
    price,
    variants,
    category,
    description,
    merchType,
    toyType,
    genres: rawGenres,
  } = body || {};

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

  // Process explicit variants array
  let parsedVariants = variants;
  if (typeof parsedVariants === "string") {
    try {
      parsedVariants = JSON.parse(parsedVariants);
    } catch {
      return {
        valid: false,
        status: 400,
        message: "Invalid variants format: must be valid JSON",
      };
    }
  }

  if (!Array.isArray(parsedVariants) || parsedVariants.length === 0)
    return {
      valid: false,
      status: 400,
      message: "Variants must be a non-empty array",
    };

  const variantsData = [];
  for (const v of parsedVariants) {
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

  // Parse genres if provided in body
  let genres;
  if (rawGenres !== undefined) {
    try {
      genres = typeof rawGenres === "string" ? JSON.parse(rawGenres) : rawGenres;
    } catch {
      // Keep as is if not valid JSON
    }
  }

  // Assemble sanitized product fields
  const productData = {
    name,
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

module.exports = { validateProductData };
