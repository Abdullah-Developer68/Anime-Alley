/**
 * ============================================================================
 * [TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * This script classifies downloaded Cloudinary images into:
 *  - comics (anime 2D character / manga illustrations)
 *  - toys (3D action figures, figurines, toys)
 *  - clothes (apparel, shirts, hoodies, jackets, pants)
 *  - shoes (sneakers, boots, footwear)
 *  - discarded (screenshots, unrelated photos, memes, graphics)
 *
 * You can safely remove this script after classification is complete.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { pipeline } = require("@xenova/transformers");

const IMAGES_DIR = path.join(__dirname, "../downloads/cloudinary-images");
const OUTPUT_DIR = path.join(__dirname, "../downloads/categorized");
const MANIFEST_PATH = path.join(IMAGES_DIR, "manifest.json");

const CANDIDATE_LABELS = {
  comics: "2D anime character manga comic drawing illustration",
  toys: "3D action figure collectible toy plastic anime figurine statue",
  clothes: "clothing apparel shirt t-shirt hoodie jacket pants streetwear",
  shoes: "shoes sneakers boots footwear",
  discarded: "computer screenshot random photo banner graphic meme unrelated object",
};

const labelTexts = Object.values(CANDIDATE_LABELS);
const textToCategory = Object.fromEntries(
  Object.entries(CANDIDATE_LABELS).map(([cat, txt]) => [txt, cat])
);

async function runClassification() {
  console.log("Loading AI classification model...");
  const classifier = await pipeline(
    "zero-shot-image-classification",
    "Xenova/clip-vit-base-patch32"
  );
  console.log("Model ready. Loading image manifest...");

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  console.log(`Classifying ${manifest.length} images...`);

  // Ensure output directories exist
  Object.keys(CANDIDATE_LABELS).forEach((cat) => {
    const catDir = path.join(OUTPUT_DIR, cat);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });
  });

  const results = {
    comics: [],
    toys: [],
    clothes: [],
    shoes: [],
    discarded: [],
  };

  let count = 0;
  for (const item of manifest) {
    count++;
    const { localPath, public_id, secure_url } = item;

    if (!fs.existsSync(localPath)) {
      console.warn(`File missing: ${localPath}`);
      continue;
    }

    try {
      const output = await classifier(localPath, labelTexts);
      const topMatch = output[0];
      const matchedCategory = textToCategory[topMatch.label] || "discarded";

      const classifiedItem = {
        public_id,
        secure_url,
        fileName: path.basename(localPath),
        category: matchedCategory,
        confidence: Math.round(topMatch.score * 100) / 100,
        predictions: output.map((o) => ({
          category: textToCategory[o.label],
          score: Math.round(o.score * 1000) / 1000,
        })),
      };

      results[matchedCategory].push(classifiedItem);

      // Copy file to category directory for easy review
      const targetPath = path.join(OUTPUT_DIR, matchedCategory, path.basename(localPath));
      fs.copyFileSync(localPath, targetPath);

      console.log(
        `[${count}/${manifest.length}] ${path.basename(localPath)} -> ${matchedCategory.toUpperCase()} (${Math.round(topMatch.score * 100)}%)`
      );
    } catch (err) {
      console.error(`Error classifying ${localPath}:`, err.message);
      results.discarded.push({
        public_id,
        secure_url,
        fileName: path.basename(localPath),
        category: "discarded",
        error: err.message,
      });
    }
  }

  const reportPath = path.join(OUTPUT_DIR, "classification_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log("\n================ CLASSIFICATION SUMMARY ================");
  console.log(`Comics:     ${results.comics.length}`);
  console.log(`Toys (3D):  ${results.toys.length}`);
  console.log(`Clothes:    ${results.clothes.length}`);
  console.log(`Shoes:      ${results.shoes.length}`);
  console.log(`Discarded:  ${results.discarded.length}`);
  console.log(`Total:      ${manifest.length}`);
  console.log(`Report:     ${reportPath}`);
  console.log("========================================================\n");
}

runClassification().catch(console.error);

/**
 * ============================================================================
 * [END OF TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * ============================================================================
 */
