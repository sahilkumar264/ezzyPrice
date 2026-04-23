const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true },
    sourceId: { type: String, required: true },
    sourceType: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    priceDisplay: { type: String, required: true },
    currency: { type: String, required: true },
    productUrl: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    availability: { type: String, default: "Unknown" },
    seller: { type: String, default: "" },
    shipping: { type: String, default: "" },
    rating: { type: String, default: "" },
  },
  { _id: false }
);

const SourceSummarySchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true },
    name: { type: String, required: true },
    sourceType: { type: String, required: true },
    status: { type: String, required: true },
    resultCount: { type: Number, default: 0 },
    message: { type: String, default: "" },
  },
  { _id: false }
);

const BestOfferSchema = new mongoose.Schema(
  {
    platform: { type: String, default: "" },
    title: { type: String, default: "" },
    price: { type: Number, default: 0 },
    priceDisplay: { type: String, default: "" },
    currency: { type: String, default: "" },
    productUrl: { type: String, default: "" },
  },
  { _id: false }
);

const SearchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    query: { type: String, required: true, index: true },
    offers: { type: [OfferSchema], default: [] },
    sources: { type: [SourceSummarySchema], default: [] },
    summary: {
      totalOffers: { type: Number, default: 0 },
      platformCount: { type: Number, default: 0 },
      primaryCurrency: { type: String, default: "" },
      currencyNote: { type: String, default: "" },
      searchedAt: { type: Date, default: Date.now },
      bestOffer: { type: BestOfferSchema, default: null },
    },
  },
  {
    timestamps: true,
  }
);

SearchHistorySchema.index({ user: 1, createdAt: -1 });

const SearchHistory = mongoose.model("SearchHistory", SearchHistorySchema);

module.exports = SearchHistory;
