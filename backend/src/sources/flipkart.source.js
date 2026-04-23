const axios = require("axios");

const { normalizeOffer, toAbsoluteUrl } = require("../utils/offerNormalizer");
const {
  createFlipkartProductSchema,
  createStagehandForFlipkart,
} = require("../utils/stagehandClient");

class FlipkartSource {
  constructor(env) {
    this.id = "flipkart";
    this.name = "Flipkart";
    this.sourceType = "hybrid";
    this.enabled = env.sources.flipkart.enabled;
    this.affiliateId = env.sources.flipkart.affiliateId;
    this.affiliateToken = env.sources.flipkart.affiliateToken;
    this.stagehandConfig = env.sources.flipkart.stagehand;
    this.maxResultsPerSource = Math.min(env.maxResultsPerSource, 10);
    this.timeout = env.requestTimeoutMs;
    this.apiUrl = "https://affiliate-api.flipkart.net/affiliate/1.0/search.json";
    this.baseUrl = "https://www.flipkart.com";
  }

  hasPlaceholderValue(value, prefix) {
    return !value || String(value).startsWith(prefix);
  }

  hasAffiliateApiCredentials() {
    return Boolean(
      !this.hasPlaceholderValue(this.affiliateId, "your-flipkart-affiliate-id") &&
        !this.hasPlaceholderValue(this.affiliateToken, "your-flipkart-affiliate-token")
    );
  }

  hasStagehandCredentials() {
    return Boolean(
      this.stagehandConfig?.modelApiKey &&
        !/^https?:\/\//i.test(String(this.stagehandConfig.modelApiKey))
    );
  }

  isAvailable() {
    return this.enabled;
  }

  getUnavailableReason() {
    return "Source is turned off in the current setup.";
  }

  sanitizeProductUrl(value) {
    const absoluteUrl = toAbsoluteUrl(value, this.baseUrl);

    try {
      const url = new URL(absoluteUrl);

      if (!/flipkart\.com$/i.test(url.hostname) || !/\/p\//i.test(url.pathname)) {
        return absoluteUrl;
      }

      const cleanedUrl = new URL(url.origin + url.pathname);

      ["pid", "lid", "marketplace"].forEach((key) => {
        const parameterValue = url.searchParams.get(key);

        if (parameterValue) {
          cleanedUrl.searchParams.set(key, parameterValue);
        }
      });

      return cleanedUrl.toString();
    } catch (error) {
      return absoluteUrl;
    }
  }

  extractApiPrice(product) {
    return (
      product?.flipkartSpecialPrice?.amount ??
      product?.flipkartSellingPrice?.amount ??
      product?.sellingPrice?.amount ??
      product?.minimumSellingPrice?.amount ??
      null
    );
  }

  extractApiCurrency(product) {
    return (
      product?.flipkartSpecialPrice?.currency ||
      product?.flipkartSellingPrice?.currency ||
      product?.sellingPrice?.currency ||
      product?.minimumSellingPrice?.currency ||
      "INR"
    );
  }

  extractApiImage(product) {
    return (
      product?.imageUrls?.unknown ||
      product?.imageUrls?.["400x400"] ||
      product?.imageUrls?.["275x275"] ||
      product?.imageUrls?.["200x200"] ||
      ""
    );
  }

  extractApiAvailability(product) {
    if (product?.isAvailable === false) {
      return "Unavailable";
    }

    if (product?.inStock === false) {
      return "Out of stock";
    }

    return "Available";
  }

  getApiProductList(responseData) {
    if (Array.isArray(responseData?.productInfoList)) {
      return responseData.productInfoList;
    }

    if (Array.isArray(responseData?.products?.productInfoList)) {
      return responseData.products.productInfoList;
    }

    return [];
  }

