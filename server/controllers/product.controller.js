const mongoose = require("mongoose");
const productModel = require("../db/models/product.model.js");
const dbConnect = require("../db/dbConnect.js");
const {
  uploadImage,
  extractPublicIdFromCloudinaryUrl,
  destroyCloudinaryImage,
} = require("../utils/cloudinary.utils.js");
const { validateProductData, isOptionalString, escapeRegex } = require("../utils/validation.utils.js");
const { hasOperatorKey } = require("../middlewares/custom/rejectOperators.middleware.js");
const { INTERNAL_ERROR, clientError } = require("../utils/errors.utils.js");
const {
  ALLOWED_GENRES,
  CLOTHES_TYPES,
  SHOE_TYPES,
  TOY_TYPES,
} = require("../db/submodels/product/attributes.schema.js");

// Product-type filter per category: the field it filters on and the only values it accepts
const PRODUCT_TYPE_FILTERS = {
  comics: { field: "genres", allowed: ALLOWED_GENRES },
  clothes: { field: "clothesType", allowed: CLOTHES_TYPES },
  shoes: { field: "shoeType", allowed: SHOE_TYPES },
  toys: { field: "toyType", allowed: TOY_TYPES },
};
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;
const MAX_SEARCH_LENGTH = 100;

// Generate unique product ID based on category
// category: Product category (comics, toys, clothes, shoes)
// returns: Generated unique product ID
const generateProductID = async (category) => {
  try {
    // Define category prefixes
    const categoryPrefixes = {
      comics: "C",
      toys: "T",
      clothes: "CL",
      shoes: "S",
    };

    const prefix = categoryPrefixes[category.toLowerCase()];
    if (!prefix)
      throw new Error(`Invalid category: ${category}`);

    // Find all existing product IDs for this category
    const existingProducts = await productModel
      .find({
        productID: { $regex: `^${prefix}\\d+$` },
      })
      .select("productID")
      .sort({ productID: 1 });

    // Extract numbers and find the next available ID
    let nextNumber = 1;
    const existingNumbers = existingProducts
      .map((product) => {
        const match = product.productID.match(new RegExp(`^${prefix}(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter((num) => num > 0)
      .sort((a, b) => a - b);

    // Find the first gap or use the next sequential number
    for (let i = 0; i < existingNumbers.length; i++) {
      if (existingNumbers[i] !== nextNumber)
        break;
      nextNumber++;
    }

    const generatedID = `${prefix}${nextNumber}`;

    // Double-check uniqueness (handle race conditions)
    const existingProduct = await productModel.findOne({
      productID: generatedID,
    });
    if (existingProduct)
      // If somehow the ID exists, recursively try again
      return await generateProductID(category);

    return generatedID;
  } catch (error) {
    console.error("Error generating product ID:", error);
    throw error;
  }
};

const getProducts = async (req, res) => {
  try {
    // Destructure the productConstraints from the request query
    const productConstraints = req.query?.productConstraints;
    if (!productConstraints)
      return res.status(400).json({
        success: false,
        message: "Category and page is required",
      });

    let constraints;
    if (typeof productConstraints === "object" && productConstraints !== null)
      constraints = productConstraints;
    else {
      try {
        constraints = JSON.parse(productConstraints);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid product constraints",
        });
      }
    }

    // productConstraints is JSON inside the query string, so the app-wide operator check can't see inside it
    if (hasOperatorKey(constraints))
      return res.status(400).json({ success: false, message: "Invalid product constraints" });

    const { category, productTypes, price, sortBy, page, searchQuery, limit } =
      constraints || {};

    if (!isOptionalString(searchQuery) || searchQuery?.length > MAX_SEARCH_LENGTH)
      return res.status(400).json({
        success: false,
        message: `Search query must be text of at most ${MAX_SEARCH_LENGTH} characters`,
      });

    if (!category || !page)
      return res.status(400).json({
        success: false,
        message: "Category and page is required",
      });

    if (!Number.isInteger(page) || page < 1)
      return res.status(400).json({ success: false, message: "Page must be a positive integer" });

    // Capped so one request can't pull the whole catalog
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE))
      return res.status(400).json({
        success: false,
        message: `Limit must be an integer from 1 to ${MAX_PAGE_SIZE}`,
      });

    // Validate price if provided: must strictly be a finite non-negative number
    if (price !== undefined && price !== null && (typeof price !== "number" || !Number.isFinite(price) || price < 0))
      return res.status(400).json({
        success: false,
        message: "Price must be a valid non-negative number",
      });

    // Connect to database only after in-memory validations succeed
    await dbConnect();

    const catLower = typeof category === "string" ? category.toLowerCase() : "";

    // Build the query object
    const query = { category: catLower };

    // Add text search if searchQuery exists and is not empty
    if (searchQuery && searchQuery.trim() !== "")
      query.$text = { $search: searchQuery.trim() };

    // Add price filter only if price is greater than 0
    if (price > 0)
      query.price = { $lte: price };

    const rawProductTypes = Array.isArray(productTypes)
      ? productTypes
      : typeof productTypes === "string" && productTypes.trim()
        ? [productTypes.trim()]
        : [];

    // Only values from the category's allow-list reach the query; anything else ("all", stale
    // filters from another category, attack strings) is ignored. Values are escaped as well.
    const typeFilter = PRODUCT_TYPE_FILTERS[catLower];
    const selectedTypes = typeFilter
      ? [...new Set(rawProductTypes
        .filter((type) => typeof type === "string")
        .map((type) => type.trim().toLowerCase())
        .filter((type) => typeFilter.allowed.includes(type)))]
      : [];

    // Case-insensitive, because stored genres keep the case they were entered with
    if (selectedTypes.length > 0)
      query[typeFilter.field] = {
        $in: selectedTypes.map((type) => new RegExp(`^${escapeRegex(type)}$`, "i")),
      };

    // Define sorting options
    const sortOptions = {};
    if (sortBy) {
      switch (sortBy) {
        case "popular":
        case "price-high":
          sortOptions.price = -1; // Sort by price descending
          break;
        case "price-low":
          sortOptions.price = 1; // Sort by price ascending
          break;
        default:
          break;
      }
    }

    // Calculate pagination slice (default 24 items per page to evenly fill 2, 3, 4, and 6 column grids)
    const itemsPerPage = limit ?? DEFAULT_PAGE_SIZE;
    const startIndex = (page - 1) * itemsPerPage;

    // Count and page in parallel: one round trip of waiting instead of two
    const [totalProducts, currPageProducts] = await Promise.all([
      productModel.countDocuments(query),
      productModel
        .find(query)
        .select("-imagePublicId -__v")
        .sort(sortOptions)
        .skip(startIndex)
        .limit(itemsPerPage)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    // Public catalog data: the browser may reuse it for 30 seconds (back/forward, revisits).
    // `private` keeps shared caches out, because the CORS headers differ per client origin.
    res.set("Cache-Control", "private, max-age=30");
    res
      .status(200)
      .json({ success: true, currPageProducts, totalPages, totalProducts });
  } catch (error) {
    console.error("Error while fetching products:", error.message);
    res.status(500).json({ success: false, message: INTERNAL_ERROR });
  }
};

// One product, for product pages opened from a link or a reload
const getProductById = async (req, res) => {
  try {
    const _id = req.params?.productId;
    if (!mongoose.isValidObjectId(_id))
      return res.status(400).json({ success: false, message: "Invalid product id" });

    await dbConnect();
    const product = await productModel.findById(_id).select("-imagePublicId -__v").lean();
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.set("Cache-Control", "private, max-age=30");
    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ success: false, message: INTERNAL_ERROR });
  }
};

const createProduct = async (req, res) => {
  try {
    const isMultipart = Boolean(
      req?.is?.("multipart/form-data") ||
      req?.file ||
      (typeof req?.headers?.["content-type"] === "string" &&
        req.headers["content-type"].includes("multipart/form-data")),
    );

    // Validate and parse incoming product fields in memory before connecting to database
    const validation = validateProductData(req.body, { isMultipart });
    if (!validation.valid)
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });

    if (!req.file)
      return res.status(400).json({ success: false, message: "A product image (JPG, PNG or WebP) is required" });

    // Connect to database only after in-memory validations succeed
    await dbConnect();

    // Generate unique product ID based on category prefix
    const generatedProductID = await generateProductID(validation.data.category);

    // Uploaded only now that the request is known to be valid
    const uploaded = await uploadImage(req.file.buffer, {
      folder: `anime-alley-products/${validation.data.category}`,
      maxSize: 800,
    });

    // Assemble product document data
    const productData = {
      ...validation.data,
      productID: generatedProductID,
      image: uploaded.url,
      imagePublicId: uploaded.publicId,
    };

    // Create and persist product document in database
    const newProduct = await productModel.create(productData);

    res.status(201).json({
      success: true,
      message: `Product created successfully with ID: ${generatedProductID}`,
      product: newProduct,
    });
  } catch (error) {
    // Bad input gets a safe 400/409; our own "Invalid category" message is safe to show
    const known = clientError(error) ||
      (error.message?.startsWith("Invalid category") && { status: 400, message: error.message });
    if (known)
      return res.status(known.status).json({ success: false, message: known.message });

    console.error("Error creating product:", error);
    res.status(500).json({ success: false, message: INTERNAL_ERROR });
  }
};

const updateProduct = async (req, res) => {
  try {
    const _id = req.params?.productId;
    if (!mongoose.isValidObjectId(_id))
      return res.status(400).json({ success: false, message: "Invalid product id" });

    const isMultipart = Boolean(
      req?.is?.("multipart/form-data") ||
      req?.file ||
      (typeof req?.headers?.["content-type"] === "string" &&
        req.headers["content-type"].includes("multipart/form-data")),
    );

    // Validate and parse incoming product fields in memory before connecting to database
    const validation = validateProductData(req.body, { isMultipart });
    if (!validation.valid)
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });

    // Connect to database only after in-memory validations succeed
    await dbConnect();

    // Verify existing product document before updating
    const existingProduct = await productModel.findById(_id);

    if (!existingProduct)
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });

    // The image only changes through an upload. An image URL in the body is ignored: it would let a
    // request point the product (and its later cleanup) at any other Cloudinary asset.
    const uploaded = req.file
      ? await uploadImage(req.file.buffer, { folder: `anime-alley-products/${validation.data.category}`, maxSize: 800 })
      : null;
    const oldPublicId = existingProduct.imagePublicId || extractPublicIdFromCloudinaryUrl(existingProduct.image);
    const imageUrl = uploaded ? uploaded.url : existingProduct.image;
    const imagePublicId = uploaded ? uploaded.publicId : oldPublicId;

    // Assemble updated product document data
    const productData = {
      ...validation.data,
      image: imageUrl,
      imagePublicId,
    };

    // Clean up inactive category fields when category attributes are updated
    const unsetFields = {};
    if (validation.data.category !== "comics") unsetFields.genres = 1;
    if (validation.data.category !== "clothes") unsetFields.clothesType = 1;
    if (validation.data.category !== "shoes") unsetFields.shoeType = 1;
    if (validation.data.category !== "toys") unsetFields.toyType = 1;

    const updateDoc = { $set: productData };
    if (Object.keys(unsetFields).length > 0)
      updateDoc.$unset = unsetFields;

    // Update and persist product document in database with validation
    const updatedProduct = await productModel.findByIdAndUpdate(
      _id,
      updateDoc,
      { new: true, runValidators: true, context: "query" },
    );

    // Clean up the old Cloudinary image once the new one is saved
    if (uploaded && oldPublicId && oldPublicId !== imagePublicId)
      await destroyCloudinaryImage(existingProduct.image, oldPublicId);

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    // Bad input gets a safe 400/409; our own "Invalid category" message is safe to show
    const known = clientError(error) ||
      (error.message?.startsWith("Invalid category") && { status: 400, message: error.message });
    if (known)
      return res.status(known.status).json({ success: false, message: known.message });

    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: INTERNAL_ERROR });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const _id = req.params?.productId;
    if (!mongoose.isValidObjectId(_id))
      return res.status(400).json({ success: false, message: "Invalid product id" });

    // Connect to database only after in-memory validation succeeds
    await dbConnect();

    const deletedProduct = await productModel.findByIdAndDelete(_id);

    if (!deletedProduct)
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });

    // Extract Cloudinary public ID and clean up associated image asset
    const publicId =
      deletedProduct.imagePublicId ||
      extractPublicIdFromCloudinaryUrl(deletedProduct.image);

    if (publicId)
      await destroyCloudinaryImage(deletedProduct.image, publicId);

    res.status(200).json({
      message: `Product with ID: ${deletedProduct.productID} has been deleted!`,
      success: true,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: INTERNAL_ERROR,
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  deleteProduct,
  updateProduct,
};
