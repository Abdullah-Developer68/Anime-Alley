const mongoose = require("mongoose");
const { Schema } = mongoose;
const { getContextValue } = require("../utils/mongoose.utils.js");

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
  genres: {
    type: [String],
    required: function () {
      return this.category === "comics";
    },
  },
  //variants section in productDes.jx
  sizes: {
    type: [String],
    required: function () {
      return this.category === "clothes" || this.category === "shoes";
    },
  },
  volumes: {
    type: [String],
    required: function () {
      return this.category === "comics";
    },
  },
  stock: {
    type: Schema.Types.Mixed, // allows mongodb to accept multiple data types
    required: true,
    validate: {
      validator: function (value) {
        const category = getContextValue(this, "category");
        const volumes = getContextValue(this, "volumes") || [];
        const sizes = getContextValue(this, "sizes") || [];

        if (category === "comics") {
          const isObject =
            value && typeof value === "object" && !Array.isArray(value);
          const hasValidVolumes =
            isObject &&
            Object.keys(value).every(
              (key) => volumes.includes(key) && Number.isInteger(value[key]),
            );
          return isObject && hasValidVolumes;
        } else if (category === "clothes" || category === "shoes") {
          const isObject =
            value && typeof value === "object" && !Array.isArray(value);
          const isValidSizes =
            isObject &&
            Object.keys(value).every(
              (key) => sizes.includes(key) && Number.isInteger(value[key]),
            );
          return isObject && isValidSizes;
        } else
          return typeof value === "number" && Number.isInteger(value);
      },
      message: "Invalid stock format for this category",
    },
  },
  //for filter bar
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