  async searchViaApi(query) {
    const response = await axios.get(this.apiUrl, {
      timeout: this.timeout,
      headers: {
        "Fk-Affiliate-Id": this.affiliateId,
        "Fk-Affiliate-Token": this.affiliateToken,
        Accept: "application/json",
      },
      params: {
        query,
        resultCount: this.maxResultsPerSource,
      },
    });

    const items = this.getApiProductList(response.data);

    return items
      .map((item) => {
        const product =
          item?.productBaseInfoV1 ||
          item?.productBaseInfo?.productAttributes ||
          item?.productBaseInfo ||
          null;
        const shippingInfo =
          item?.productShippingInfoV1 || item?.productShippingBaseInfo || {};

        if (!product) {
          return null;
        }

        return normalizeOffer({
          platform: "Flipkart",
          sourceId: this.id,
          sourceType: "api",
          title: product?.title,
          price: this.extractApiPrice(product),
          currency: this.extractApiCurrency(product),
          productUrl: this.sanitizeProductUrl(product?.productUrl),
          imageUrl: this.extractApiImage(product),
          availability: this.extractApiAvailability(product),
          seller: shippingInfo?.sellerName || "",
          shipping: shippingInfo?.shippingCharges?.amount
            ? `${shippingInfo.shippingCharges.amount} ${shippingInfo.shippingCharges.currency || "INR"}`
            : "",
        });
      })
      .filter(Boolean)
      .slice(0, this.maxResultsPerSource);
  }

  getStagehandErrorMessage(error) {
    const message = String(error?.message || error || "");
    const modelName = String(this.stagehandConfig?.model || "");
    const isGemini = modelName.startsWith("google/");

    if (/unsupported model/i.test(message) || /model not supported/i.test(message)) {
      return isGemini
        ? "Flipkart Stagehand model is not supported. Use FLIPKART_STAGEHAND_MODEL=google/gemini-2.5-flash."
        : "Flipkart Stagehand model is not supported. Use FLIPKART_STAGEHAND_MODEL=openai/gpt-4.1-mini or google/gemini-2.5-flash.";
    }

    if (/structured outputs/i.test(message)) {
      return isGemini
        ? "Flipkart Stagehand model must support structured outputs. Use google/gemini-2.5-flash."
        : "Flipkart Stagehand model must support structured outputs. Use openai/gpt-4.1-mini or google/gemini-2.5-flash.";
    }

    if (/insufficient_quota/i.test(message) || /quota/i.test(message) || /billing/i.test(message)) {
      return isGemini
        ? "Gemini key was accepted, but the project has no quota or billing for Flipkart Stagehand."
        : "Model key was accepted, but the project has no quota or billing for Flipkart Stagehand.";
    }

    if (/unauthorized/i.test(message) || /invalid api key/i.test(message) || /api key not found/i.test(message)) {
      return isGemini
        ? "Flipkart needs a working Gemini API key. Add GEMINI_API_KEY, GOOGLE_API_KEY, or FLIPKART_STAGEHAND_MODEL_API_KEY."
        : "Flipkart needs a working model API key. Add GEMINI_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY, or FLIPKART_STAGEHAND_MODEL_API_KEY.";
    }

    if (
      /access is denied/i.test(message) ||
      /econnrefused\s+127\.0\.0\.1/i.test(message) ||
      /timed out waiting for \/json\/version/i.test(message) ||
      /platform_channel\.cc/i.test(message)
    ) {
      return "Flipkart Stagehand could not start Chrome from this restricted terminal. Run the backend from a normal Windows PowerShell or Command Prompt window, then try again. If Chrome is installed in a non-default location, set FLIPKART_STAGEHAND_EXECUTABLE_PATH.";
    }

    if (/chrome/i.test(message) || /executable/i.test(message) || /browser/i.test(message)) {
      return "Flipkart Stagehand could not start a local Chrome or Edge browser. Install Chrome, or set FLIPKART_STAGEHAND_EXECUTABLE_PATH to chrome.exe or msedge.exe.";
    }

    return message || "Flipkart Stagehand request failed.";
  }

  async closeLoginPopupIfPresent(page) {
    await page.evaluate(() => {
      const closeButton = Array.from(document.querySelectorAll("button")).find((button) => {
        const ariaLabel = (button.getAttribute("aria-label") || "").toLowerCase();
        const text = (button.textContent || "").trim().toLowerCase();
        const className = button.className || "";

        return (
          ariaLabel.includes("close") ||
          text === "x" ||
          text === "close" ||
          String(className).includes("_2doB4z")
        );
      });

      if (closeButton instanceof HTMLElement) {
        closeButton.click();
      }
    });
  }

