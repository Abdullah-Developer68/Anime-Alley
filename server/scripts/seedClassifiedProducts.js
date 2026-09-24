/**
 * ============================================================================
 * [TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * This script seeds products into MongoDB using the classified Cloudinary
 * images (comics, toys, clothes, shoes), while discarding non-product images.
 *
 * You can safely remove this script after seeding is complete.
 * ============================================================================
 */

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const productModel = require("../db/models/product.model.js");

const REPORT_PATH = path.join(
  __dirname,
  "../downloads/categorized/classification_report.json"
);

async function seedDatabase() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error("Classification report not found at:", REPORT_PATH);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB successfully.");

  const productsToInsert = [];

  // 1. Comics (75 items)
  report.comics.forEach((item, index) => {
    const num = String(index + 1).padStart(3, "0");
    const genrePresets = [
      ["action", "adventure"],
      ["action", "fantasy"],
      ["adventure", "comedy"],
      ["drama", "action"],
      ["fantasy", "adventure"],
    ];
    const genres = genrePresets[index % genrePresets.length];

    productsToInsert.push({
      productID: `COMIC-${num}`,
      name: `Anime Manga Comic Edition #${index + 1}`,
      description: `Official anime manga comic edition featuring full-color collectible art and exclusive chapters.`,
      price: 18 + (index % 10) * 2, // $18 - $36
      image: item.secure_url,
      imagePublicId: item.public_id,
      category: "comics",
      genres,
      variants: [
        { label: "Volume 1", stock: 25 },
        { label: "Volume 2", stock: 20 },
      ],
    });
  });

  // 2. Toys (8 items)
  report.toys.forEach((item, index) => {
    const num = String(index + 1).padStart(3, "0");
    productsToInsert.push({
      productID: `TOY-${num}`,
      name: `Anime 3D Collectible Figure #${index + 1}`,
      description: `High-detail 3D collectible anime action figure model with custom display base.`,
      price: 49.99 + (index % 5) * 10,
      image: item.secure_url,
      imagePublicId: item.public_id,
      category: "toys",
      toyType: "action-figure",
      variants: [{ label: "Default", stock: 15 }], // Toys strictly require single 'Default' variant
    });
  });

  // 3. Clothes (2 items)
  report.clothes.forEach((item, index) => {
    const num = String(index + 1).padStart(3, "0");
    const clothesType = index % 2 === 0 ? "hoodie" : "t-shirt";
    const mappedType = clothesType === "hoodie" ? "jacket" : "t-shirt"; // Allowed CLOTHES_TYPES: 't-shirt', 'jacket', 'pants'
    productsToInsert.push({
      productID: `CLOTHES-${num}`,
      name: `Anime Streetwear Graphic ${mappedType === "jacket" ? "Hoodie / Jacket" : "T-Shirt"} #${index + 1}`,
      description: `Premium anime streetwear crafted with comfortable, breathable high-density fabric.`,
      price: mappedType === "jacket" ? 49.99 : 29.99,
      image: item.secure_url,
      imagePublicId: item.public_id,
      category: "clothes",
      clothesType: mappedType,
      variants: [
        { label: "S", stock: 10 },
        { label: "M", stock: 25 },
        { label: "L", stock: 20 },
        { label: "XL", stock: 12 },
      ],
    });
  });

  // 4. Shoes (1 item)
  report.shoes.forEach((item, index) => {
    const num = String(index + 1).padStart(3, "0");
    productsToInsert.push({
      productID: `SHOE-${num}`,
      name: `Custom Anime High-Top Sneakers #${index + 1}`,
      description: `Exclusive anime-themed high-top sneakers with shock-absorbing soles and premium build.`,
      price: 79.99,
      image: item.secure_url,
      imagePublicId: item.public_id,
      category: "shoes",
      shoeType: "sneakers",
      variants: [
        { label: "US 8", stock: 8 },
        { label: "US 9", stock: 15 },
        { label: "US 10", stock: 12 },
        { label: "US 11", stock: 6 },
      ],
    });
  });

  console.log(`Prepared ${productsToInsert.length} products to insert.`);
  console.log(
    `Breakdown: ${report.comics.length} comics, ${report.toys.length} toys, ${report.clothes.length} clothes, ${report.shoes.length} shoes.`
  );
  console.log(`(Discarded ${report.discarded.length} non-product images)`);

  // Clear existing products if any
  await productModel.deleteMany({});
  console.log("Cleared existing products collection.");

  // Insert all valid products
  const inserted = await productModel.insertMany(productsToInsert);
  console.log(`Successfully inserted ${inserted.length} products into MongoDB!`);

  // Verify count
  const count = await productModel.countDocuments();
  console.log(`Verified total products in database: ${count}`);

  await mongoose.disconnect();
  console.log("Database connection closed.");
}

seedDatabase().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});

/**
 * ============================================================================
 * [END OF TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * ============================================================================
 */
