// server/tests/product_schema.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const productModel = require("../db/models/product.model.js");
const {
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
} = require("../db/submodels/product/attributes.schema.js");
const {
  variantItemSchema,
  variantsField,
  validateVariantsNonEmpty,
  validateUniqueLabels,
  validateToysSingleDefaultRule,
} = require("../db/submodels/product/variant.schema.js");

test("Phase 2 Sub-schemas: attributes.schema.js unit tests", async (t) => {
  await t.test("exports all required constants, schemas, and helpers", () => {
    assert.ok(attributesField, "attributesField must be exported");
    assert.ok(genres, "genres must be exported");
    assert.ok(clothesType, "clothesType must be exported");
    assert.ok(shoeType, "shoeType must be exported");
    assert.ok(toyType, "toyType must be exported");
    assert.strictEqual(typeof sanitizeEmptyString, "function");
    assert.strictEqual(typeof resolveCategory, "function");
    assert.deepStrictEqual(ALLOWED_GENRES, ["action", "adventure", "comedy", "drama", "fantasy"]);
    assert.deepStrictEqual(CLOTHES_TYPES, ["t-shirt", "jacket", "pants"]);
    assert.deepStrictEqual(SHOE_TYPES, ["sneakers", "boots"]);
    assert.deepStrictEqual(TOY_TYPES, ["action-figure", "car", "doll"]);
  });

  await t.test("sanitizeEmptyString converts empty or whitespace-only strings to undefined", () => {
    assert.strictEqual(sanitizeEmptyString(""), undefined);
    assert.strictEqual(sanitizeEmptyString("   "), undefined);
    assert.strictEqual(sanitizeEmptyString("t-shirt"), "t-shirt");
    assert.strictEqual(sanitizeEmptyString(null), null);
    assert.strictEqual(sanitizeEmptyString(undefined), undefined);
  });

  await t.test("resolveCategory retrieves category from document and query update contexts", () => {
    const docCtx = { category: "comics" };
    assert.strictEqual(resolveCategory.call(docCtx), "comics");

    const queryCtx = {
      getUpdate: () => ({ category: "clothes" }),
    };
    assert.strictEqual(resolveCategory.call(queryCtx), "clothes");

    const setCtx = {
      getUpdate: () => ({ $set: { category: "toys" } }),
    };
    assert.strictEqual(resolveCategory.call(setCtx), "toys");

    const upperCtx = { category: "Toys" };
    assert.strictEqual(resolveCategory.call(upperCtx), "toys");

    const upperSetCtx = {
      getUpdate: () => ({ $set: { category: "Clothes" } }),
    };
    assert.strictEqual(resolveCategory.call(upperSetCtx), "clothes");

    const emptyCtx = {};
    assert.strictEqual(resolveCategory.call(emptyCtx), undefined);
    assert.strictEqual(resolveCategory.call(null), undefined);
    assert.strictEqual(resolveCategory.call(undefined), undefined);
    assert.strictEqual(resolveCategory(), undefined);
  });

  await t.test("validateGenresList verifies non-empty whitelist array", () => {
    assert.strictEqual(validateGenresList([]), false);
    assert.strictEqual(validateGenresList(null), false);
    assert.strictEqual(validateGenresList(["Action", "Comedy"]), true);
    assert.strictEqual(validateGenresList(["action", "fantasy"]), true);
    assert.strictEqual(validateGenresList(["Action", "NonExistentGenre"]), false);
    assert.strictEqual(validateGenresList(["   "]), false);
  });
});

