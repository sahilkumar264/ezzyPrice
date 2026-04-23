const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/db");
const { connectRedis, disconnectRedis } = require("./config/redis");

const startServer = async () => {
  await connectDatabase(env.mongoUri);
  await connectRedis();

  const server = app.listen(env.port, () => {
    console.info(`Backend server running on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.info(`${signal} received. Shutting down server...`);

    server.close(async () => {
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

startServer();
