const mongoose = require("mongoose");
const dotenv = require("dotenv");
//loads variables from .env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;
const dbConnect = async () => {
  try {
    if (!isConnected) {
      await mongoose.connect(`${MONGODB_URI}`); // database name is in connection String
      isConnected = true;
      console.log(
        "Connecting to MongoDB:",
        process.env.MONGODB_URI ? "URI found" : "URI NOT FOUND"
      );
    }
  } catch (error) {
    isConnected = false;
    console.log("Error Connecting to Mongo DB!");
    console.log(error);
  }
};

module.exports = dbConnect;
