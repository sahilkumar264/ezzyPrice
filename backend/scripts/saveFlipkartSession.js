const fs = require("fs");
const path = require("path");
const readline = require("readline");

const dotenv = require("dotenv");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const getBrowserLaunchAttempts = () => {
  const attempts = [];
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const channels = (process.env.PLAYWRIGHT_BROWSER_CHANNELS || "chrome,msedge")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (executablePath) {
    attempts.push({
      label: `executablePath=${executablePath}`,
      options: {
        headless: false,
        executablePath: path.resolve(executablePath),
      },
    });
  }

  for (const channel of channels) {
    attempts.push({
      label: `channel=${channel}`,
      options: {
        headless: false,
        channel,
      },
    });
  }

  attempts.push({
    label: "bundled-chromium",
    options: {
      headless: false,
    },
  });

  return attempts;
};

const launchBrowser = async () => {
  const attempts = getBrowserLaunchAttempts();
  const errors = [];

  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt.options);
    } catch (error) {
      errors.push(`${attempt.label}: ${error.message}`);
    }
  }

  throw new Error(`Unable to launch a browser for session capture. ${errors.join(" | ")}`);
};

const resolveStorageStatePath = () => {
  const configuredPath =
    process.env.PLAYWRIGHT_STORAGE_STATE_PATH || "./storage/flipkart-state.json";

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, "..", configuredPath);
};

const waitForEnter = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) => {
    rl.question(
      "After Flipkart loads and you finish login or CAPTCHA, press Enter here to save the session... ",
      resolve
    );
  });

  rl.close();
};

const captureSession = async () => {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    userAgent:
      process.env.SCRAPER_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log("Opening Flipkart in a real browser window...");
    await page.goto("https://www.flipkart.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await waitForEnter();

    const storageStatePath = resolveStorageStatePath();
    fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
    await context.storageState({ path: storageStatePath });

    console.log(`Saved Playwright storage state to: ${storageStatePath}`);
    console.log("Set PLAYWRIGHT_STORAGE_STATE_PATH to this file in backend/.env");
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
};

captureSession().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