test("Phase 2 Sub-schemas: variant.schema.js unit tests", async (t) => {
  await t.test("validateVariantsNonEmpty rejects empty or non-array inputs", () => {
    assert.strictEqual(validateVariantsNonEmpty([]), false);
    assert.strictEqual(validateVariantsNonEmpty(null), false);
    assert.strictEqual(validateVariantsNonEmpty(undefined), false);
    assert.strictEqual(validateVariantsNonEmpty([{ label: "S", stock: 10 }]), true);
  });

  await t.test("validateUniqueLabels detects duplicate labels case-insensitively", () => {
    assert.strictEqual(validateUniqueLabels([{ label: "S" }, { label: "M" }]), true);
    assert.strictEqual(validateUniqueLabels([{ label: "S" }, { label: "s" }]), false);
    assert.strictEqual(validateUniqueLabels([{ label: "Default" }, { label: "default" }]), false);
    assert.strictEqual(validateUniqueLabels(null), false);
  });

  await t.test("validateToysSingleDefaultRule strictly enforces single Default variant for toys", () => {
    const toysCtx = { category: "toys" };
    assert.strictEqual(
      validateToysSingleDefaultRule.call(toysCtx, [{ label: "Default", stock: 10 }]),
      true,
    );
    assert.strictEqual(
      validateToysSingleDefaultRule.call(toysCtx, [
        { label: "Default", stock: 10 },
        { label: "Red", stock: 5 },
      ]),
      false,
    );
    assert.strictEqual(
      validateToysSingleDefaultRule.call(toysCtx, [{ label: "Other", stock: 10 }]),
      false,
    );
    assert.strictEqual(
      validateToysSingleDefaultRule.call(toysCtx, []),
      false,
    );

    // Non-toys categories are not constrained to single Default
    const clothesCtx = { category: "clothes" };
    assert.strictEqual(
      validateToysSingleDefaultRule.call(clothesCtx, [
        { label: "S", stock: 5 },
        { label: "M", stock: 10 },
      ]),
      true,
    );
  });
});

