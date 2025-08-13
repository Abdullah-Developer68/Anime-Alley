const mongoose = require("mongoose");
const dotenv = require("dotenv");
//loads variables from .env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Use globals so the connection persists across warm serverless invocations
let cachedConnection = global.__mongooseConnection;
let cachedConnectionPromise = global.__mongooseConnectionPromise;

const dbConnect = async () => {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (mongoose.connection.readyState === 2 && cachedConnectionPromise) {
    await cachedConnectionPromise;
    return;
  }

  if (cachedConnection) {
    return;
  }

  // Connection options tuned for serverless
  const connectionOptions = {
    // Cap concurrent sockets; MongoDB handles one op per socket
    maxPoolSize: 10,
    // Allow pool to scale to zero when idle (saves resources)
    minPoolSize: 0,
    // Faster failure on cold start if server cannot be selected
    serverSelectionTimeoutMS: 10000,
    // How long an inactive socket stays open
    socketTimeoutMS: 60000,
    // Close idle connections on the server side
    maxIdleTimeMS: 120000,
    // keepAlive option removed in MongoDB Node driver v6; default behavior keeps sockets alive
    // Recommended for Atlas
    retryWrites: true,
  };

  try {
    cachedConnectionPromise = mongoose.connect(MONGODB_URI, connectionOptions);
    // Persist promise/connection across warm invocations
    global.__mongooseConnectionPromise = cachedConnectionPromise;
    await cachedConnectionPromise;
    cachedConnection = mongoose.connection;
    global.__mongooseConnection = cachedConnection;
    console.log("MongoDB connected. State:", mongoose.connection.readyState);
  } catch (error) {
    cachedConnection = null;
    cachedConnectionPromise = null;
    global.__mongooseConnection = null;
    global.__mongooseConnectionPromise = null;
    console.log("Error connecting to MongoDB:");
    console.log(error);
    throw error;
  }
};

module.exports = dbConnect;
