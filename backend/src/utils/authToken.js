const jwt = require("jsonwebtoken");

const env = require("../config/env");

const signAuthToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
    },
    env.auth.jwtSecret,
    {
      expiresIn: env.auth.jwtExpiresIn,
    }
  );

const verifyAuthToken = (token) => jwt.verify(token, env.auth.jwtSecret);

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: env.auth.cookieSecure,
  sameSite: env.auth.cookieSameSite,
  maxAge: env.auth.cookieMaxAgeMs,
  path: "/",
});

module.exports = {
  signAuthToken,
  verifyAuthToken,
  getAuthCookieOptions,
};
