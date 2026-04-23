const express = require("express");

const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/signup/request-otp", authController.requestSignupOtp);
router.post("/signup/verify-otp", authController.verifySignupOtp);
router.post("/login", authController.login);
router.post("/google", authController.loginWithGoogle);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.getCurrentUser);

module.exports = router;
