/**
 * ============================================================================
 * [TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * This script is for one-time download and inspection of images from the
 * Cloudinary "anime-alley-products" folder. You can safely delete this file later.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cloudinary = require("../config/cloudinary/cloudinary.config.js");

const DOWNLOAD_DIR = path.join(__dirname, "../downloads/cloudinary-images");

// Ensure target directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const downloadImage = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return downloadImage(response.headers.location, dest).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download ${url}: Status ${response.statusCode}`));
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
};

async function fetchAndDownloadAllImages() {
  if (!process.env.CLOUDINARY_API_SECRET) {
    console.error("ERROR: CLOUDINARY_API_SECRET is missing in server/.env");
    process.exit(1);
  }

  console.log("Searching Cloudinary folder: anime-alley-products...");

  try {
    let nextCursor = null;
    let totalFound = 0;
    const downloadedImages = [];

    do {
      const options = {
        type: "upload",
        prefix: "anime-alley-products",
        max_results: 100,
      };
      if (nextCursor) options.next_cursor = nextCursor;

      const result = await cloudinary.api.resources(options);
      const resources = result.resources || [];
      totalFound += resources.length;

      console.log(`Found batch of ${resources.length} image(s)...`);

      for (const res of resources) {
        const ext = path.extname(res.secure_url) || `.${res.format}`;
        const filename = `${res.public_id.replace(/\//g, "_")}${ext}`;
        const localPath = path.join(DOWNLOAD_DIR, filename);

        console.log(`Downloading: ${res.public_id} -> ${filename}`);
        await downloadImage(res.secure_url, localPath);
        downloadedImages.push({
          public_id: res.public_id,
          secure_url: res.secure_url,
          localPath,
          format: res.format,
          bytes: res.bytes,
        });
      }

      nextCursor = result.next_cursor;
    } while (nextCursor);

    // Save manifest JSON for analysis
    const manifestPath = path.join(DOWNLOAD_DIR, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(downloadedImages, null, 2));

    console.log(`\nSuccessfully downloaded ${downloadedImages.length} images to: ${DOWNLOAD_DIR}`);
    console.log(`Manifest written to: ${manifestPath}`);
  } catch (error) {
    console.error("Cloudinary fetch error:", error);
    process.exit(1);
  }
}

fetchAndDownloadAllImages();

/**
 * ============================================================================
 * [END OF TEMPORARY SCRIPT - MARKED FOR REMOVAL]
 * ============================================================================
 */
