const axios = require("axios");

const createHttpClient = (env) =>
  axios.create({
    timeout: env.requestTimeoutMs,
    headers: {
      "User-Agent": env.scraperUserAgent,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive",
    },
  });

module.exports = {
  createHttpClient,
};

