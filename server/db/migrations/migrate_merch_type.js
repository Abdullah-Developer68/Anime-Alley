// server/db/migrations/migrate_merch_type.js
const mongoose = require("mongoose");
const dbConnect = require("../dbConnect.js");
const productModel = require("../models/product.model.js");

// Migration script to copy legacy merchType to categorical clothesType or shoeType
const migrateMerchType = async () => {
  try {
    await dbConnect();
    console.log("Connected to MongoDB for merchType migration");

    // Migrate clothes records
    const clothesResult = await productModel.updateMany(
      { category: /^clothes$/i, merchType: { $type: "string" } },
      [{ $set: { clothesType: { $toLower: { $trim: { input: "$merchType" } } } } }],
    );
    console.log(`Clothes migration completed: matched ${clothesResult.matchedCount}, modified ${clothesResult.modifiedCount}`);

    // Migrate shoes records
    const shoesResult = await productModel.updateMany(
      { category: /^shoes$/i, merchType: { $type: "string" } },
      [{ $set: { shoeType: { $toLower: { $trim: { input: "$merchType" } } } } }],
    );
    console.log(`Shoes migration completed: matched ${shoesResult.matchedCount}, modified ${shoesResult.modifiedCount}`);

    return {
      clothes: clothesResult,
      shoes: shoesResult,
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};

// If executed directly from CLI
if (require.main === module)
  migrateMerchType()
    .then(async () => {
      console.log("Migration script finished successfully");
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Migration script failed with error:", err);
      await mongoose.disconnect();
      process.exit(1);
    });

module.exports = migrateMerchType;
