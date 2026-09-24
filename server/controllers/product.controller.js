const productModel = require("../db/models/product.model.js");
const dbConnect = require("../db/dbConnect.js");
const {
  extractPublicIdFromCloudinaryUrl,
  destroyCloudinaryImage,
} = require("../utils/cloudinary.utils.js");
const { validateProductData } = require("../utils/validation.utils.js");

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

    const { category, productTypes, price, sortBy, page, searchQuery, limit } =
      constraints || {};

    if (!category || !page)
      return res.status(400).json({
        success: false,
        message: "Category and page is required",
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

    const normalizedProductTypes = rawProductTypes
      .filter((type) => typeof type === "string" && type.trim() && type.trim().toLowerCase() !== "all")
      .map((type) => type.trim());

    // Add filter to the query of the respective category
    // Note: Using case-insensitive regex matching to handle frontend lowercase conversion
    // Alternative optimization: normalize data storage to lowercase in database
    if (normalizedProductTypes.length > 0) {
      if (catLower === "comics") {
        // Use case-insensitive regex matching for genres
        const genreRegexArray = normalizedProductTypes.map(
          (type) => new RegExp(`^${type}$`, "i"),
        );
        query.genres = { $in: genreRegexArray };
      } else if (catLower === "clothes") {
        // Use case-insensitive regex matching for clothesType
        const clothesTypeRegexArray = normalizedProductTypes.map(
          (type) => new RegExp(`^${type}$`, "i"),
        );
        query.clothesType = { $in: clothesTypeRegexArray };
      } else if (catLower === "shoes") {
        // Use case-insensitive regex matching for shoeType
        const shoeTypeRegexArray = normalizedProductTypes.map(
          (type) => new RegExp(`^${type}$`, "i"),
        );
        query.shoeType = { $in: shoeTypeRegexArray };
      } else if (catLower === "toys") {
        // Use case-insensitive regex matching for toyType
        const toyTypeRegexArray = normalizedProductTypes.map(
          (type) => new RegExp(`^${type}$`, "i"),
        );
        query.toyType = { $in: toyTypeRegexArray };
      }
    }

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
    const itemsPerPage =
      Number.isInteger(Number(limit)) && Number(limit) > 0
        ? Number(limit)
        : 24;
    const startIndex = (page - 1) * itemsPerPage;

    // Get the total count of products matching the query
    const totalProducts = await productModel.countDocuments(query);

    // Get paginated products with the filters and sorting
    const currPageProducts = await productModel
      .find(query)
      .sort(sortOptions)
      .skip(startIndex)
      .limit(itemsPerPage);

    // Calculate total pages and return paginated product list
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    res
      .status(200)
      .json({ success: true, currPageProducts, totalPages, totalProducts });
  } catch (error) {
    console.error("Error while fetching products:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
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

    // Connect to database only after in-memory validations succeed
    await dbConnect();

    // Extract uploaded Cloudinary image metadata
    const imageUrl = req.file ? req.file.path : null;
    const imagePublicId = req.file
      ? extractPublicIdFromCloudinaryUrl(req.file.path)
      : null;

    // Generate unique product ID based on category prefix
    const generatedProductID = await generateProductID(validation.data.category);

    // Assemble product document data
    const productData = {
      ...validation.data,
      productID: generatedProductID,
      image: imageUrl,
      imagePublicId,
    };

    // Create and persist product document in database
    const newProduct = await productModel.create(productData);

    res.status(201).json({
      success: true,
      message: `Product created successfully with ID: ${generatedProductID}`,
      product: newProduct,
    });
  } catch (error) {
    // Return early 400 response for client-side input and casting errors
    if (
      error.name === "ValidationError" ||
      error.name === "CastError" ||
      error.message?.startsWith("Invalid category")
    )
      return res.status(400).json({
        success: false,
        message: error.message,
      });

    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    // Extract product ID from body with optional chaining
    const _id = req.body?._id;

    // Validate product ID presence before processing update
    if (!_id)
      return res.status(400).json({
        success: false,
        message: "Product id is required",
      });

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

    // Determine new image URL and public ID from uploaded file or existing payload
    const imageUrl = req.file
      ? req.file.path
      : req.body?.image || existingProduct.image;
    const imagePublicId = req.file
      ? extractPublicIdFromCloudinaryUrl(req.file.path)
      : req.body?.image
        ? extractPublicIdFromCloudinaryUrl(req.body.image)
        : existingProduct.imagePublicId ||
          extractPublicIdFromCloudinaryUrl(existingProduct.image);

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

    // Clean up old Cloudinary image if a new image was uploaded
    if (req.file) {
      const oldPublicId =
        existingProduct.imagePublicId ||
        extractPublicIdFromCloudinaryUrl(existingProduct.image);

      if (oldPublicId && oldPublicId !== imagePublicId)
        await destroyCloudinaryImage(existingProduct.image, oldPublicId);
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    // Return early 400 response for client-side input and casting errors
    if (
      error.name === "ValidationError" ||
      error.name === "CastError" ||
      error.message?.startsWith("Invalid category")
    )
      return res.status(400).json({
        success: false,
        message: error.message,
      });

    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    // Extract productID with optional chaining
    const productID = req.body?.productID;

    // Reject missing or empty whitespace product ID
    if (!productID || (typeof productID === "string" && !productID.trim()))
      return res.status(400).json({ message: "The productID is required!" });

    // Connect to database only after in-memory validation succeeds
    await dbConnect();

    // Find and delete the product document by unique productID
    const deletedProduct = await productModel.findOneAndDelete({ productID });

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
      message: `Product with ID: ${productID} has been deleted!`,
      success: true,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
  deleteProduct,
  updateProduct,
};
