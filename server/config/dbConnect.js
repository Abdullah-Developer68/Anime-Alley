const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Cache connection in global scope (persists across warm invocations)
// global is the Node.js global object like window object in browsers and it
// is accessible everywhere in the node.js app. It also persists across function calls
// (in serverless, it persists during the instance). We are adding an object mongoose in it
//  to cache the connection
let cached = global.mongoose;

if (!cached) {
  // if the connection is not cached yet, create an object to store the info that tells not to create
  // a new connection the next time dbConnect is called in the codebase
  cached = global.mongoose = { conn: null, promise: null };
}

const createConnection = async (opts) => {
  // mongoose.connect resolves and returns a connection object when the first handshake is complete, not when the connection is fully ready, so using
  // await does not stop executing of the code until the connection is fully established it only waits until the initial handshake is done
  // hence because of this in the first method the mongoose.connect resolved and returns connection immediately but connection was going through internal initialization
  // (connection pool, buffering, etc.) which continues asynchronously in the background.
  // Calling mongoose.startSession() too early (before stabilization completes) causes buffering timeouts which caused the stripe webhook to fail.
  const connection = await mongoose.connect(MONGODB_URI, opts);
  console.log("MongoDB is connected");
  // Returns the connection object immediatly. Internal stabilization continues asynchronously in the background and connection is functional after that.
  return connection;
};

const dbConnect = async () => {
  // If already connected, return existing connection. 1st time it will be null so it will skip this
  if (cached.conn) {
    return cached.conn;
  }

  // If connection is in progress, wait for it. 1st time it will be null so it will run the code below to create new connection
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Don't buffer commands when disconnected
      maxPoolSize: 10, // Smaller pool for serverless
      serverSelectionTimeoutMS: 10000, // 10 seconds to select server
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    };

    // CRITICAL: Set the promise BEFORE awaiting to prevent race conditions
    // If we await first, concurrent calls can both pass the !cached.promise check
    cached.promise = createConnection(opts);
    // cached.promise = mongoose.connect(MONGODB_URI, opts).then((connection) => {
    //   console.log("MongoDB is connected");
    //   return connection;
    // });
  }

  try {
    // we need to wait for the connection object to setup fully before returning it so that when there is a need to for mongoose.startSession the connection is fully functional and there are not timeouts
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on error so retry is possible
    throw e;
  }

  return cached.conn;
};

module.exports = dbConnect;

// There are some operations that require a fully stabilized connection, such as starting a session with mongoose.startSession() for transactions.
// But there are some such as await User.find() etc that can work even when the connection is still stabilizing in the background after the initial handshake.
// This is the reason why the startSession was causing timeouts in the stripe webhook handler when called too early before the connection was fully stabilized the handler was not being executed.
