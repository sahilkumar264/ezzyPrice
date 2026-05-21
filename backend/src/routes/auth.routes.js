const express = require("express");
const { rateLimit } = require("express-rate-limit");

const env = require("../config/env");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: env.auth.rateLimitWindowMs,
  limit: env.auth.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many auth attempts right now. Please wait a bit and try again.",
  },
});

router.post("/signup/request-otp", authLimiter, authController.requestSignupOtp);
router.post("/signup/verify-otp", authLimiter, authController.verifySignupOtp);
router.post("/login", authLimiter, authController.login);
router.post("/google", authLimiter, authController.loginWithGoogle);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.getCurrentUser);

module.exports = router;
