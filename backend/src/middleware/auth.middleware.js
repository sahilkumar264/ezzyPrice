const env = require("../config/env");
const { isDatabaseConnected } = require("../config/db");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const createHttpError = require("../utils/createHttpError");
const { verifyAuthToken } = require("../utils/authToken");

const getTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.[env.auth.cookieName];

  if (cookieToken) {
    return cookieToken;
  }

  const authorizationHeader = req.headers.authorization || "";

  if (authorizationHeader.startsWith("Bearer ")) {
    return authorizationHeader.slice(7).trim();
  }

  return "";
};

const requireAuth = asyncHandler(async (req, res, next) => {
  if (!isDatabaseConnected()) {
    throw createHttpError(
      503,
      "Authentication is unavailable right now because the database is offline."
    );
  }

  const token = getTokenFromRequest(req);

  if (!token) {
    throw createHttpError(401, "Please log in to continue.");
  }

  let payload;

  try {
    payload = verifyAuthToken(token);
  } catch (error) {
    throw createHttpError(401, "Your session has expired. Please log in again.");
  }

  const user = await User.findById(payload.sub)
    .select("_id name email avatarUrl authProvider role createdAt")
    .lean();

  if (!user) {
    throw createHttpError(401, "Your session is no longer valid. Please log in again.");
  }

  req.user = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || "",
    authProvider: user.authProvider,
    role: user.role,
    createdAt: user.createdAt,
  };

  next();
});

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(createHttpError(403, "You do not have permission for this action."));
  }

  return next();
};

module.exports = {
  requireAuth,
  authorizeRoles,
};