  async extractProductsFromDom(page) {
    const maxResults = this.maxResultsPerSource;

    const rawProducts = await page.evaluate((limit) => {
      const pickText = (root, selectors) => {
        for (const selector of selectors) {
          const element = root.querySelector(selector);
          const text = element?.textContent?.trim();

          if (text) {
            return text;
          }
        }

        return "";
      };

      const normalizeTitle = (value) =>
        String(value || "")
          .replace(/^add to compare/i, "")
          .replace(/^currently unavailable/i, "")
          .replace(/^coming soon/i, "")
          .trim();

      const normalizePrice = (value) => String(value || "").replace(/[^0-9.]/g, "");

      const isValidProductHref = (value) => {
        const href = String(value || "");
        return /\/p\//i.test(href) && !/\/search\?/i.test(href);
      };

      const pickAnchor = (root) => {
        const candidates = [
          root.querySelector("a.k7wcnx[href*='/p/']"),
          root.querySelector("a.CGtC98[href*='/p/']"),
          root.querySelector("a._1fQZEK[href*='/p/']"),
          root.querySelector("a.WKTcLC[href*='/p/']"),
          root.querySelector("a.IRpwTa[href*='/p/']"),
          root.querySelector("a.s1Q9rs[href*='/p/']"),
          root.querySelector("a[href*='/p/']"),
        ].filter(Boolean);

        return candidates.find((anchor) => isValidProductHref(anchor?.getAttribute("href") || anchor?.href)) || null;
      };

      const pickImage = (root) => {
        const image = root.querySelector("img.UCc1lI, img.DByuf4, img._396cs4, img._2r_T1I, img");

        if (!image) {
          return "";
        }

        const candidates = [
          image.currentSrc,
          image.getAttribute("src"),
          image.getAttribute("data-src"),
          image.getAttribute("data-lazy-src"),
          image.getAttribute("srcset"),
          image.getAttribute("data-srcset"),
        ].filter(Boolean);

        for (const candidate of candidates) {
          const value = String(candidate).trim();

          if (!value || value.startsWith("data:image")) {
            continue;
          }

          if (value.includes(",")) {
            const firstItem = value.split(",")[0]?.trim().split(/\s+/)[0];
            if (firstItem && !firstItem.startsWith("data:image")) {
              return firstItem;
            }
          }

          if (value.includes(" ")) {
            const firstToken = value.split(/\s+/)[0];
            if (firstToken && !firstToken.startsWith("data:image")) {
              return firstToken;
            }
          }

          return value;
        }

        return "";
      };

      const pickAvailability = (root) => {
        const text = String(root.textContent || "").toLowerCase();

        if (text.includes("currently unavailable")) {
          return "Currently unavailable";
        }

        if (text.includes("coming soon")) {
          return "Coming soon";
        }

        if (text.includes("out of stock")) {
          return "Out of stock";
        }

        return "Available";
      };

      const cards = Array.from(document.querySelectorAll("div[data-id]"));
      const results = [];

      for (const root of cards) {
        const anchor = pickAnchor(root);
        const href = anchor?.getAttribute("href") || anchor?.href || "";

        if (!isValidProductHref(href)) {
          continue;
        }

        const title = normalizeTitle(
          pickText(root, [
            "div.RG5Slk",
            "div.KzDlHZ",
            "div._4rR01T",
            "div._2WkVRV",
            "a.k7wcnx",
            "a.WKTcLC",
            "a.IRpwTa",
            "a.s1Q9rs",
          ]) || anchor?.getAttribute("title") || anchor?.textContent || ""
        );

        const price = normalizePrice(
          pickText(root, [
            "div.hZ3P6w.DeU9vF",
            "div.hZ3P6w",
            "div.QiMO5r div",
            "div.oFEPlD",
            "div.Nx9bqj",
            "div._30jeq3",
            "div.yRaY8j",
            "div._30jeq3._1_WHN1",
            "span.Nx9bqj",
          ])
        );

        if (!title || !price) {
          continue;
        }

        results.push({
          title,
          price,
          productUrl: href,
          imageUrl: pickImage(root),
          rating: pickText(root, ["div.MKiFS6", "span.CjyrHS", "div.XQDdHH", "div._3LWZlK", "span._2_R_DZ"]),
          seller: pickText(root, ["div.syl9yP", "div._2WkVRV"]),
          availability: pickAvailability(root),
        });

        if (results.length >= limit + 4) {
          break;
        }
      }

      return results;
    }, maxResults);

    const offers = [];
    const seenUrls = new Set();

    rawProducts.forEach((product) => {
      const offer = normalizeOffer({
        platform: "Flipkart",
        sourceId: this.id,
        sourceType: "browser-dom",
        title: product.title,
        price: product.price,
        currency: "INR",
        productUrl: this.sanitizeProductUrl(product.productUrl),
        imageUrl: toAbsoluteUrl(product.imageUrl, this.baseUrl),
        availability: product.availability || "Available",
        seller: product.seller || "",
        rating: product.rating || "",
      });

      if (!offer || seenUrls.has(offer.productUrl)) {
        return;
      }

      offers.push(offer);
      seenUrls.add(offer.productUrl);
    });

    return offers.slice(0, this.maxResultsPerSource);
  }

