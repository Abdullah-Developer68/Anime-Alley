// --- This is suitable for a VPS based deployement for not for serverless ---

// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// //loads variables from .env
// dotenv.config();

// const MONGODB_URI = process.env.MONGODB_URI;
// let isConnected = false;
// const dbConnect = async () => {
//   try {
//     if (!isConnected) {
//       await mongoose.connect(`${MONGODB_URI}`); // database name is in connection String
//       isConnected = true;
//       console.log(
//         "Connecting to MongoDB:",
//         process.env.MONGODB_URI ? "URI found" : "URI NOT FOUND",
//       );
//     }
//   } catch (error) {
//     isConnected = false;
//     console.log("Error Connecting to Mongo DB!");
//     console.log(error);
//   }
// };

// module.exports = dbConnect;

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Cache connection in global scope (persists across warm invocations)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const dbConnect = async () => {
  // If already connected, return existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // If connection is in progress, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Don't buffer commands when disconnected
      maxPoolSize: 10, // Smaller pool for serverless
      serverSelectionTimeoutMS: 10000, // 10 seconds to select server
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    };
    // mongoose.connect resolves when the first handshake is complete, not when the connection is fully ready so using
    // await does not stop executing of the code until the connection is fully established it only waits until the initial handshake is done
    // hence because of this in the first method the mongodb was buffering mongoose.startSession() because connection
    // was not ready and after 10000ms it was timing out and the webhook was failing.
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on error so retry is possible
    throw e;
  }

  return cached.conn;
};

module.exports = dbConnect;
