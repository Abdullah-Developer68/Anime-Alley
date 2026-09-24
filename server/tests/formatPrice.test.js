const test = require("node:test");
const assert = require("node:assert/strict");
const { formatPrice } = require("../utils/formatPrice.utils.js");

test("formatPrice unit tests", async (t) => {
  await t.test("rounds floating point inaccuracies like 89.99000000000001 to 89.99", () => {
    const raw = 49.99 + 4 * 10; // In JS IEEE 754: 89.99000000000001
    assert.strictEqual(formatPrice(raw), 89.99);
    assert.strictEqual(formatPrice(79.99000000000001), 79.99);
  });

  await t.test("rounds numbers with more than 2 decimal places to 2 decimal places", () => {
    assert.strictEqual(formatPrice(19.994), 19.99);
    assert.strictEqual(formatPrice(19.995), 20);
    assert.strictEqual(formatPrice(10.126), 10.13);
  });

  await t.test("preserves clean integers and single decimals without unnecessary zeros as numbers", () => {
    assert.strictEqual(formatPrice(50), 50);
    assert.strictEqual(formatPrice(50.5), 50.5);
    assert.strictEqual(formatPrice(0), 0);
  });

  await t.test("returns 0 for NaN, null, undefined, or non-numeric strings", () => {
    assert.strictEqual(formatPrice(NaN), 0);
    assert.strictEqual(formatPrice(null), 0);
    assert.strictEqual(formatPrice(undefined), 0);
    assert.strictEqual(formatPrice("not-a-number"), 0);
  });

  await t.test("handles negative numbers correctly without producing -0", () => {
    assert.strictEqual(formatPrice(-15.126), -15.13);
    assert.strictEqual(formatPrice(-0.0001), 0);
  });

  await t.test("formats as string when asString is true", () => {
    assert.strictEqual(formatPrice(89.99000000000001, { asString: true }), "89.99");
    assert.strictEqual(formatPrice(50, { asString: true }), "50.00");
    assert.strictEqual(formatPrice(50.5, { asString: true }), "50.50");
  });

  await t.test("handles numeric strings gracefully", () => {
    assert.strictEqual(formatPrice("49.99"), 49.99);
    assert.strictEqual(formatPrice("79.99000000000001"), 79.99);
  });
});
