const dotenv = require("dotenv");

dotenv.config();

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

const toNumber = (value, fallback) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const toArray = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeSameSite = (value) => {
  const safeValue = String(value || "lax").trim().toLowerCase();
  return ["lax", "strict", "none"].includes(safeValue) ? safeValue : "lax";
};

const normalizeAmazonDomain = (value) =>
  String(value || "amazon.in")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .trim();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 5000),
  clientUrls: toArray(process.env.CLIENT_URLS || process.env.CLIENT_URL, [
    "http://localhost:5173",
  ]),
  mongoUri: process.env.MONGODB_URI || "",
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 12000),
  maxResultsPerSource: toNumber(process.env.MAX_RESULTS_PER_SOURCE, 6),
  scraperUserAgent:
    process.env.SCRAPER_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  redis: {
    enabled: toBoolean(process.env.ENABLE_REDIS_CACHE, true),
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    searchTtlSeconds: toNumber(process.env.SEARCH_CACHE_TTL_SECONDS, 600),
    recentSearchesTtlSeconds: toNumber(process.env.RECENT_SEARCHES_CACHE_TTL_SECONDS, 180),
  },
  auth: {
    jwtSecret:
      process.env.AUTH_JWT_SECRET || "price-comparison-dev-secret-change-me",
    jwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || "7d",
    cookieName: process.env.AUTH_COOKIE_NAME || "price_comparison_session",
    cookieMaxAgeMs: toNumber(
      process.env.AUTH_COOKIE_MAX_AGE_MS,
      1000 * 60 * 60 * 24 * 7
    ),
    cookieSecure: toBoolean(process.env.AUTH_COOKIE_SECURE, false),
    cookieSameSite: normalizeSameSite(process.env.AUTH_COOKIE_SAME_SITE || "lax"),
    bcryptRounds: Math.max(
      8,
      toNumber(process.env.AUTH_BCRYPT_ROUNDS, 10)
    ),
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    signupOtpExpiresMinutes: Math.max(
      1,
      toNumber(process.env.AUTH_SIGNUP_OTP_EXPIRES_MINUTES, 10)
    ),
    signupOtpCooldownSeconds: Math.max(
      0,
      toNumber(process.env.AUTH_SIGNUP_OTP_COOLDOWN_SECONDS, 60)
    ),
    signupOtpMaxAttempts: Math.max(
      1,
      toNumber(process.env.AUTH_SIGNUP_OTP_MAX_ATTEMPTS, 5)
    ),
  },
  mail: {
    host: process.env.SMTP_HOST || "",
    port: toNumber(process.env.SMTP_PORT, 587),
    secure: toBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || "",
    fromName: process.env.MAIL_FROM_NAME || "Price Comparison App",
  },
  playwright: {
    headless: toBoolean(process.env.PLAYWRIGHT_HEADLESS, true),
    launchTimeoutMs: toNumber(process.env.PLAYWRIGHT_LAUNCH_TIMEOUT_MS, 30000),
    navigationTimeoutMs: toNumber(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS, 30000),
    browserChannels: toArray(process.env.PLAYWRIGHT_BROWSER_CHANNELS, [
      "chrome",
      "msedge",
    ]),
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || "",
    storageStatePath: process.env.PLAYWRIGHT_STORAGE_STATE_PATH || "",
  },
  sources: {
    ebay: {
      enabled: toBoolean(process.env.ENABLE_EBAY_SOURCE, true),
      clientId: process.env.EBAY_CLIENT_ID || "",
      clientSecret: process.env.EBAY_CLIENT_SECRET || "",
      environment: process.env.EBAY_ENVIRONMENT || "auto",
      marketplaceId: process.env.EBAY_MARKETPLACE_ID || "EBAY_US",
    },
    amazon: {
      enabled: toBoolean(process.env.ENABLE_AMAZON_SOURCE, true),
      serpApiKey: process.env.AMAZON_SERPAPI_KEY || process.env.SERPAPI_KEY || "",
      serpApiBaseUrl:
        process.env.AMAZON_SERPAPI_BASE_URL || "https://serpapi.com/search.json",
      amazonDomain: normalizeAmazonDomain(
        process.env.AMAZON_SERPAPI_DOMAIN || process.env.AMAZON_MARKETPLACE || "amazon.in"
      ),
      language: process.env.AMAZON_SERPAPI_LANGUAGE || "en_IN",
    },
    flipkart: {
      enabled: toBoolean(process.env.ENABLE_FLIPKART_SOURCE, true),
      affiliateId: process.env.FLIPKART_AFFILIATE_ID || "",
      affiliateToken: process.env.FLIPKART_AFFILIATE_TOKEN || "",
      stagehand: {
        env: process.env.FLIPKART_STAGEHAND_ENV || "LOCAL",
        model: process.env.FLIPKART_STAGEHAND_MODEL || "google/gemini-2.5-flash",
        modelApiKey:
          process.env.FLIPKART_STAGEHAND_MODEL_API_KEY ||
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_API_KEY ||
          process.env.OPENAI_API_KEY ||
          "",
        headless: toBoolean(process.env.FLIPKART_STAGEHAND_HEADLESS, true),
        executablePath:
          process.env.FLIPKART_STAGEHAND_EXECUTABLE_PATH ||
          process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
          "",
        userDataDir: process.env.FLIPKART_STAGEHAND_USER_DATA_DIR || "",
        locale: process.env.FLIPKART_STAGEHAND_LOCALE || "en-IN",
        timeoutMs: toNumber(process.env.FLIPKART_STAGEHAND_TIMEOUT_MS, 45000),
      },
    },
    snapdeal: {
      enabled: toBoolean(process.env.ENABLE_SNAPDEAL_SOURCE, true),
    },
  },
};

env.clientUrl = env.clientUrls[0] || "http://localhost:5173";

module.exports = env;
