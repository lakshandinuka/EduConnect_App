const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Do not exit process if Mongo URI is empty, just log it so app doesn't crash on start when empty
    if (!process.env.MONGO_URI) {
      console.warn("MONGO_URI is not defined in .env file. Please add it.");
    }
  }
};

module.exports = connectDB;
