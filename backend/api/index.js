const app = require("../src/app");
const env = require("../src/config/env");
const { connectDatabase } = require("../src/config/db");
const { connectRedis } = require("../src/config/redis");

let readyPromise = null;

const ensureServicesReady = () => {
  if (!readyPromise) {
    readyPromise = Promise.allSettled([
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

  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url}`;
  }

  return app(req, res);
};
