const productModel = require("../models/product.model.js");
const dbConnect = require("../config/dbConnect.js");
const {
  extractPublicIdFromCloudinaryUrl,
  destroyCloudinaryImage,
} = require("../utils/cloudinary.utils.js");

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

    const { category, productTypes, price, sortBy, page, searchQuery } =
      constraints || {};

    if (!category || !page)
      return res.status(400).json({
        success: false,
        message: "Category and page is required",
      });

    // Validate price if provided: must strictly be a finite non-negative number
    if (price !== undefined && price !== null) {
      if (typeof price !== "number" || !Number.isFinite(price) || price < 0)
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number",
        });
    }

    // Connect to database only after in-memory validations succeed
    await dbConnect();

    // Build the query object
    const query = { category: category.toLowerCase() };

    // Add text search if searchQuery exists and is not empty
    if (searchQuery && searchQuery.trim() !== "")
      query.$text = { $search: searchQuery.trim() };

    // Add price filter only if price is greater than 0
    if (price > 0)
      query.price = { $lte: price };

    // Add filter to the query of the respective category
    // Note: Using case-insensitive regex matching to handle frontend lowercase conversion
    // Alternative optimization: normalize data storage to lowercase in database
    if (
      productTypes &&
      productTypes.length > 0 &&
      !productTypes.includes("all")
    ) {
      if (category === "comics") {
        // Use case-insensitive regex matching for genres
        const genreRegexArray = productTypes.map(
          (type) => new RegExp(`^${type}$`, "i"),
        );
        query.genres = { $in: genreRegexArray };
      } else if (category === "clothes" || category === "shoes") {
        // Use case-insensitive regex matching for merchType
        const merchTypeRegexArray = productTypes.map(
          (type) => new RegExp(`^${type}$`, "i"),
        );
        query.merchType = { $in: merchTypeRegexArray };
      } else if (category === "toys") {
        // Use case-insensitive regex matching for toyType
        const toyTypeRegexArray = productTypes.map(
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

    // Calculate pagination slice
    const itemsPerPage = 20;
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
    // Destructure required and optional product fields with fallback
    const { name, price, stock, category, description, merchType, toyType } = req.body || {};

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
      return res.status(400).json({
        success: false,
        message: "fields in data from client are missing",
      });

    // Validate numeric type for price (must strictly be a finite non-negative number)
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0)
      return res.status(400).json({ success: false, message: "Price must be a valid non-negative number" });

    // Validate category against allowed whitelist
    const validCategories = ["comics", "toys", "clothes", "shoes"];
    if (!validCategories.includes(category.toLowerCase()))
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${category}. Valid categories are: ${validCategories.join(", ")}`,
      });

    const catLower = category.toLowerCase();

    let stockData;
    // Handle single integer stock value for toys
    if (catLower === "toys") {
      if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)
        return res.status(400).json({ success: false, message: "Invalid stock value for toy" });
      stockData = stock;
    }

    let volumes, genres, sizes;
    // Handle variant-based stock and metadata for comics
    if (catLower === "comics") {
      // Parse stringified JSON stock if received from multipart forms
      try {
        stockData = typeof stock === "string" ? JSON.parse(stock) : stock;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid stock format: must be valid JSON" });
      }

      // Comics stock must be a plain object mapping volume names to numbers
      if (typeof stockData !== "object" || stockData === null || Array.isArray(stockData))
        return res.status(400).json({ success: false, message: "Stock must be an object for comics" });

      // Safely parse volumes and genres arrays if provided as JSON strings
      try {
        volumes = req.body.volumes !== undefined
          ? (typeof req.body.volumes === "string" ? JSON.parse(req.body.volumes) : req.body.volumes)
          : undefined;
        genres = req.body.genres !== undefined
          ? (typeof req.body.genres === "string" ? JSON.parse(req.body.genres) : req.body.genres)
          : undefined;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid volumes or genres format: must be valid JSON" });
      }

      // Validate that all entries in stockData have non-negative integer stock
      for (const [volume, volStock] of Object.entries(stockData)) {
        if (typeof volStock !== "number" || !Number.isInteger(volStock) || volStock < 0)
          return res.status(400).json({
            success: false,
            message: `Stock value missing or invalid for volume ${volume}`,
          });
      }

      // Validate that stock exists for each volume and is non-negative
      if (Array.isArray(volumes)) {
        for (const volume of volumes) {
          const volStock = stockData[volume];
          if (typeof volStock !== "number" || !Number.isInteger(volStock) || volStock < 0)
            return res.status(400).json({
              success: false,
              message: `Stock value missing or invalid for volume ${volume}`,
            });
        }
      }
    } else if (catLower === "clothes" || catLower === "shoes") {
      // Parse stringified JSON stock if received from multipart forms
      try {
        stockData = typeof stock === "string" ? JSON.parse(stock) : stock;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid stock format: must be valid JSON" });
      }

      // Clothes and shoes stock must be a plain object mapping sizes to numbers
      if (typeof stockData !== "object" || stockData === null || Array.isArray(stockData))
        return res.status(400).json({ success: false, message: "Stock must be an object for this category" });

      // Safely parse sizes array if provided as a JSON string
      try {
        sizes = req.body.sizes !== undefined
          ? (typeof req.body.sizes === "string" ? JSON.parse(req.body.sizes) : req.body.sizes)
          : undefined;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid sizes format: must be valid JSON" });
      }

      // Validate that all entries in stockData have non-negative integer stock
      for (const [size, sizeStock] of Object.entries(stockData)) {
        if (typeof sizeStock !== "number" || !Number.isInteger(sizeStock) || sizeStock < 0)
          return res.status(400).json({
            success: false,
            message: `Stock value missing or invalid for size ${size}`,
          });
      }

      // Validate that stock exists for each size and is non-negative
      if (Array.isArray(sizes)) {
        for (const size of sizes) {
          const sizeStock = stockData[size];
          if (typeof sizeStock !== "number" || !Number.isInteger(sizeStock) || sizeStock < 0)
            return res.status(400).json({
              success: false,
              message: `Stock value missing or invalid for size ${size}`,
            });
        }
      }
    }

    // Connect to database only after in-memory validations succeed
    await dbConnect();

    // Extract uploaded Cloudinary image metadata
    const imageUrl = req.file ? req.file.path : null;
    const imagePublicId = req.file
      ? extractPublicIdFromCloudinaryUrl(req.file.path)
      : null;

    // Generate unique product ID based on category prefix
    const generatedProductID = await generateProductID(category);

    // Assemble product document data
    const productData = {
      productID: generatedProductID,
      name,
      price,
      category,
      description,
      image: imageUrl,
      imagePublicId,
      stock: stockData,
    };

    // Attach category-specific fields to product document
    if (catLower === "comics") {
      productData.volumes = volumes;
      productData.genres = genres;
    } else if (
      catLower === "clothes" ||
      catLower === "shoes"
    ) {
      productData.sizes = sizes;
      productData.merchType = merchType;
    } else if (catLower === "toys")
      productData.toyType = toyType;

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
      error.message?.startsWith("Stock value missing or invalid") ||
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
    // Destructure required and optional product update fields with fallback
    const {
      _id,
      name,
      price,
      stock,
      category,
      description,
      merchType,
      toyType,
    } = req.body || {};

    // Validate product ID presence before processing update
    if (!_id)
      return res.status(400).json({
        success: false,
        message: "Product id is required",
      });

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
      return res.status(400).json({
        success: false,
        message: "fields in data from client are missing",
      });

    // Validate numeric type for price (must strictly be a finite non-negative number)
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0)
      return res.status(400).json({ success: false, message: "Price must be a valid non-negative number" });

    // Validate category against allowed whitelist
    const validCategories = ["comics", "toys", "clothes", "shoes"];
    const catLower = typeof category === "string" ? category.toLowerCase() : "";
    if (!validCategories.includes(catLower))
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${category}. Valid categories are: ${validCategories.join(", ")}`,
      });

    let stockData;
    // Handle single integer stock value for toys
    if (catLower === "toys") {
      if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)
        return res.status(400).json({ success: false, message: "Invalid stock value for toy" });
      stockData = stock;
    }

    let volumes, genres, sizes;
    // Handle variant-based stock and metadata for comics
    if (catLower === "comics") {
      // Parse stringified JSON stock if received from multipart forms
      try {
        stockData = typeof stock === "string" ? JSON.parse(stock) : stock;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid stock format: must be valid JSON" });
      }

      // Comics stock must be a plain object mapping volume names to numbers
      if (stockData !== undefined && (typeof stockData !== "object" || stockData === null || Array.isArray(stockData)))
        return res.status(400).json({ success: false, message: "Stock must be an object for comics" });

      // Safely parse volumes and genres arrays if provided as JSON strings
      try {
        volumes = req.body.volumes !== undefined
          ? (typeof req.body.volumes === "string" ? JSON.parse(req.body.volumes) : req.body.volumes)
          : undefined;
        genres = req.body.genres !== undefined
          ? (typeof req.body.genres === "string" ? JSON.parse(req.body.genres) : req.body.genres)
          : undefined;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid volumes or genres format: must be valid JSON" });
      }

      // Validate that all entries in stockData have non-negative integer stock
      if (typeof stockData === "object" && stockData !== null) {
        for (const [volume, volStock] of Object.entries(stockData)) {
          if (typeof volStock !== "number" || !Number.isInteger(volStock) || volStock < 0)
            return res.status(400).json({
              success: false,
              message: `Stock value missing or invalid for volume ${volume}`,
            });
        }
      }

      // Validate that stock exists for each volume and is non-negative
      if (Array.isArray(volumes) && typeof stockData === "object" && stockData !== null) {
        for (const volume of volumes) {
          const volStock = stockData[volume];
          if (typeof volStock !== "number" || !Number.isInteger(volStock) || volStock < 0)
            return res.status(400).json({
              success: false,
              message: `Stock value missing or invalid for volume ${volume}`,
            });
        }
      }
    } else if (catLower === "clothes" || catLower === "shoes") {
      // Parse stringified JSON stock if received from multipart forms
      try {
        stockData = typeof stock === "string" ? JSON.parse(stock) : stock;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid stock format: must be valid JSON" });
      }

      // Clothes and shoes stock must be a plain object mapping sizes to numbers
      if (stockData !== undefined && (typeof stockData !== "object" || stockData === null || Array.isArray(stockData)))
        return res.status(400).json({ success: false, message: "Stock must be an object for this category" });

      // Safely parse sizes array if provided as a JSON string
      try {
        sizes = req.body.sizes !== undefined
          ? (typeof req.body.sizes === "string" ? JSON.parse(req.body.sizes) : req.body.sizes)
          : undefined;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid sizes format: must be valid JSON" });
      }

      // Validate that all entries in stockData have non-negative integer stock
      if (typeof stockData === "object" && stockData !== null) {
        for (const [size, sizeStock] of Object.entries(stockData)) {
          if (typeof sizeStock !== "number" || !Number.isInteger(sizeStock) || sizeStock < 0)
            return res.status(400).json({
              success: false,
              message: `Stock value missing or invalid for size ${size}`,
            });
        }
      }

      // Validate that stock exists for each size and is non-negative
      if (Array.isArray(sizes) && typeof stockData === "object" && stockData !== null) {
        for (const size of sizes) {
          const sizeStock = stockData[size];
          if (typeof sizeStock !== "number" || !Number.isInteger(sizeStock) || sizeStock < 0)
            return res.status(400).json({
              success: false,
              message: `Stock value missing or invalid for size ${size}`,
            });
        }
      }
    }

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
      : req.body.image || existingProduct.image;
    const imagePublicId = req.file
      ? extractPublicIdFromCloudinaryUrl(req.file.path)
      : req.body.image
        ? extractPublicIdFromCloudinaryUrl(req.body.image)
        : existingProduct.imagePublicId ||
          extractPublicIdFromCloudinaryUrl(existingProduct.image);

    // Assemble updated product document data
    const productData = {
      name,
      price,
      category,
      description,
      image: imageUrl,
      imagePublicId,
      stock: stockData,
    };

    // Attach category-specific fields to product document
    if (catLower === "comics") {
      productData.volumes = volumes;
      productData.genres = genres;
    } else if (
      catLower === "clothes" ||
      catLower === "shoes"
    ) {
      productData.sizes = sizes;
      productData.merchType = merchType;
    } else if (catLower === "toys")
      productData.toyType = toyType;

    // Update and persist product document in database with validation
    const updatedProduct = await productModel.findByIdAndUpdate(
      _id,
      productData,
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
      error.message?.startsWith("Stock value missing or invalid") ||
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
