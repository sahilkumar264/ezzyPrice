const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./auth.routes");
const productRoutes = require("./product.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

router.use("/products", productRoutes);
router.use("/auth", authRoutes);

module.exports = router;
