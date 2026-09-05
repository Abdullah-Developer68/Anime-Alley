const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define subdocument schema for unified product variants
const variantSchema = new Schema(
  {
    label: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema({
  productID: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
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
  },
  // Unified variants array replacing polymorphic stock, sizes, and volumes
  variants: {
    type: [variantSchema],
    required: true,
  },
  genres: {
    type: [String],
    required: function () {
      return this.category === "comics";
    },
  },
  // For filter bar
  merchType: {
    type: String,
    required: function () {
      return this.category === "clothes" || this.category === "shoes";
    },
  },
  toyType: {
    type: String,
    required: function () {
      return this.category === "toys";
    },
  },
});

// Add text index on searchable fields
productSchema.index(
  {
    name: "text",
    category: "text",
  },
  {
    weights: { name: 5, category: 4 },
    name: "ProductSearchIndex",
  },
);

module.exports = mongoose.model("products", productSchema);

