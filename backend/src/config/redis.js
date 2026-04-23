const { createClient } = require("redis");

const env = require("./env");

let redisClient = null;

const logRedisMessage = (level, message, error) => {
  if (env.nodeEnv === "test") {
    return;
  }

  console[level](message);

  if (error?.message) {
    console[level](error.message);
  }
};

const isRedisConnected = () => Boolean(redisClient?.isOpen && redisClient?.isReady);

const connectRedis = async () => {
  if (!env.redis.enabled) {
    if (env.nodeEnv !== "test") {
      console.info("Redis cache is disabled.");
    }

    return null;
  }

  if (isRedisConnected()) {
    return redisClient;
  }

  const client = createClient({
    url: env.redis.url,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: () => false,
    },
  });

  client.on("error", (error) => {
    if (!isRedisConnected()) {
      return;
    }

    logRedisMessage("warn", "Redis cache error detected. The app will keep working without cache for affected requests.", error);
  });

  try {
    await client.connect();
    redisClient = client;

    if (env.nodeEnv !== "test") {
      console.info("Redis cache connected.");
    }

    return redisClient;
  } catch (error) {
    logRedisMessage("warn", "Redis cache connection failed. Continuing without cache.", error);

    try {
      client.destroy();
    } catch (destroyError) {
      // best effort cleanup
    }

    redisClient = null;
    return null;
  }
};

const disconnectRedis = async () => {
  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = null;

  try {
    await client.quit();
  } catch (error) {
    try {
      client.disconnect();
    } catch (disconnectError) {
      // best effort cleanup
    }
  }
};

const getCacheJson = async (key) => {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const rawValue = await redisClient.get(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    logRedisMessage("warn", `Redis read failed for key ${key}.`, error);
    return null;
  }
};

const setCacheJson = async (key, value, ttlSeconds) => {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const payload = JSON.stringify(value);

    if (ttlSeconds > 0) {
      await redisClient.set(key, payload, { EX: ttlSeconds });
    } else {
      await redisClient.set(key, payload);
    }

    return true;
  } catch (error) {
    logRedisMessage("warn", `Redis write failed for key ${key}.`, error);
    return false;
  }
};

const deleteCacheKeys = async (keys) => {
  if (!isRedisConnected() || !keys.length) {
    return 0;
  }

  try {
    return await redisClient.del(keys);
  } catch (error) {
    logRedisMessage("warn", "Redis cache invalidation failed.", error);
    return 0;
  }
};

module.exports = {
  connectRedis,
  disconnectRedis,
  isRedisConnected,
  getCacheJson,
  setCacheJson,
  deleteCacheKeys,
};
