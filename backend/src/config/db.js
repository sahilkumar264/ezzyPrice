const mongoose = require("mongoose");

const connectDatabase = async (mongoUri) => {
  if (!mongoUri) {
    console.warn("MongoDB URI is missing. Search history will not be saved.");
    return null;
  }

  try {
    await mongoose.connect(mongoUri);
    console.info("MongoDB connected successfully.");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed. The app will keep running without saved history.");
    console.error(error.message);
    return null;
  }
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

module.exports = {
  connectDatabase,
  isDatabaseConnected,
};
