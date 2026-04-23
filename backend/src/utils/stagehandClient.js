const fs = require("fs");
const path = require("path");
const { Stagehand } = require("@browserbasehq/stagehand");
const { z } = require("zod");

const DEFAULT_WINDOWS_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const normalizeStagehandEnv = (value) =>
  String(value || "LOCAL").toUpperCase() === "BROWSERBASE" ? "BROWSERBASE" : "LOCAL";

const resolveExistingPath = (value) => {
  if (!value) {
    return undefined;
  }

  const resolvedPath = path.isAbsolute(value) ? value : path.resolve(value);
  return fs.existsSync(resolvedPath) ? resolvedPath : undefined;
};

const resolveBrowserExecutablePath = (value) => {
  const configuredPath = resolveExistingPath(value);

  if (configuredPath) {
    return configuredPath;
  }

  return DEFAULT_WINDOWS_BROWSER_PATHS.find((candidate) => fs.existsSync(candidate));
};

const resolveOptionalDirectory = (value) => {
  if (!value) {
    return undefined;
  }

  const resolvedDirectory = path.isAbsolute(value) ? value : path.resolve(value);
  fs.mkdirSync(resolvedDirectory, { recursive: true });
  return resolvedDirectory;
};

const createFlipkartProductSchema = () =>
  z.object({
    products: z
      .array(
        z.object({
          title: z.string().describe("Visible product title"),
          price: z
            .string()
            .describe(
              "Current product price as digits only, without currency symbols or commas. Example: 24999"
            ),
          productUrl: z.string().describe("Absolute Flipkart product URL"),
          imageUrl: z.string().describe("Absolute image URL or empty string"),
          rating: z.string().describe("Visible rating text or empty string"),
          seller: z.string().describe("Visible brand or seller name or empty string"),
          availability: z.string().describe("Availability text or empty string"),
        })
      )
      .describe("Real product cards only. Ignore ads, sponsored content, banners, and navigation items."),
  });

const createStagehandForFlipkart = (config) => {
  const env = normalizeStagehandEnv(config.env);
  const baseConfig = {
    env,
    model: {
      modelName: config.model,
      apiKey: config.modelApiKey,
    },
    disableAPI: true,
    selfHeal: true,
    verbose: 0,
    domSettleTimeout: Math.min(config.timeoutMs, 15000),
  };

  if (env === "LOCAL") {
    return new Stagehand({
      ...baseConfig,
      localBrowserLaunchOptions: {
        headless: config.headless,
        executablePath: resolveBrowserExecutablePath(config.executablePath),
        userDataDir: resolveOptionalDirectory(config.userDataDir),
        locale: config.locale,
        viewport: {
          width: 1440,
          height: 1024,
        },
        ignoreHTTPSErrors: true,
        connectTimeoutMs: Math.max(10000, Math.min(config.timeoutMs, 30000)),
      },
    });
  }

  return new Stagehand(baseConfig);
};

module.exports = {
  createFlipkartProductSchema,
  createStagehandForFlipkart,
};
