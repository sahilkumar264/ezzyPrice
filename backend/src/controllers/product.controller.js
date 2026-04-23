const productSearchService = require("../services/productSearch.service");
const asyncHandler = require("../utils/asyncHandler");

const searchProducts = asyncHandler(async (req, res) => {
  const query = (req.query.q || "").trim();

  if (query.length < 2) {
    return res.status(400).json({
      message: "Enter at least 2 characters to search.",
    });
  }

  const data = await productSearchService.searchProducts(query, req.user.id);

  return res.status(200).json(data);
});

const getRecentSearches = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 12);
  const items = await productSearchService.getRecentSearches(limit, req.user.id);

  return res.status(200).json({ items });
});

module.exports = {
  searchProducts,
  getRecentSearches,
};
