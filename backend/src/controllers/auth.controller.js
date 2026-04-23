const env = require("../config/env");
const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const { signAuthToken, getAuthCookieOptions } = require("../utils/authToken");

const sendSessionResponse = (res, user, message) => {
  const token = signAuthToken({ _id: user.id, role: user.role });

  res.cookie(env.auth.cookieName, token, getAuthCookieOptions());

  return res.status(200).json({
    message,
    user,
  });
};

const requestSignupOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestSignupOtp(req.body || {});

  return res.status(200).json({
    message: `OTP sent to ${result.email}. It will expire in ${result.expiresInMinutes} minutes.`,
    email: result.email,
    expiresInMinutes: result.expiresInMinutes,
  });
});

const verifySignupOtp = asyncHandler(async (req, res) => {
  const user = await authService.verifySignupOtpAndCreateUser(req.body || {});
  return sendSessionResponse(res, user, "Account created successfully.");
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.loginUser(req.body || {});
  return sendSessionResponse(res, user, "Logged in successfully.");
});

const loginWithGoogle = asyncHandler(async (req, res) => {
  const user = await authService.authenticateGoogleUser(req.body || {});
  return sendSessionResponse(res, user, "Logged in with Google.");
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(env.auth.cookieName, {
    ...getAuthCookieOptions(),
    expires: new Date(0),
  });

  return res.status(200).json({
    message: "Logged out successfully.",
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);

  return res.status(200).json({
    user,
  });
});

module.exports = {
  requestSignupOtp,
  verifySignupOtp,
  login,
  loginWithGoogle,
  logout,
  getCurrentUser,
};
