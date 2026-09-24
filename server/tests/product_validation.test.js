// server/tests/product_validation.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateProductData } = require("../utils/validation.utils.js");

test("Phase 3 validateProductData unit tests", async (t) => {
  await t.test("validates comics requires valid genres", () => {
    const validComic = {
      name: "Naruto Vol 1",
      price: 10,
      category: "comics",
      variants: [{ label: "V1", stock: 10 }],
      genres: ["Action", "Fantasy"],
    };
    const resValid = validateProductData(validComic);
    assert.strictEqual(resValid.valid, true);
    assert.deepStrictEqual(resValid.data.genres, ["Action", "Fantasy"]);

    const missingGenres = {
      name: "Naruto Vol 1",
      price: 10,
      category: "comics",
      variants: [{ label: "V1", stock: 10 }],
    };
    const resMissing = validateProductData(missingGenres);
    assert.strictEqual(resMissing.valid, false);
    assert.strictEqual(resMissing.status, 400);

    const invalidGenres = {
      name: "Naruto Vol 1",
      price: 10,
      category: "comics",
      variants: [{ label: "V1", stock: 10 }],
      genres: ["Western"],
    };
    const resInvalid = validateProductData(invalidGenres);
    assert.strictEqual(resInvalid.valid, false);
    assert.strictEqual(resInvalid.status, 400);
  });

  await t.test("validates clothes requires valid clothesType", () => {
    const validClothes = {
      name: "Anime Shirt",
      price: 25,
      category: "clothes",
      variants: [{ label: "M", stock: 10 }],
      clothesType: "t-shirt",
    };
    const resValid = validateProductData(validClothes);
    assert.strictEqual(resValid.valid, true);
    assert.strictEqual(resValid.data.clothesType, "t-shirt");
    assert.strictEqual(resValid.data.merchType, undefined);

    // Payload with clothesType and legacy merchType does not populate merchType
    const withBothClothes = {
      name: "Anime Shirt",
      price: 25,
      category: "clothes",
      variants: [{ label: "M", stock: 10 }],
      clothesType: "t-shirt",
      merchType: "jacket",
    };
    const resBoth = validateProductData(withBothClothes);
    assert.strictEqual(resBoth.valid, true);
    assert.strictEqual(resBoth.data.clothesType, "t-shirt");
    assert.strictEqual(resBoth.data.merchType, undefined);

    // Missing clothesType returns 400 Bad Request
    const omittedClothes = {
      name: "Anime Jacket",
      price: 60,
      category: "clothes",
      variants: [{ label: "L", stock: 5 }],
    };
    const resOmitted = validateProductData(omittedClothes);
    assert.strictEqual(resOmitted.valid, false);
    assert.strictEqual(resOmitted.status, 400);

    // Whitespace-only clothesType returns 400 Bad Request
    const whitespaceClothes = {
      name: "Anime Jacket",
      price: 60,
      category: "clothes",
      variants: [{ label: "L", stock: 5 }],
      clothesType: "   ",
    };
    const resWhitespace = validateProductData(whitespaceClothes);
    assert.strictEqual(resWhitespace.valid, false);
    assert.strictEqual(resWhitespace.status, 400);

    // Legacy merchType is ignored and returns 400 Bad Request
    const legacyMerchClothes = {
      name: "Anime Jacket",
      price: 60,
      category: "clothes",
      variants: [{ label: "L", stock: 5 }],
      merchType: "jacket",
    };
    const resLegacy = validateProductData(legacyMerchClothes);
    assert.strictEqual(resLegacy.valid, false);
    assert.strictEqual(resLegacy.status, 400);

    const invalidClothes = {
      name: "Anime Hat",
      price: 15,
      category: "clothes",
      variants: [{ label: "One Size", stock: 5 }],
      clothesType: "hat",
    };
    const resInvalid = validateProductData(invalidClothes);
    assert.strictEqual(resInvalid.valid, false);
    assert.strictEqual(resInvalid.status, 400);
  });

  await t.test("validates shoes requires valid shoeType", () => {
    const validShoes = {
      name: "Ninja Kicks",
      price: 80,
      category: "shoes",
      variants: [{ label: "9", stock: 4 }],
      shoeType: "sneakers",
    };
    const resValid = validateProductData(validShoes);
    assert.strictEqual(resValid.valid, true);
    assert.strictEqual(resValid.data.shoeType, "sneakers");
    assert.strictEqual(resValid.data.merchType, undefined);

    // Payload with shoeType and legacy merchType does not populate merchType
    const withBothShoes = {
      name: "Ninja Kicks",
      price: 80,
      category: "shoes",
      variants: [{ label: "9", stock: 4 }],
      shoeType: "sneakers",
      merchType: "boots",
    };
    const resBothShoes = validateProductData(withBothShoes);
    assert.strictEqual(resBothShoes.valid, true);
    assert.strictEqual(resBothShoes.data.shoeType, "sneakers");
    assert.strictEqual(resBothShoes.data.merchType, undefined);

    // Missing shoeType returns 400 Bad Request
    const omittedShoes = {
      name: "Combat Boots",
      price: 90,
      category: "shoes",
      variants: [{ label: "10", stock: 3 }],
    };
    const resOmittedShoes = validateProductData(omittedShoes);
    assert.strictEqual(resOmittedShoes.valid, false);
    assert.strictEqual(resOmittedShoes.status, 400);

    // Whitespace-only shoeType returns 400 Bad Request
    const whitespaceShoes = {
      name: "Combat Boots",
      price: 90,
      category: "shoes",
      variants: [{ label: "10", stock: 3 }],
      shoeType: "   ",
    };
    const resWhitespaceShoes = validateProductData(whitespaceShoes);
    assert.strictEqual(resWhitespaceShoes.valid, false);
    assert.strictEqual(resWhitespaceShoes.status, 400);

    // Legacy merchType is ignored and returns 400 Bad Request
    const legacyMerchShoes = {
      name: "Combat Boots",
      price: 90,
      category: "shoes",
      variants: [{ label: "10", stock: 3 }],
      merchType: "boots",
    };
    const resLegacyShoes = validateProductData(legacyMerchShoes);
    assert.strictEqual(resLegacyShoes.valid, false);
    assert.strictEqual(resLegacyShoes.status, 400);

    const invalidShoes = {
      name: "Sandals",
      price: 30,
      category: "shoes",
      variants: [{ label: "8", stock: 2 }],
      shoeType: "sandals",
    };
    const resInvalid = validateProductData(invalidShoes);
    assert.strictEqual(resInvalid.valid, false);
    assert.strictEqual(resInvalid.status, 400);
  });

  await t.test("validates toys requires valid toyType including doll", () => {
    const validFigure = {
      name: "Goku",
      price: 30,
      category: "toys",
      variants: [{ label: "Default", stock: 10 }],
      toyType: "action-figure",
    };
    const resFig = validateProductData(validFigure);
    assert.strictEqual(resFig.valid, true);
    assert.strictEqual(resFig.data.toyType, "action-figure");

    const validDoll = {
      name: "Plush Doll",
      price: 20,
      category: "toys",
      variants: [{ label: "Default", stock: 10 }],
      toyType: "doll",
    };
    const resDoll = validateProductData(validDoll);
    assert.strictEqual(resDoll.valid, true);
    assert.strictEqual(resDoll.data.toyType, "doll");

    const invalidToy = {
      name: "Puzzle",
      price: 15,
      category: "toys",
      variants: [{ label: "Default", stock: 10 }],
      toyType: "puzzle",
    };
    const resInvalid = validateProductData(invalidToy);
    assert.strictEqual(resInvalid.valid, false);
    assert.strictEqual(resInvalid.status, 400);
  });

  await t.test("supports multipart deserialization of wire strings", () => {
    const multipartData = {
      name: "One Piece",
      price: "12.99",
      category: "comics",
      variants: JSON.stringify([{ label: "V1", stock: 5 }]),
      genres: JSON.stringify(["Action", "Adventure"]),
    };
    const res = validateProductData(multipartData, { isMultipart: true });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data.price, 12.99);
    assert.deepStrictEqual(res.data.variants, [{ label: "V1", stock: 5 }]);
    assert.deepStrictEqual(res.data.genres, ["Action", "Adventure"]);
  });

  await t.test("rejects invalid genres JSON string in multipart without comma-split fallback", () => {
    const invalidGenresMultipart = {
      name: "Dragon Ball",
      price: "15.00",
      category: "comics",
      variants: JSON.stringify([{ label: "V1", stock: 10 }]),
      genres: "Action, Adventure",
    };
    const res = validateProductData(invalidGenresMultipart, { isMultipart: true });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.message, "Invalid genres format: must be valid JSON");
  });

  await t.test("rejects duplicate variant labels in memory", () => {
    const dupLabels = {
      name: "Anime Hoodie",
      price: 45,
      category: "clothes",
      clothesType: "jacket",
      variants: [
        { label: "M", stock: 5 },
        { label: "m", stock: 10 },
      ],
    };
    const res = validateProductData(dupLabels);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.message, "Variant labels must be unique within a product");
  });

  await t.test("enforces toys single Default variant rule in memory", () => {
    const nonDefaultToy = {
      name: "Robot",
      price: 30,
      category: "toys",
      toyType: "action-figure",
      variants: [{ label: "Large", stock: 5 }],
    };
    const resNonDefault = validateProductData(nonDefaultToy);
    assert.strictEqual(resNonDefault.valid, false);
    assert.strictEqual(resNonDefault.status, 400);
    assert.strictEqual(resNonDefault.message, "Toys category must have exactly one variant with label 'Default'");

    const multiVariantToy = {
      name: "Robot",
      price: 30,
      category: "toys",
      toyType: "action-figure",
      variants: [
        { label: "Default", stock: 5 },
        { label: "Bonus", stock: 2 },
      ],
    };
    const resMulti = validateProductData(multiVariantToy);
    assert.strictEqual(resMulti.valid, false);
    assert.strictEqual(resMulti.status, 400);
    assert.strictEqual(resMulti.message, "Toys category must have exactly one variant with label 'Default'");
  });

  await t.test("enforces strict variable typing standard on numeric price and variant stock", () => {
    // String price in standard JSON payload must be rejected
    const stringPrice = {
      name: "T-Shirt",
      price: "25.00",
      category: "clothes",
      clothesType: "t-shirt",
      variants: [{ label: "M", stock: 10 }],
    };
    const resStringPrice = validateProductData(stringPrice);
    assert.strictEqual(resStringPrice.valid, false);
    assert.strictEqual(resStringPrice.status, 400);
    assert.strictEqual(resStringPrice.message, "Price must be a valid non-negative number");

    // Negative price must be rejected
    const negPrice = {
      name: "T-Shirt",
      price: -5,
      category: "clothes",
      clothesType: "t-shirt",
      variants: [{ label: "M", stock: 10 }],
    };
    const resNegPrice = validateProductData(negPrice);
    assert.strictEqual(resNegPrice.valid, false);
    assert.strictEqual(resNegPrice.status, 400);
    assert.strictEqual(resNegPrice.message, "Price must be a valid non-negative number");

    // String stock in variants must be rejected
    const stringStock = {
      name: "T-Shirt",
      price: 25,
      category: "clothes",
      clothesType: "t-shirt",
      variants: [{ label: "M", stock: "10" }],
    };
    const resStringStock = validateProductData(stringStock);
    assert.strictEqual(resStringStock.valid, false);
    assert.strictEqual(resStringStock.status, 400);
    assert.strictEqual(resStringStock.message, "Variant M must have a non-negative integer stock");

    // Negative stock in variants must be rejected
    const negStock = {
      name: "T-Shirt",
      price: 25,
      category: "clothes",
      clothesType: "t-shirt",
      variants: [{ label: "M", stock: -1 }],
    };
    const resNegStock = validateProductData(negStock);
    assert.strictEqual(resNegStock.valid, false);
    assert.strictEqual(resNegStock.status, 400);
    assert.strictEqual(resNegStock.message, "Variant M must have a non-negative integer stock");

    // Float stock in variants must be rejected
    const floatStock = {
      name: "T-Shirt",
      price: 25,
      category: "clothes",
      clothesType: "t-shirt",
      variants: [{ label: "M", stock: 4.5 }],
    };
    const resFloatStock = validateProductData(floatStock);
    assert.strictEqual(resFloatStock.valid, false);
    assert.strictEqual(resFloatStock.status, 400);
    assert.strictEqual(resFloatStock.message, "Variant M must have a non-negative integer stock");

    // Zero price and zero stock must be valid
    const zeroValues = {
      name: "Free Promo Shirt",
      price: 0,
      category: "clothes",
      clothesType: "t-shirt",
      variants: [{ label: "M", stock: 0 }],
    };
    const resZero = validateProductData(zeroValues);
    assert.strictEqual(resZero.valid, true);
    assert.strictEqual(resZero.data.price, 0);
    assert.strictEqual(resZero.data.variants[0].stock, 0);
  });
  await t.test("validates comics requires volume labels in V<number> format (e.g. V1, V2)", () => {
    const invalidLabels = ["Vol 1", "Volume 1", "v1", "1", "V", "Special", "V-1"];
    for (const label of invalidLabels) {
      const invalidComic = {
        name: "Naruto",
        price: 10,
        category: "comics",
        variants: [{ label, stock: 10 }],
        genres: ["Action"],
      };
      const res = validateProductData(invalidComic);
      assert.strictEqual(res.valid, false, `Label '${label}' should be rejected`);
      assert.strictEqual(res.status, 400);
      assert.ok(res.message.includes("Invalid comic volume format"));
    }

    const validLabels = ["V1", "V2", "V10", "V99"];
    for (const label of validLabels) {
      const validComic = {
        name: "Naruto",
        price: 10,
        category: "comics",
        variants: [{ label, stock: 10 }],
        genres: ["Action"],
      };
      const res = validateProductData(validComic);
      assert.strictEqual(res.valid, true, `Label '${label}' should be accepted`);
    }
  });
});
