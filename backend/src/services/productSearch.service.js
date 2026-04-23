const SearchHistory = require("../models/SearchHistory");
const env = require("../config/env");
const { isDatabaseConnected } = require("../config/db");
const { getCacheJson, setCacheJson, deleteCacheKeys } = require("../config/redis");
const { createEbaySource } = require("../sources/ebay.source");
const { createAmazonSource } = require("../sources/amazon.source");
const { createFlipkartSource } = require("../sources/flipkart.source");
const { createSnapdealSource } = require("../sources/snapdeal.source");

const MAX_RECENT_SEARCH_LIMIT = 12;

const normalizeSearchQuery = (query) =>
  String(query || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const buildSearchCacheKey = (query) => `search:${normalizeSearchQuery(query)}`;
const buildRecentSearchesCacheKey = (userId, limit) =>
  `recent-searches:${userId}:${limit}`;

const getSources = () => [
  createEbaySource(env),
  createAmazonSource(env),
  createFlipkartSource(env),
  createSnapdealSource(env),
];

const createSourceStatus = (source, resultCount) => ({
  sourceId: source.id,
  name: source.name,
  sourceType: source.sourceType,
  status: "success",
  resultCount,
  message: "",
});

const buildSummary = (offers) => {
  const currencies = offers.reduce((accumulator, offer) => {
    accumulator[offer.currency] = (accumulator[offer.currency] || 0) + 1;
    return accumulator;
  }, {});

  const primaryCurrency =
    Object.entries(currencies).sort((left, right) => right[1] - left[1])[0]?.[0] ||
    "";

  const bestOffer = primaryCurrency
    ? offers
        .filter((offer) => offer.currency === primaryCurrency)
        .sort((left, right) => left.price - right.price)[0] || null
    : null;

  const currencyNote =
    Object.keys(currencies).length > 1
      ? `Results include multiple currencies, so the lowest offer is highlighted within ${primaryCurrency}.`
      : "";

  return {
    totalOffers: offers.length,
    platformCount: new Set(offers.map((offer) => offer.platform)).size,
    primaryCurrency,
    currencyNote,
    searchedAt: new Date().toISOString(),
    bestOffer,
  };
};

const persistSearch = async ({ userId, query, offers, sources, summary }) => {
  if (!isDatabaseConnected() || !userId) {
    return false;
  }

  await SearchHistory.create({
    user: userId,
    query,
    offers,
    sources,
    summary,
  });

  return true;
};

const clearRecentSearchCache = async (userId) => {
  if (!userId) {
    return;
  }

  const keys = Array.from(
    { length: MAX_RECENT_SEARCH_LIMIT },
    (_, index) => buildRecentSearchesCacheKey(userId, index + 1)
  );

  await deleteCacheKeys(keys);
};

const searchProducts = async (query, userId) => {
  const trimmedQuery = String(query || "").trim();
  const searchCacheKey = buildSearchCacheKey(trimmedQuery);
  const cachedResponse = await getCacheJson(searchCacheKey);

  if (cachedResponse) {
    const summary = {
      ...cachedResponse.summary,
      searchedAt: new Date().toISOString(),
    };
    const persisted = await persistSearch({
      userId,
      query: trimmedQuery,
      offers: cachedResponse.offers,
      sources: cachedResponse.sources,
      summary,
    });

    if (persisted) {
      await clearRecentSearchCache(userId);
    }

    return {
      ...cachedResponse,
      query: trimmedQuery,
      summary,
      persisted,
    };
  }

  const sources = getSources();
  const settledResults = await Promise.all(
    sources.map(async (source) => {
      if (!source.isAvailable()) {
        return null;
      }

      try {
        const offers = await source.search(trimmedQuery);

        if (!offers.length) {
          return null;
        }

        return {
          offers,
          sourceStatus: createSourceStatus(source, offers.length),
        };
      } catch (error) {
        if (env.nodeEnv !== "test") {
          console.warn(`[searchProducts] ${source.name} failed: ${error.message}`);
        }

        return null;
      }
    })
  );

  const successfulResults = settledResults.filter(Boolean);
  const offers = successfulResults
    .flatMap((result) => result.offers)
    .sort((left, right) => left.price - right.price);

  const summary = buildSummary(offers);
  const visibleSources = successfulResults.map((result) => result.sourceStatus);
  const persisted = await persistSearch({
    userId,
    query: trimmedQuery,
    offers,
    sources: visibleSources,
    summary,
  });

  if (persisted) {
    await clearRecentSearchCache(userId);
  }

  const response = {
    query: trimmedQuery,
    summary,
    offers,
    sources: visibleSources,
    persisted,
  };

  await setCacheJson(searchCacheKey, response, env.redis.searchTtlSeconds);

  return response;
};

const getRecentSearches = async (limit, userId) => {
  const safeLimit = Math.min(Number(limit) || 6, MAX_RECENT_SEARCH_LIMIT);
  const recentSearchesCacheKey = buildRecentSearchesCacheKey(userId, safeLimit);
  const cachedItems = await getCacheJson(recentSearchesCacheKey);

  if (Array.isArray(cachedItems)) {
    return cachedItems;
  }

  if (!isDatabaseConnected() || !userId) {
    return [];
  }

  const records = await SearchHistory.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  const items = records.map((record) => ({
    id: String(record._id),
    query: record.query,
    searchedAt: record.summary?.searchedAt || record.createdAt,
    totalOffers: record.summary?.totalOffers || 0,
    bestOffer: record.summary?.bestOffer || null,
  }));

  await setCacheJson(
    recentSearchesCacheKey,
    items,
    env.redis.recentSearchesTtlSeconds
  );

  return items;
};

module.exports = {
  searchProducts,
  getRecentSearches,
};
