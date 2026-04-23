const express = require("express");

const productController = require("../controllers/product.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/search", productController.searchProducts);
router.get("/recent", productController.getRecentSearches);

module.exports = router;