  normalizeAiProducts(products) {
    const offers = [];
    const seenUrls = new Set();

    (products || []).forEach((product) => {
      const normalizedUrl = this.sanitizeProductUrl(product.productUrl);

      if (!/\/p\//i.test(normalizedUrl)) {
        return;
      }

      const offer = normalizeOffer({
        platform: "Flipkart",
        sourceId: this.id,
        sourceType: "ai-agent",
        title: product.title,
        price: product.price,
        currency: "INR",
        productUrl: normalizedUrl,
        imageUrl: toAbsoluteUrl(product.imageUrl, this.baseUrl),
        availability: product.availability || "Available",
        seller: product.seller || "",
        rating: product.rating || "",
      });

      if (!offer || seenUrls.has(offer.productUrl)) {
        return;
      }

      offers.push(offer);
      seenUrls.add(offer.productUrl);
    });

    return offers.slice(0, this.maxResultsPerSource);
  }

  async searchViaStagehand(query) {
    if (!this.hasStagehandCredentials()) {
      throw new Error(
        "Add a Gemini, Google, or OpenAI key to use Flipkart browser extraction."
      );
    }

    const stagehand = createStagehandForFlipkart(this.stagehandConfig);

    try {
      await stagehand.init();
      const page = stagehand.context.pages()[0];

      await page.goto(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(2500);
      await this.closeLoginPopupIfPresent(page).catch(() => {});
      await page.waitForTimeout(1200);

      const domOffers = await this.extractProductsFromDom(page);

      if (domOffers.length) {
        return domOffers;
      }

      const extracted = await stagehand.extract(
        `Extract up to ${this.maxResultsPerSource} real Flipkart product results for the current search page. Return only actual product cards that are visible on the results page. Ignore ads, sponsored content, banners, carousels, filters, and navigation. Use absolute product URLs that open a real Flipkart product page and contain /p/. For imageUrl, return the visible product image source URL when available, otherwise return an empty string. Price must be the current numeric price only, without currency symbols or commas. If a field is unavailable, return an empty string.`,
        createFlipkartProductSchema(),
        {
          timeout: this.stagehandConfig.timeoutMs,
        }
      );

      const offers = this.normalizeAiProducts(extracted.products || []);

      if (!offers.length) {
        throw new Error(
          "Flipkart opened, but no products could be read from the page."
        );
      }

      return offers;
    } catch (error) {
      throw new Error(this.getStagehandErrorMessage(error));
    } finally {
      await stagehand.close().catch(() => {});
    }
  }

  async search(query) {
    if (this.hasAffiliateApiCredentials()) {
      try {
        return await this.searchViaApi(query);
      } catch (error) {
        return this.searchViaStagehand(query);
      }
    }

    return this.searchViaStagehand(query);
  }
}

const createFlipkartSource = (env) => new FlipkartSource(env);

module.exports = {
  createFlipkartSource,
};



