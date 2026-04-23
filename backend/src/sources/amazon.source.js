const axios = require("axios");

const { normalizeOffer } = require("../utils/offerNormalizer");

const domainCurrencyMap = {
  "amazon.in": "INR",
  "amazon.com": "USD",
  "amazon.co.uk": "GBP",
  "amazon.de": "EUR",
  "amazon.fr": "EUR",
  "amazon.es": "EUR",
  "amazon.it": "EUR",
  "amazon.nl": "EUR",
  "amazon.pl": "PLN",
  "amazon.ae": "AED",
  "amazon.sa": "SAR",
  "amazon.ca": "CAD",
  "amazon.com.au": "AUD",
  "amazon.com.mx": "MXN",
  "amazon.com.br": "BRL",
  "amazon.sg": "SGD",
  "amazon.co.jp": "JPY",
};

class AmazonSource {
  constructor(env) {
    this.id = "amazon";
    this.name = "Amazon";
    this.sourceType = "api";
    this.enabled = env.sources.amazon.enabled;
    this.serpApiKey = env.sources.amazon.serpApiKey;
    this.serpApiBaseUrl = env.sources.amazon.serpApiBaseUrl;
    this.amazonDomain = env.sources.amazon.amazonDomain;
    this.language = env.sources.amazon.language;
    this.maxResultsPerSource = Math.min(env.maxResultsPerSource, 10);
    this.timeout = env.requestTimeoutMs;
  }

  hasPlaceholderValue(value) {
    return !value || String(value).startsWith("your-serpapi-");
  }

  looksLikeUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
  }

  hasApiCredentials() {
    return !this.hasPlaceholderValue(this.serpApiKey);
  }

  isAvailable() {
    return this.enabled && this.hasApiCredentials() && !this.looksLikeUrl(this.serpApiKey);
  }

  getUnavailableReason() {
    return this.enabled
      ? "Add AMAZON_SERPAPI_KEY to use Amazon results."
      : "Source is turned off in the current setup.";
  }

  getCurrencyFallback() {
    return domainCurrencyMap[this.amazonDomain] || "USD";
  }

  extractPrice(item) {
    if (typeof item?.extracted_price === "number") {
      return item.extracted_price;
    }

    if (typeof item?.price === "string") {
      return item.price;
    }

    if (typeof item?.price === "number") {
      return item.price;
    }

    if (item?.price && typeof item.price === "object") {
      return (
        item.price.extracted_value ||
        item.price.value ||
        item.price.amount ||
        item.price.raw ||
        null
      );
    }

    return null;
  }

  extractTitle(item) {
    return item?.title || item?.name || "";
  }

  extractProductUrl(item) {
    return item?.link_clean || item?.link || "";
  }

  extractImageUrl(item) {
    return item?.thumbnail || item?.image || item?.thumbnails?.[0] || "";
  }

  extractAvailability(item) {
    return (
      item?.availability?.display_value ||
      item?.availability?.raw ||
      item?.availability ||
      "Available"
    );
  }

  extractSeller(item) {
    return item?.seller?.name || item?.brand || "";
  }

  extractShipping(item) {
    return item?.delivery || item?.shipping || "";
  }

  extractRating(item) {
    if (typeof item?.rating === "number" && typeof item?.reviews === "number") {
      return `${item.rating} (${item.reviews} reviews)`;
    }

    if (typeof item?.rating === "number") {
      return String(item.rating);
    }

    return item?.rating || "";
  }

  buildParams(query) {
    return {
      api_key: this.serpApiKey,
      engine: "amazon",
      amazon_domain: this.amazonDomain,
      k: query,
      language: this.language,
      device: "desktop",
      page: "1",
    };
  }

  normalizeItems(items) {
    const offers = [];
    const seenUrls = new Set();

    items.forEach((item) => {
      if (offers.length >= this.maxResultsPerSource) {
        return;
      }

      const offer = normalizeOffer({
        platform: "Amazon",
        sourceId: this.id,
        sourceType: "api",
        title: this.extractTitle(item),
        price: this.extractPrice(item),
        currency: this.getCurrencyFallback(),
        productUrl: this.extractProductUrl(item),
        imageUrl: this.extractImageUrl(item),
        availability: this.extractAvailability(item),
        seller: this.extractSeller(item),
        shipping: this.extractShipping(item),
        rating: this.extractRating(item),
      });

      if (!offer || seenUrls.has(offer.productUrl)) {
        return;
      }

      offers.push(offer);
      seenUrls.add(offer.productUrl);
    });

    return offers;
  }

  getAxiosErrorMessage(error) {
    if (error.response?.status === 401) {
      return "Amazon key was rejected. Paste the real SerpApi key into AMAZON_SERPAPI_KEY.";
    }

    if (error.response?.status === 403) {
      return "Amazon request was blocked by SerpApi. Check your plan, credits, or key permissions.";
    }

    return error.response?.data?.error || error.message || "Amazon request failed.";
  }

  async search(query) {
    if (!this.hasApiCredentials()) {
      throw new Error("Add AMAZON_SERPAPI_KEY to use Amazon results.");
    }

    if (this.looksLikeUrl(this.serpApiKey)) {
      throw new Error(
        "AMAZON_SERPAPI_KEY looks like a URL. Paste only the real key from your SerpApi dashboard."
      );
    }

    try {
      const response = await axios.get(this.serpApiBaseUrl, {
        timeout: this.timeout,
        params: this.buildParams(query),
      });

      if (response.data?.search_metadata?.status === "Error" || response.data?.error) {
        throw new Error(response.data?.error || "Amazon request failed.");
      }

      const items = [
        ...(Array.isArray(response.data?.organic_results) ? response.data.organic_results : []),
        ...(Array.isArray(response.data?.featured_products)
          ? response.data.featured_products
          : []),
      ];

      const offers = this.normalizeItems(items);

      if (!offers.length) {
        throw new Error("Amazon did not return any matching products.");
      }

      return offers;
    } catch (error) {
      if (error.response) {
        throw new Error(this.getAxiosErrorMessage(error));
      }

      throw error;
    }
  }
}

const createAmazonSource = (env) => new AmazonSource(env);

module.exports = {
  createAmazonSource,
};
