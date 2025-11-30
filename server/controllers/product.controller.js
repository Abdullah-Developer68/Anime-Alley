const productModel = require("../models/product.model.js");
const dbConnect = require("../config/dbConnect.js");

/**
 * Generate unique product ID based on category
 * @param {string} category - Product category (comics, toys, clothes, shoes)
 * @returns {Promise<string>} - Generated unique product ID
 */
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
    if (!prefix) {
      throw new Error(`Invalid category: ${category}`);
    }

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
      if (existingNumbers[i] !== nextNumber) {
        break;
      }
      nextNumber++;
    }

    const generatedID = `${prefix}${nextNumber}`;

    // Double-check uniqueness (handle race conditions)
    const existingProduct = await productModel.findOne({
      productID: generatedID,
    });
    if (existingProduct) {
      // If somehow the ID exists, recursively try again
      return await generateProductID(category);
    }

    return generatedID;
  } catch (error) {
    console.error("Error generating product ID:", error);
    throw error;
  }
};

const getProducts = async (req, res) => {
  await dbConnect();
  console.log("executed before connecting to the database.");
  try {
    // Destructure the productConstraints from the request query
    const { productConstraints } = req.query;
    const constraints = JSON.parse(productConstraints);

    const { category, productTypes, price, sortBy, page, searchQuery } =
      constraints;

    if (!category || !page) {
      return res.status(400).json({
        success: false,
        message: "Category and page is required",
      });
    }

    // Build the query object
    const query = { category: category.toLowerCase() };

    // Add text search if searchQuery exists and is not empty
    if (searchQuery && searchQuery.trim() !== "") {
      query.$text = { $search: searchQuery.trim() };
    }

    // Add price filter if price exists
    if (price) {
      query.price = { $lte: price };
    }

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

    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    res
      .status(200)
      .json({ success: true, currPageProducts, totalPages, totalProducts });
  } catch (error) {
    console.error("Error while fetching products:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error mongodb can not connect!",
      error: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  await dbConnect();
  try {
    // Cloudinary returns the URL in req.file.path
    const imageUrl = req.file ? req.file.path : null;

    // Remove productID from required fields validation since it's auto-generated
    if (
      !req.body.name ||
      !req.body.price ||
      !req.body.stock ||
      !req.body.category
    ) {
      console.error("Missing required fields:", req.body);
      return res.status(400).json({
        success: false,
        message: "fields in data from client are missing",
      });
    }

    // Validate category before generating ID
    const validCategories = ["comics", "toys", "clothes", "shoes"];
    if (!validCategories.includes(req.body.category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${
          req.body.category
        }. Valid categories are: ${validCategories.join(", ")}`,
      });
    }

    // Generate unique product ID based on category
    const generatedProductID = await generateProductID(req.body.category);

    const productData = {
      productID: generatedProductID, // Use auto-generated ID
      name: req.body.name,
      price: parseFloat(req.body.price),
      category: req.body.category,
      description: req.body.description,
      image: imageUrl, // Store the Cloudinary URL
      stock: JSON.parse(req.body.stock),
    };

    // Add category-specific fields
    if (req.body.category === "comics") {
      const volumes = JSON.parse(req.body.volumes);
      const genres = JSON.parse(req.body.genres);

      productData.volumes = volumes;
      productData.genres = genres;

      // Validate that stock exists for each volume
      volumes.forEach((volume) => {
        if (typeof productData.stock[volume] === "undefined") {
          throw new Error(`Stock value missing for volume ${volume}`);
        }
      });
    } else if (
      req.body.category === "clothes" ||
      req.body.category === "shoes"
    ) {
      const sizes = JSON.parse(req.body.sizes);
      productData.sizes = sizes;
      productData.merchType = req.body.merchType;

      // Validate that stock exists for each size
      sizes.forEach((size) => {
        if (typeof productData.stock[size] === "undefined") {
          throw new Error(`Stock value missing for size ${size}`);
        }
      });
    } else if (req.body.category === "toys") {
      productData.toyType = req.body.toyType;

      // For toys, stock should be a number
      if (typeof productData.stock !== "number") {
        throw new Error("Invalid stock value for toy");
      }
    }

    const newProduct = await productModel.create(productData);

    res.status(201).json({
      success: true,
      message: `Product created successfully with ID: ${generatedProductID}`,
      product: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateProduct = async (req, res) => {
  await dbConnect();
  try {
    let imageUrl;
    if (req.file) {
      // Use Cloudinary URL if a new image is uploaded
      imageUrl = req.file.path;
    } else if (req.body.image) {
      // Use the existing image URL if not
      imageUrl = req.body.image;
    } else {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }
    // For updates, we need the productID to identify which product to update
    // But we don't generate a new one - we preserve the existing ID
    if (
      !req.body.productID ||
      !req.body.name ||
      !req.body.price ||
      !req.body.stock ||
      !req.body.category
    ) {
      console.error("Missing required fields:", req.body);
      return res.status(400).json({
        success: false,
        message: "fields in data from client are missing",
      });
    }

    // Preserve the existing productID for updates
    const productData = {
      productID: req.body.productID, // Keep existing ID
      name: req.body.name,
      price: parseFloat(req.body.price),
      category: req.body.category,
      description: req.body.description,
      image: imageUrl,
      stock: JSON.parse(req.body.stock),
    };

    // Add category-specific fields
    if (req.body.category === "comics") {
      const volumes = JSON.parse(req.body.volumes);
      const genres = JSON.parse(req.body.genres);

      productData.volumes = volumes;
      productData.genres = genres;

      // Validate that stock exists for each volume
      volumes.forEach((volume) => {
        if (typeof productData.stock[volume] === "undefined") {
          throw new Error(`Stock value missing for volume ${volume}`);
        }
      });
    } else if (
      req.body.category === "clothes" ||
      req.body.category === "shoes"
    ) {
      const sizes = JSON.parse(req.body.sizes);
      productData.sizes = sizes;
      productData.merchType = req.body.merchType;

      // Validate that stock exists for each size
      sizes.forEach((size) => {
        if (typeof productData.stock[size] === "undefined") {
          throw new Error(`Stock value missing for size ${size}`);
        }
      });
    } else if (req.body.category === "toys") {
      productData.toyType = req.body.toyType;

      // For toys, stock should be a number
      if (typeof productData.stock !== "number") {
        throw new Error("Invalid stock value for toy");
      }
    }

    const updatedProduct = await productModel.findOneAndUpdate(
      { productID: productData.productID },
      productData,
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const verifyStock = async (req, res) => {
  await dbConnect();
  try {
    const { itemName, selectedVariant, itemQuantity } = req.query;

    if (!itemName || !selectedVariant || !itemQuantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    const product = await productModel.findOne({ name: itemName });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if the variant exists in the product
    let stockAvailable = 0;
    if (product.category === "comics") {
      if (!product.volumes?.includes(selectedVariant)) {
        return res.status(400).json({
          success: false,
          message: "Invalid volume selected",
        });
      }
      stockAvailable = product.stock[selectedVariant] || 0;
    } else if (product.category === "clothes" || product.category === "shoes") {
      // Changed from size to sizes
      if (!product.sizes?.includes(selectedVariant)) {
        return res.status(400).json({
          success: false,
          message: "Invalid size selected",
        });
      }
      stockAvailable = product.stock[selectedVariant] || 0;
    } else {
      // For toys and other categories with simple stock
      stockAvailable = product.stock;
    }

    return res.status(200).json({
      success: true,
      stockAvailable,
      isAvailable: stockAvailable >= parseInt(itemQuantity),
      message:
        stockAvailable >= parseInt(itemQuantity)
          ? "Stock available"
          : `Only ${stockAvailable} items available`,
    });
  } catch (error) {
    console.error("Error verifying stock:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteProduct = async (req, res) => {
  await dbConnect();
  const { productID } = req.body;

  if (!productID) {
    return res.status(400).json({ message: "The productID is required!" });
  }

  const result = await productModel.deleteOne({ productID });

  if (!result.acknowledged) {
    return res
      .status(500)
      .json({ message: "Error occured while deleting the document!" });
  }
  res.status(200).json({
    message: `Product with ID: ${productID} has been deleted!`,
    success: true,
  });
};

module.exports = {
  getProducts,
  createProduct,
  verifyStock,
  deleteProduct,
  updateProduct,
};
