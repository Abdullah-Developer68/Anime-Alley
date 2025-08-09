const mongoose = require("mongoose");
const dotenv = require("dotenv");
//loads variables from .env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail fast so we don't attempt to buffer operations forever
  throw new Error("MONGODB_URI is not defined in environment variables");
}

// Cache the connection across serverless invocations to avoid cold-connect races
let cached = global.__mongooseConnectionCache;
if (!cached) {
  cached = { conn: null, promise: null };
  global.__mongooseConnectionCache = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Increase timeouts for serverless cold starts and reduce command buffering surprises
    mongoose.set("bufferTimeoutMS", 30000);
    // Optional, but recommended in many setups
    // mongoose.set("strictQuery", true);

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        retryWrites: true,
      })
      .then((mongooseInstance) => {
        console.log(
          "MongoDB connected. readyState:",
          mongooseInstance.connection.readyState
        );
        return mongooseInstance;
      })
      .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
        // Reset promise so future calls retry
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = dbConnect;
