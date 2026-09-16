// server/db/submodels/product/variant.schema.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { resolveCategory } = require("./attributes.schema.js");

// Subdocument Schema for individual variant items
const variantItemSchema = new Schema(
  {
    label: {
      type: String,
      required: [true, "Variant label is required"],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Variant stock is required"],
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Stock must be an integer",
      },
      default: 0,
    },
  },
  { _id: false },
);

// Encapsulated Array-level Validator Functions
const validateVariantsNonEmpty = (variants) => {
  return Array.isArray(variants) && variants.length > 0;
};

const validateUniqueLabels = (variants) => {
  if (!Array.isArray(variants)) return false;
  const labels = variants.map((v) => (typeof v?.label === "string" ? v.label.trim().toLowerCase() : ""));
  return new Set(labels).size === labels.length;
};

const validateToysSingleDefaultRule = function (variants) {
  const category = resolveCategory.call(this);
  if (category === "toys") {
    if (!Array.isArray(variants) || variants.length !== 1) return false;
    return variants[0]?.label === "Default";
  }
  return true;
};

// Encapsulated Field Export
const variantsField = {
  type: [variantItemSchema],
  required: [true, "Variants are required"],
  validate: [
    {
      validator: validateVariantsNonEmpty,
      message: "At least one variant is required",
    },
    {
      validator: validateUniqueLabels,
      message: "Variant labels must be unique within a product",
    },
    {
      validator: validateToysSingleDefaultRule,
      message: "Toys category must have exactly one variant with label 'Default'",
    },
  ],
};

module.exports = {
  variantItemSchema,
  variantsField,
  validateVariantsNonEmpty,
  validateUniqueLabels,
  validateToysSingleDefaultRule,
};
