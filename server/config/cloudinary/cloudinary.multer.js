const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary.config.js");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Check if upload is a user picture (outside the products folder)
    const isUserUpload =
      file.fieldname === "profilePic" ||
      file.fieldname === "avatar" ||
      req.originalUrl?.toLowerCase().includes("/user") ||
      req.baseUrl?.toLowerCase().includes("/user") ||
      req.path?.toLowerCase().includes("/user");

    if (isUserUpload) {
      const userId =
        req.params?.userId ||
        req.user?._id?.toString() ||
        req.user?.id ||
        req.body?.userId ||
        "general";

      return {
        folder: `anime-alley-users/${userId}`,
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 500, height: 500, crop: "limit" }],
      };
    }

    // Otherwise, handle product upload into category-specific folders
    let category = req.body?.category
      ? String(req.body.category).toLowerCase().trim()
      : "";

    // If category wasn't directly in req.body during an update, check database using _id or productID
    if (!category && (req.body?._id || req.params?.productID)) {
      try {
        const productModel = require("../../db/models/product.model.js");
        const query = req.body?._id
          ? { _id: req.body._id }
          : { productID: req.params.productID };
        const existing = await productModel
          .findOne(query)
          .select("category")
          .lean();
        if (existing?.category) {
          category = existing.category.toLowerCase().trim();
        }
      } catch (e) {
        // Fallback gracefully if database lookup fails
      }
    }

    const validCategories = ["comics", "clothes", "shoes", "toys"];
    let folder = "anime-alley-products";

    if (validCategories.includes(category)) {
      folder = `anime-alley-products/${category}`;
    }

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      // If the image is larger than the specified dimensions then crop: "limit"
      // will resize them to fit in 800 x 800 without affecting the aspect ratio
      transformation: [{ width: 800, height: 800, crop: "limit" }],
    };
  },
});

module.exports = storage;
