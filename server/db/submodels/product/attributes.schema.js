// server/db/submodels/product/attributes.schema.js

// Resolves category from document instance or mongoose update query context
const resolveCategory = function () {
  let cat;
  if (this?.category) cat = this.category;
  else if (typeof this?.getUpdate === "function") {
    const update = this.getUpdate() || {};
    cat = update.category || update.$set?.category;
  }
  return typeof cat === "string" ? cat.toLowerCase() : cat;
};

// Whitelists & Enums
const ALLOWED_GENRES = ["action", "adventure", "comedy", "drama", "fantasy"];
const CLOTHES_TYPES = ["t-shirt", "jacket", "pants"];
const SHOE_TYPES = ["sneakers", "boots"];
const TOY_TYPES = ["action-figure", "car", "doll"];

// Sanitizes empty string to undefined so optional or inactive fields do not trigger enum validation
const sanitizeEmptyString = (val) => {
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
};

// Declarative validator for comics genres
const validateGenresList = (val) => {
  if (!Array.isArray(val) || val.length === 0) return false;
  return val.every(
    (g) => typeof g === "string" && g.trim().length > 0 && ALLOWED_GENRES.includes(g.trim().toLowerCase()),
  );
};

const genres = {
  type: [String],
  required: [
    function () { return resolveCategory.call(this) === "comics"; },
    "Genres are required for comics products",
  ],
  validate: {
    validator: function (val) {
      if (resolveCategory.call(this) === "comics" || (Array.isArray(val) && val.length > 0))
        return validateGenresList(val);
      return true;
    },
    message: `Genres must be a non-empty array with valid options: ${ALLOWED_GENRES.join(", ")}`,
  },
};

const clothesType = {
  type: String,
  trim: true,
  lowercase: true,
  enum: {
    values: CLOTHES_TYPES,
    message: `clothesType must be one of: ${CLOTHES_TYPES.join(", ")}`,
  },
  required: [
    function () { return resolveCategory.call(this) === "clothes"; },
    "clothesType is required for clothes products",
  ],
  set: sanitizeEmptyString,
};

const shoeType = {
  type: String,
  trim: true,
  lowercase: true,
  enum: {
    values: SHOE_TYPES,
    message: `shoeType must be one of: ${SHOE_TYPES.join(", ")}`,
  },
  required: [
    function () { return resolveCategory.call(this) === "shoes"; },
    "shoeType is required for shoes products",
  ],
  set: sanitizeEmptyString,
};

const toyType = {
  type: String,
  trim: true,
  lowercase: true,
  enum: {
    values: TOY_TYPES,
    message: `toyType must be one of: ${TOY_TYPES.join(", ")}`,
  },
  required: [
    function () { return resolveCategory.call(this) === "toys"; },
    "toyType is required for toys products",
  ],
  set: sanitizeEmptyString,
};

const attributesField = {
  genres,
  clothesType,
  shoeType,
  toyType,
};

module.exports = {
  attributesField,
  genres,
  clothesType,
  shoeType,
  toyType,
  sanitizeEmptyString,
  resolveCategory,
  ALLOWED_GENRES,
  CLOTHES_TYPES,
  SHOE_TYPES,
  TOY_TYPES,
  validateGenresList,
};
