const path = require("path");
const { chromium } = require("playwright");

let browserPromise = null;
let processHooksRegistered = false;

const buildBaseLaunchOptions = (playwrightConfig) => ({
  headless: playwrightConfig.headless,
  timeout: playwrightConfig.launchTimeoutMs,
  args: [
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--disable-features=IsolateOrigins,site-per-process",
  ],
});

const buildLaunchAttempts = (playwrightConfig) => {
  const baseOptions = buildBaseLaunchOptions(playwrightConfig);
  const attempts = [];

  if (playwrightConfig.executablePath) {
    attempts.push({
      label: `executablePath=${playwrightConfig.executablePath}`,
      options: {
        ...baseOptions,
        executablePath: path.resolve(playwrightConfig.executablePath),
      },
    });
  }

  for (const channel of playwrightConfig.browserChannels) {
    attempts.push({
      label: `channel=${channel}`,
      options: {
        ...baseOptions,
        channel,
      },
    });
  }

  attempts.push({
    label: "bundled-chromium",
    options: baseOptions,
  });

  return attempts;
};

const launchBrowser = async (playwrightConfig) => {
  const attempts = buildLaunchAttempts(playwrightConfig);
  const errors = [];

  for (const attempt of attempts) {
    try {
      const browser = await chromium.launch(attempt.options);
      browser.on("disconnected", () => {
        browserPromise = null;
      });
      return browser;
    } catch (error) {
      errors.push(`${attempt.label}: ${error.message}`);
    }
  }

  throw new Error(`Unable to launch Playwright browser. ${errors.join(" | ")}`);
};

const closeSharedBrowser = async () => {
  if (!browserPromise) {
    return;
  }

  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (error) {
    // Ignore browser close errors during shutdown.
  } finally {
    browserPromise = null;
  }
};

const registerProcessHooks = () => {
  if (processHooksRegistered) {
    return;
  }

  processHooksRegistered = true;

  process.once("exit", () => {
    browserPromise = null;
  });

  process.once("SIGINT", async () => {
    await closeSharedBrowser();
    process.exit(0);
  });

  process.once("SIGTERM", async () => {
    await closeSharedBrowser();
    process.exit(0);
  });
};

const getSharedBrowser = async (playwrightConfig) => {
  registerProcessHooks();

  if (!browserPromise) {
    browserPromise = launchBrowser(playwrightConfig).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }

  return browserPromise;
};

module.exports = {
  getSharedBrowser,
  closeSharedBrowser,
};

