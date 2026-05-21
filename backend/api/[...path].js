const app = require("../src/app");
const env = require("../src/config/env");
const { connectDatabase } = require("../src/config/db");
const { connectRedis } = require("../src/config/redis");

let readyPromise = null;

const ensureServicesReady = () => {
  if (!readyPromise) {
    readyPromise = Promise.all([
      connectDatabase(env.mongoUri),
      connectRedis(),
    ]).catch((error) => {
      readyPromise = null;
      throw error;
    });
  }

  return readyPromise;
};

module.exports = async (req, res) => {
  await ensureServicesReady();
  return app(req, res);
};