test("Phase 2 Assembly: product.model.js integration & validation tests", async (t) => {
  await t.test("validates complete comic product document", () => {
    const comic = new productModel({
      productID: "comic-001",
      name: "Attack on Titan Vol 1",
      description: "Epic manga",
      price: 12.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "comics",
      genres: ["Action", "Drama"],
      variants: [{ label: "Vol 1", stock: 15 }],
    });
    const err = comic.validateSync();
    assert.strictEqual(err, undefined, "Valid comic must produce zero validation errors");
  });

  await t.test("rejects comic missing genres or containing invalid genres", () => {
    const missingGenres = new productModel({
      productID: "comic-002",
      name: "One Piece",
      description: "Pirate manga",
      price: 9.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "comics",
      genres: [],
      variants: [{ label: "Vol 1", stock: 10 }],
    });
    const errMissing = missingGenres.validateSync();
    assert.ok(errMissing, "Empty genres array must fail validation for comics");

    const invalidGenre = new productModel({
      productID: "comic-003",
      name: "One Piece",
      description: "Pirate manga",
      price: 9.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "comics",
      genres: ["InvalidGenre"],
      variants: [{ label: "Vol 1", stock: 10 }],
    });
    const errInvalid = invalidGenre.validateSync();
    assert.ok(errInvalid, "Invalid genre must fail validation for comics");
  });

  await t.test("validates complete clothes product document", () => {
    const clothes = new productModel({
      productID: "clothes-001",
      name: "Survey Corps Hoodie",
      description: "Warm hoodie",
      price: 49.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "clothes",
      clothesType: "jacket",
      variants: [
        { label: "M", stock: 10 },
        { label: "L", stock: 5 },
      ],
    });
    const err = clothes.validateSync();
    assert.strictEqual(err, undefined, "Valid clothes must produce zero validation errors");
  });

  await t.test("rejects clothes missing clothesType or with invalid clothesType", () => {
    const missingType = new productModel({
      productID: "clothes-002",
      name: "Hoodie",
      description: "Warm",
      price: 40,
      image: "https://res.cloudinary.com/image.jpg",
      category: "clothes",
      variants: [{ label: "M", stock: 5 }],
    });
    const errMissing = missingType.validateSync();
    assert.ok(errMissing?.errors?.clothesType, "Missing clothesType must fail validation for clothes");

    const invalidType = new productModel({
      productID: "clothes-003",
      name: "Hoodie",
      description: "Warm",
      price: 40,
      image: "https://res.cloudinary.com/image.jpg",
      category: "clothes",
      clothesType: "hat",
      variants: [{ label: "M", stock: 5 }],
    });
    const errInvalid = invalidType.validateSync();
    assert.ok(errInvalid?.errors?.clothesType, "Invalid clothesType must fail enum validation");
  });

  await t.test("validates complete shoes product document", () => {
    const shoe = new productModel({
      productID: "shoe-001",
      name: "Ninja Sneakers",
      description: "Comfortable sneakers",
      price: 79.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "shoes",
      shoeType: "sneakers",
      variants: [
        { label: "9", stock: 5 },
        { label: "10", stock: 8 },
      ],
    });
    const err = shoe.validateSync();
    assert.strictEqual(err, undefined, "Valid shoes must produce zero validation errors");
  });

  await t.test("validates complete toy product document with single Default variant", () => {
    const toy = new productModel({
      productID: "toy-001",
      name: "Goku Figurine",
      description: "Detailed figure",
      price: 34.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "toys",
      toyType: "action-figure",
      variants: [{ label: "Default", stock: 20 }],
    });
    const err = toy.validateSync();
    assert.strictEqual(err, undefined, "Valid toy must produce zero validation errors");
  });

  await t.test("validates toy with toyType 'doll'", () => {
    const toy = new productModel({
      productID: "toy-002",
      name: "Anime Plush Doll",
      description: "Cute plush",
      price: 19.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "toys",
      toyType: "doll",
      variants: [{ label: "Default", stock: 15 }],
    });
    const err = toy.validateSync();
    assert.strictEqual(err, undefined, "Toy with doll type must produce zero validation errors");
  });

  await t.test("rejects toy with multiple variants or non-Default variant label", () => {
    const multiVariantToy = new productModel({
      productID: "toy-003",
      name: "Goku Figurine",
      description: "Detailed figure",
      price: 34.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "toys",
      toyType: "action-figure",
      variants: [
        { label: "Default", stock: 10 },
        { label: "Extra", stock: 5 },
      ],
    });
    const errMulti = multiVariantToy.validateSync();
    assert.ok(errMulti?.errors?.variants, "Toys with multiple variants must fail validation");

    const nonDefaultToy = new productModel({
      productID: "toy-004",
      name: "Goku Figurine",
      description: "Detailed figure",
      price: 34.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "toys",
      toyType: "action-figure",
      variants: [{ label: "Small", stock: 10 }],
    });
    const errNonDefault = nonDefaultToy.validateSync();
    assert.ok(errNonDefault?.errors?.variants, "Toys with non-Default label must fail validation");
  });

  await t.test("sanitizeEmptyString ensures inactive category fields do not fail validation", () => {
    const toy = new productModel({
      productID: "toy-005",
      name: "Toy Car",
      description: "Fast car",
      price: 15.99,
      image: "https://res.cloudinary.com/image.jpg",
      category: "toys",
      toyType: "car",
      clothesType: "", // empty string sent from client
      shoeType: "   ", // whitespace string sent from client
      variants: [{ label: "Default", stock: 5 }],
    });
    const err = toy.validateSync();
    assert.strictEqual(err, undefined, "Empty strings for non-relevant category fields must sanitize to undefined");
  });

  await t.test("rejects negative stock or non-integer stock in variants", () => {
    const negStock = new productModel({
      productID: "clothes-004",
      name: "Pants",
      description: "Comfortable",
      price: 30,
      image: "https://res.cloudinary.com/image.jpg",
      category: "clothes",
      clothesType: "pants",
      variants: [{ label: "M", stock: -1 }],
    });
    const errNeg = negStock.validateSync();
    assert.ok(errNeg?.errors?.["variants.0.stock"], "Negative stock must fail validation");

    const floatStock = new productModel({
      productID: "clothes-005",
      name: "Pants",
      description: "Comfortable",
      price: 30,
      image: "https://res.cloudinary.com/image.jpg",
      category: "clothes",
      clothesType: "pants",
      variants: [{ label: "M", stock: 2.5 }],
    });
    const errFloat = floatStock.validateSync();
    assert.ok(errFloat?.errors?.["variants.0.stock"], "Float stock must fail integer validation");
  });

  await t.test("ensures merchType is completely removed from productSchema", () => {
    assert.strictEqual(productModel.schema.paths.merchType, undefined);
  });
});

