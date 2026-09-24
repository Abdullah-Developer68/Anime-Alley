const test = require("node:test");
const assert = require("node:assert");
const { validateComicVolumes } = require("../utils/volume.utils.js");

test("Volume utility tests", async (t) => {
  await t.test("validateComicVolumes handles single valid string", () => {
    assert.strictEqual(validateComicVolumes("V1").valid, true);
    assert.strictEqual(validateComicVolumes("V2").valid, true);
    assert.strictEqual(validateComicVolumes("V10").valid, true);
    assert.strictEqual(validateComicVolumes(" V1 ").valid, true);
  });

  await t.test("validateComicVolumes handles single invalid string", () => {
    assert.strictEqual(validateComicVolumes("Vol 1").valid, false);
    assert.strictEqual(validateComicVolumes("v1").valid, false);
    assert.strictEqual(validateComicVolumes("1").valid, false);
    assert.strictEqual(validateComicVolumes("").valid, false);
  });

  await t.test("validateComicVolumes handles array of valid variants or strings", () => {
    const validVariants = [{ label: "V1", stock: 10 }, { label: "V2", stock: 5 }];
    assert.strictEqual(validateComicVolumes(validVariants).valid, true);

    const validStrings = ["V1", "V2", "V3"];
    assert.strictEqual(validateComicVolumes(validStrings).valid, true);
  });

  await t.test("validateComicVolumes handles array with invalid volume", () => {
    const invalidVariants = [{ label: "V1", stock: 10 }, { label: "Vol 2", stock: 5 }];
    const res = validateComicVolumes(invalidVariants);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.invalidVolume, "Vol 2");
    assert.ok(res.message.includes("Invalid comic volume format: \"Vol 2\""));

    assert.strictEqual(validateComicVolumes([]).valid, false);
    assert.strictEqual(validateComicVolumes(null).valid, false);
  });
});
