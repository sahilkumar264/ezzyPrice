const cheerio = require("cheerio");

const { createHttpClient } = require("../utils/httpClient");
const { normalizeOffer, toAbsoluteUrl } = require("../utils/offerNormalizer");

class SnapdealSource {
  constructor(env) {
    this.id = "snapdeal-scraper";
    this.name = "Snapdeal";
    this.sourceType = "scraper";
    this.enabled = env.sources.snapdeal.enabled;
    this.maxResultsPerSource = env.maxResultsPerSource;
    this.httpClient = createHttpClient(env);
    this.baseUrl = "https://www.snapdeal.com";
  }

  isAvailable() {
    return this.enabled;
  }

  getUnavailableReason() {
    return "Source is turned off in the current setup.";
  }

  extractFromCard($, card) {
    const title = $(card).find("p.product-title").first().text().trim();
    const rawPrice =
      $(card).find("span.product-price").first().attr("display-price") ||
      $(card).find("span.product-price").first().text().trim();
    const link = $(card).find("a.dp-widget-link").first().attr("href");
    const imageUrl =
      $(card).find("img.product-image").first().attr("src") ||
      $(card).find("img.product-image").first().attr("data-src") ||
      "";

    if (!title || !rawPrice || !link) {
      return null;
    }

    return normalizeOffer({
      platform: "Snapdeal",
      sourceId: this.id,
      sourceType: this.sourceType,
      title,
      price: rawPrice,
      currency: "INR",
      productUrl: toAbsoluteUrl(link, this.baseUrl),
      imageUrl,
      availability: "Available",
    });
  }

  async search(query) {
    const response = await this.httpClient.get(
      `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}`
    );
    const $ = cheerio.load(response.data);

    const cards = $("div.product-tuple-listing").toArray();
    const offers = [];

    for (const card of cards) {
      const offer = this.extractFromCard($, card);

      if (!offer) {
        continue;
      }

      offers.push(offer);

      if (offers.length >= this.maxResultsPerSource) {
        break;
      }
    }

    return offers;
  }
}

const createSnapdealSource = (env) => new SnapdealSource(env);

module.exports = {
  createSnapdealSource,
};
