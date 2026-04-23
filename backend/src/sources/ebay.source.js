const axios = require("axios");
const cheerio = require("cheerio");

const { createHttpClient } = require("../utils/httpClient");
const { normalizeOffer, toAbsoluteUrl } = require("../utils/offerNormalizer");

const detectCurrency = (rawPrice, fallback = "USD") => {
  const priceText = String(rawPrice || "");

  if (priceText.includes("\u20B9") || priceText.includes("₹")) {
    return "INR";
  }

  if (priceText.includes("\u00A3") || priceText.includes("£")) {
    return "GBP";
  }

  if (priceText.includes("\u20AC") || priceText.includes("€")) {
    return "EUR";
  }

  return fallback;
};

class EbaySource {
  constructor(env) {
    this.id = "ebay";
    this.name = "eBay";
    this.sourceType = "hybrid";
    this.clientId = env.sources.ebay.clientId;
    this.clientSecret = env.sources.ebay.clientSecret;
    this.environment = env.sources.ebay.environment;
    this.marketplaceId = env.sources.ebay.marketplaceId;
    this.maxResultsPerSource = env.maxResultsPerSource;
    this.timeout = env.requestTimeoutMs;
    this.enabled = env.sources.ebay.enabled;
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
    this.httpClient = createHttpClient(env);
    this.baseUrl = "https://www.ebay.com";
    this.apiBaseUrl = this.resolveApiBaseUrl();
  }

  hasPlaceholderValue(value) {
    return !value || String(value).startsWith("your-ebay-");
  }

  hasApiCredentials() {
    return Boolean(
      !this.hasPlaceholderValue(this.clientId) &&
        !this.hasPlaceholderValue(this.clientSecret)
    );
  }

  isAvailable() {
    return this.enabled;
  }

  getUnavailableReason() {
    return "Source is turned off in the current setup.";
  }

  resolveEnvironment() {
    const normalizedEnvironment = String(this.environment || "auto").toLowerCase();

    if (normalizedEnvironment === "sandbox" || normalizedEnvironment === "production") {
      return normalizedEnvironment;
    }

    const sandboxSignature = [this.clientId, this.clientSecret].some((value) => {
      const normalizedValue = String(value || "");
      return /(^|[-_])SBX[-_]/i.test(normalizedValue) || normalizedValue.startsWith("SBX-");
    });

    return sandboxSignature ? "sandbox" : "production";
  }

  resolveApiBaseUrl() {
    return this.resolveEnvironment() === "sandbox"
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";
  }

  async getAccessToken() {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    );
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    });

    const response = await axios.post(
      `${this.apiBaseUrl}/identity/v1/oauth2/token`,
      body.toString(),
      {
        timeout: this.timeout,
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    this.cachedToken = response.data.access_token;
    this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

    return this.cachedToken;
  }

  async searchViaApi(query) {
    const token = await this.getAccessToken();
    const response = await axios.get(
      `${this.apiBaseUrl}/buy/browse/v1/item_summary/search`,
      {
        timeout: this.timeout,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
        },
        params: {
          q: query,
          limit: this.maxResultsPerSource,
        },
      }
    );

    const items = response.data.itemSummaries || [];

    return items
      .map((item) =>
        normalizeOffer({
          platform: "eBay",
          sourceId: this.id,
          sourceType: "api",
          title: item.title,
          price: item.price?.value,
          currency: item.price?.currency || "USD",
          productUrl: item.itemWebUrl,
          imageUrl: item.image?.imageUrl || "",
          availability: item.condition || "Available",
          seller: item.seller?.username || "",
          shipping:
            item.shippingOptions?.[0]?.shippingCostType ||
            item.shippingOptions?.[0]?.shippingCost?.value ||
            "",
          rating: item.itemOriginDate || "",
        })
      )
      .filter(Boolean);
  }

  async searchViaScraper(query) {
    const response = await this.httpClient.get(
      `${this.baseUrl}/sch/i.html?_nkw=${encodeURIComponent(query)}`,
      {
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    const html = String(response.data || "");

    if (
      response.status >= 400 ||
      /captcha/i.test(html) ||
      /pardon our interruption/i.test(html)
    ) {
      throw new Error("eBay scraper is blocked right now.");
    }

    const $ = cheerio.load(html);
    const offers = [];
    const seenUrls = new Set();

    $("li.s-item").each((index, card) => {
      if (offers.length >= this.maxResultsPerSource) {
        return false;
      }

      const title = $(card).find(".s-item__title").first().text().trim();
      const rawPrice = $(card).find(".s-item__price").first().text().trim();
      const productUrl = $(card).find("a.s-item__link").first().attr("href");
      const imageUrl =
        $(card).find(".s-item__image-img").first().attr("src") ||
        $(card).find(".s-item__image-img").first().attr("data-src") ||
        "";
      const shipping = $(card).find(".s-item__shipping").first().text().trim();
      const seller = $(card).find(".s-item__seller-info-text").first().text().trim();

      if (!title || title.toLowerCase().includes("shop on ebay")) {
        return undefined;
      }

      const offer = normalizeOffer({
        platform: "eBay",
        sourceId: this.id,
        sourceType: "scraper",
        title,
        price: rawPrice,
        currency: detectCurrency(rawPrice, "USD"),
        productUrl: toAbsoluteUrl(productUrl, this.baseUrl),
        imageUrl,
        availability: "Available",
        seller,
        shipping,
      });

      if (!offer || seenUrls.has(offer.productUrl)) {
        return undefined;
      }

      offers.push(offer);
      seenUrls.add(offer.productUrl);
      return undefined;
    });

    if (!offers.length) {
      throw new Error("eBay scraper did not find any products.");
    }

    return offers;
  }

  async search(query) {
    if (this.hasApiCredentials()) {
      try {
        return await this.searchViaApi(query);
      } catch (error) {
        return this.searchViaScraper(query);
      }
    }

    return this.searchViaScraper(query);
  }
}

const createEbaySource = (env) => new EbaySource(env);

module.exports = {
  createEbaySource,
};
