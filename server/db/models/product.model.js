// server/db/models/product.model.js
const mongoose = require("mongoose");
const { attributesField } = require("../submodels/product/attributes.schema.js");
const { variantsField } = require("../submodels/product/variant.schema.js");

const productSchema = new mongoose.Schema({
  productID: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String,
    required: true,
  },
  imagePublicId: {
    type: String,
  },
  category: {
    type: String,
    required: true,
    enum: ["comics", "toys", "clothes", "shoes"],
    lowercase: true,
  },
  variants: variantsField,
  ...attributesField,
});

// Search Index
productSchema.index(
  { name: "text", category: "text" },
  { weights: { name: 5, category: 4 }, name: "ProductSearchIndex" },
);

module.exports = mongoose.model("products", productSchema);
