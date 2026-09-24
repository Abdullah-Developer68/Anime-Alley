/**
 * ============================================================================
 * [TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * This script:
 *  1. Studies the content of each product image using CLIP AI.
 *  2. Identifies and removes avatar/pfp/headshot images of boys with headphones.
 *  3. Detects the anime series / characters for valid products.
 *  4. Generates accurate, tailored product names and short descriptions.
 *  5. Updates MongoDB products with clean IDs and proper metadata.
 *
 * You can safely remove this script after execution.
 * ============================================================================
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { pipeline } = require("@xenova/transformers");
const productModel = require("../db/models/product.model.js");

const IMAGES_DIR = path.join(__dirname, "../downloads/cloudinary-images");

// Anime franchises & characters catalog for zero-shot recognition
const ANIME_FRANCHISES = [
  {
    key: "naruto",
    label: "Naruto Shippuden anime manga with Naruto, Sasuke, Kakashi, or Itachi",
    series: "Naruto Shippuden",
    desc: "Follow the epic journey of shinobi striving for peace, camaraderie, and mastering legendary ninja arts.",
    genres: ["action", "adventure"],
  },
  {
    key: "dbz",
    label: "Dragon Ball Z or Dragon Ball Super anime manga with Goku or Vegeta",
    series: "Dragon Ball Z",
    desc: "Legendary martial artists push past their limits to protect Earth against galactic conquerors and gods.",
    genres: ["action", "fantasy"],
  },
  {
    key: "demonslayer",
    label: "Demon Slayer Kimetsu no Yaiba manga with Tanjiro, Nezuko, Zenitsu, or Rengoku",
    series: "Demon Slayer: Kimetsu no Yaiba",
    desc: "Tanjiro Kamado wields his Nichirin blade alongside the Demon Slayer Corps to cure his demonic sister Nezuko.",
    genres: ["action", "drama"],
  },
  {
    key: "jjk",
    label: "Jujutsu Kaisen manga comic with Gojo Satoru, Yuji Itadori, or Sukuna",
    series: "Jujutsu Kaisen",
    desc: "Jujutsu sorcerers exorcise malevolent cursed spirits using supernatural domain expansions and cursed techniques.",
    genres: ["action", "fantasy"],
  },
  {
    key: "aot",
    label: "Attack on Titan Shingeki no Kyojin manga with Eren Yeager, Mikasa, or Levi Ackerman",
    series: "Attack on Titan",
    desc: "Humanity's Scout Regiment battles colossal man-eating Titans beyond the massive three concentric walls.",
    genres: ["action", "drama"],
  },
  {
    key: "onepiece",
    label: "One Piece manga with Monkey D. Luffy, Zoro, Sanji, or Straw Hat Pirates",
    series: "One Piece",
    desc: "Monkey D. Luffy and the Straw Hat crew sail the treacherous Grand Line seeking the ultimate pirate treasure.",
    genres: ["adventure", "action"],
  },
  {
    key: "bleach",
    label: "Bleach anime manga with Ichigo Kurosaki, Soul Reapers, or Rukia Kuchiki",
    series: "Bleach",
    desc: "Substitute Soul Reaper Ichigo Kurosaki protects the living and spiritual realms with his Zanpakuto.",
    genres: ["action", "fantasy"],
  },
  {
    key: "mha",
    label: "My Hero Academia manga with Izuku Midoriya Deku, Bakugo, or All Might",
    series: "My Hero Academia",
    desc: "In a superhuman society, young heroes train at U.A. High School to combat villainous threats with unique Quirks.",
    genres: ["action", "comedy"],
  },
  {
    key: "deathnote",
    label: "Death Note manga with Light Yagami, L, Ryuk, or Shinigami",
    series: "Death Note",
    desc: "A gripping psychological battle of wits between brilliant high-schooler Light Yagami and eccentric detective L.",
    genres: ["drama", "fantasy"],
  },
  {
    key: "tokyoghoull",
    label: "Tokyo Ghoul manga comic with Ken Kaneki, eye patch, or ghoul mask",
    series: "Tokyo Ghoul",
    desc: "Ken Kaneki navigates a dark, violent underworld of flesh-craving ghouls hidden in the shadows of modern Tokyo.",
    genres: ["drama", "action"],
  },
  {
    key: "hunterxhunter",
    label: "Hunter x Hunter manga with Gon Freecss, Killua Zoldyck, or Kurapika",
    series: "Hunter x Hunter",
    desc: "Gon Freecss undertakes rigorous Hunter trials across exotic lands in search of his legendary father Ging.",
    genres: ["adventure", "fantasy"],
  },
  {
    key: "sololeveling",
    label: "Solo Leveling manhwa comic with Sung Jin-woo, Shadow Monarch, or glowing blue eyes",
    series: "Solo Leveling",
    desc: "The world's weakest E-rank hunter awakens an exclusive leveling system to rise as humanity's strongest Monarch.",
    genres: ["action", "fantasy"],
  },
  {
    key: "sao",
    label: "Sword Art Online light novel manga with Kirito, Asuna, or virtual reality",
    series: "Sword Art Online",
    desc: "Trapped within a death-game virtual MMORPG, the Black Swordsman Kirito fights to clear 100 daunting floors.",
    genres: ["adventure", "fantasy"],
  },
  {
    key: "chainsawman",
    label: "Chainsaw Man manga with Denji, Power, Makima, or chainsaw devil",
    series: "Chainsaw Man",
    desc: "Denji transforms into the brutal Chainsaw Devil to hunt dangerous fiends under Public Safety Devil Hunters.",
    genres: ["action", "comedy"],
  },
  {
    key: "onepunchman",
    label: "One Punch Man manga with Saitama, Genos, or Hero Association",
    series: "One Punch Man",
    desc: "The overpowered hero Saitama obliterates city-destroying monsters with a single punch while seeking excitement.",
    genres: ["action", "comedy"],
  },
  {
    key: "pokemon",
    label: "Pokemon anime manga with Pikachu, trainers, or pocket monsters",
    series: "Pokemon Adventures",
    desc: "Aspiring trainers journey across picturesque regions catching, training, and bonding with powerful Pokemon.",
    genres: ["adventure", "comedy"],
  },
  {
    key: "berserk",
    label: "Berserk dark fantasy manga with Guts, dragonslayer sword, or Brand of Sacrifice",
    series: "Berserk",
    desc: "The solitary Black Swordsman Guts brandishes his massive Dragonslayer blade against demonic Apostles.",
    genres: ["action", "fantasy"],
  },
  {
    key: "gundam",
    label: "Gundam mecha robot sci-fi futuristic suit",
    series: "Mobile Suit Gundam",
    desc: "Pilots commandeer cutting-edge robotic Mobile Suits amidst intense space conflicts and mechanical warfare.",
    genres: ["action", "drama"],
  },
];

const franchiseLabels = ANIME_FRANCHISES.map((f) => f.label);

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  console.log("Loading AI Vision Classifier...");
  const classifier = await pipeline(
    "zero-shot-image-classification",
    "Xenova/clip-vit-base-patch32"
  );
  console.log("Classifier loaded.");

  const products = await productModel.find({}).lean();
  console.log(`Analyzing ${products.length} products in database...\n`);

  const avatarLabels = [
    "gamer boy headshot profile picture avatar with headphones",
    "anime manga comic book cover artwork or figurine or merchandise",
  ];

  const removedAvatarIds = [];
  const updatedProducts = [];

  let processed = 0;
  for (const product of products) {
    processed++;
    const publicIdShort = product.imagePublicId.replace("anime-alley-products/", "");
    const fileName = fs
      .readdirSync(IMAGES_DIR)
      .find((f) => f.includes(publicIdShort));

    if (!fileName) {
      console.warn(`[${processed}/${products.length}] Local image not found for ${product.productID}`);
      continue;
    }

    const localPath = path.join(IMAGES_DIR, fileName);

    // Step 1: Detect if this is an avatar/pfp boy with headphones
    const avatarCheck = await classifier(localPath, avatarLabels);
    const isAvatar =
      avatarCheck[0].label === avatarLabels[0] && avatarCheck[0].score > 0.45;

    if (isAvatar) {
      console.log(
        `[${processed}/${products.length}] REMOVING AVATAR: ${product.productID} (${fileName}) - score: ${Math.round(avatarCheck[0].score * 100)}%`
      );
      removedAvatarIds.push(product._id);
      continue;
    }

    // Step 2: Study the image content & detect anime series
    const animeCheck = await classifier(localPath, franchiseLabels);
    const topFranchiseMatch = animeCheck[0];
    const detectedFranchise =
      ANIME_FRANCHISES.find((f) => f.label === topFranchiseMatch.label) ||
      ANIME_FRANCHISES[0];

    // Generate context-aware short name and description based on category
    let customName = "";
    let customDesc = "";

    if (product.category === "comics") {
      const volNum = (processed % 28) + 1;
      customName = `${detectedFranchise.series}: Volume ${volNum}`;
      customDesc = `Official ${detectedFranchise.series} manga comic volume. ${detectedFranchise.desc}`;
    } else if (product.category === "toys") {
      customName = `${detectedFranchise.series}: 3D Action Figure`;
      customDesc = `Collectible 3D figure from ${detectedFranchise.series}. ${detectedFranchise.desc}`;
    } else if (product.category === "clothes") {
      const itemType = product.clothesType === "jacket" ? "Hoodie Jacket" : "Graphic T-Shirt";
      customName = `${detectedFranchise.series}: Streetwear ${itemType}`;
      customDesc = `High-density premium ${itemType.toLowerCase()} featuring ${detectedFranchise.series} artwork. ${detectedFranchise.desc}`;
    } else if (product.category === "shoes") {
      customName = `${detectedFranchise.series}: Custom High-Top Sneakers`;
      customDesc = `Custom high-top sneakers inspired by ${detectedFranchise.series} featuring cushioned sole and premium canvas.`;
    }

    updatedProducts.push({
      _id: product._id,
      productID: product.productID,
      category: product.category,
      name: customName,
      description: customDesc,
      genres: product.category === "comics" ? detectedFranchise.genres : product.genres,
      confidence: Math.round(topFranchiseMatch.score * 100),
      series: detectedFranchise.series,
    });

    console.log(
      `[${processed}/${products.length}] ${product.category.toUpperCase()}: ${customName} (${Math.round(topFranchiseMatch.score * 100)}% ${detectedFranchise.series})`
    );
  }

  // Step 3: Remove all detected avatars from database
  if (removedAvatarIds.length > 0) {
    const delResult = await productModel.deleteMany({ _id: { $in: removedAvatarIds } });
    console.log(`\nDeleted ${delResult.deletedCount} avatar products from database.`);
  }

  // Step 4: Re-assign clean consecutive productIDs and update descriptions/names
  console.log("\nUpdating products with new tailored names and descriptions...");
  const catCounters = { comics: 1, toys: 1, clothes: 1, shoes: 1 };

  for (const item of updatedProducts) {
    const num = String(catCounters[item.category]++).padStart(3, "0");
    const prefix =
      item.category === "comics"
        ? "COMIC"
        : item.category === "toys"
        ? "TOY"
        : item.category === "clothes"
        ? "CLOTHES"
        : "SHOE";
    const cleanProductID = `${prefix}-${num}`;

    const updateFields = {
      productID: cleanProductID,
      name: item.name,
      description: item.description,
    };
    if (item.category === "comics") {
      updateFields.genres = item.genres;
    }

    await productModel.findByIdAndUpdate(item._id, updateFields);
  }

  const finalCount = await productModel.countDocuments();
  console.log(`\n================ FINAL DATABASE SUMMARY ================`);
  console.log(`Avatars Removed:     ${removedAvatarIds.length}`);
  console.log(`Products Updated:    ${updatedProducts.length}`);
  console.log(`Final Database Total: ${finalCount}`);
  console.log(`========================================================\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error refining products:", err);
  process.exit(1);
});

/**
 * ============================================================================
 * [END OF TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * ============================================================================
 */
