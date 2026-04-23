const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const env = require("../config/env");
const { isDatabaseConnected } = require("../config/db");
const SignupOtp = require("../models/SignupOtp");
const User = require("../models/User");
const createHttpError = require("../utils/createHttpError");
const { isMailConfigured, sendMail } = require("../utils/mailer");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const otpPattern = /^\d{6}$/;

let googleClient = null;

const getGoogleClient = () => {
  if (!env.auth.googleClientId) {
    throw createHttpError(
      503,
      "Google sign-in is not configured yet on the server."
    );
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(env.auth.googleClientId);
  }

  return googleClient;
};

const ensureDatabaseReady = () => {
  if (!isDatabaseConnected()) {
    throw createHttpError(
      503,
      "Authentication is unavailable right now because the database is offline."
    );
  }
};

const ensureEmailVerificationReady = () => {
  if (!isMailConfigured()) {
    throw createHttpError(
      503,
      "Email OTP verification is not configured yet on the server."
    );
  }
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  if (typeof user.toSafeObject === "function") {
    return user.toSafeObject();
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || "",
    authProvider: user.authProvider,
    role: user.role,
    createdAt: user.createdAt,
  };
};

const validateName = (name) => {
  const trimmedName = String(name || "").trim();

  if (trimmedName.length < 2) {
    throw createHttpError(400, "Enter a name with at least 2 characters.");
  }

  return trimmedName;
};

const validateEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!emailPattern.test(normalizedEmail)) {
    throw createHttpError(400, "Enter a valid email address.");
  }

  return normalizedEmail;
};

const validatePassword = (password) => {
  const safePassword = String(password || "");

  if (safePassword.length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters long.");
  }

  return safePassword;
};

const validateOtp = (otp) => {
  const safeOtp = String(otp || "").trim();

  if (!otpPattern.test(safeOtp)) {
    throw createHttpError(400, "Enter the 6-digit OTP sent to your email.");
  }

  return safeOtp;
};

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

const generateOtpCode = () =>
  String(crypto.randomInt(100000, 1000000));

const buildOtpExpiryDate = () =>
  new Date(Date.now() + env.auth.signupOtpExpiresMinutes * 60 * 1000);

const updateLastLogin = async (user) => {
  user.lastLoginAt = new Date();
  await user.save();
  return user;
};

const ensureEmailCanSignUp = async (email) => {
  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    return;
  }

  if (existingUser.googleId && !existingUser.passwordHash) {
    throw createHttpError(
      409,
      "This email is already linked with Google sign-in. Continue with Google."
    );
  }

  throw createHttpError(409, "An account with this email already exists.");
};

const buildOtpEmailContent = ({ name, otp }) => {
  const text = [
    `Hi ${name},`,
    "",
    `Your Price Comparison App signup OTP is ${otp}.`,
    `It will expire in ${env.auth.signupOtpExpiresMinutes} minutes.`,
    "",
    "If you did not request this code, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#132238;line-height:1.6;">
      <h2 style="margin-bottom:8px;">Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Use this OTP to finish creating your Price Comparison App account:</p>
      <div style="display:inline-block;padding:14px 20px;border-radius:12px;background:#f6f7fb;border:1px solid #dde5ef;font-size:28px;font-weight:700;letter-spacing:6px;">
        ${otp}
      </div>
      <p style="margin-top:16px;">This code will expire in ${env.auth.signupOtpExpiresMinutes} minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;

  return { text, html };
};

const requestSignupOtp = async ({ name, email, password }) => {
  ensureDatabaseReady();
  ensureEmailVerificationReady();

  const safeName = validateName(name);
  const safeEmail = validateEmail(email);
  const safePassword = validatePassword(password);

  await ensureEmailCanSignUp(safeEmail);

  const existingRequest = await SignupOtp.findOne({ email: safeEmail });

  if (existingRequest?.lastSentAt) {
    const cooldownMs = env.auth.signupOtpCooldownSeconds * 1000;
    const availableAt = existingRequest.lastSentAt.getTime() + cooldownMs;
    const remainingMs = availableAt - Date.now();

    if (remainingMs > 0) {
      throw createHttpError(
        429,
        `Please wait ${Math.ceil(remainingMs / 1000)} seconds before requesting another OTP.`
      );
    }
  }

  const otp = generateOtpCode();
  const passwordHash = await bcrypt.hash(safePassword, env.auth.bcryptRounds);
  const expiresAt = buildOtpExpiryDate();

  let otpRequest = existingRequest;

  if (!otpRequest) {
    otpRequest = new SignupOtp({ email: safeEmail });
  }

  otpRequest.name = safeName;
  otpRequest.passwordHash = passwordHash;
  otpRequest.otpHash = hashOtp(otp);
  otpRequest.expiresAt = expiresAt;
  otpRequest.lastSentAt = new Date();
  otpRequest.attemptCount = 0;
  otpRequest.resendCount = existingRequest ? (existingRequest.resendCount || 0) + 1 : 0;

  await otpRequest.save();

  try {
    const { text, html } = buildOtpEmailContent({ name: safeName, otp });

    await sendMail({
      to: safeEmail,
      subject: "Your Price Comparison App signup OTP",
      text,
      html,
    });
  } catch (error) {
    await SignupOtp.deleteOne({ email: safeEmail });
    throw createHttpError(
      502,
      "We couldn't send the OTP email right now. Please try again."
    );
  }

  return {
    email: safeEmail,
    expiresInMinutes: env.auth.signupOtpExpiresMinutes,
  };
};

const verifySignupOtpAndCreateUser = async ({ email, otp }) => {
  ensureDatabaseReady();

  const safeEmail = validateEmail(email);
  const safeOtp = validateOtp(otp);

  const otpRequest = await SignupOtp.findOne({ email: safeEmail });

  if (!otpRequest) {
    throw createHttpError(
      400,
      "No active signup OTP was found for this email. Request a new code."
    );
  }

  if (otpRequest.expiresAt.getTime() < Date.now()) {
    await SignupOtp.deleteOne({ email: safeEmail });
    throw createHttpError(400, "This OTP has expired. Request a new code.");
  }

  const submittedHash = hashOtp(safeOtp);

  if (submittedHash !== otpRequest.otpHash) {
    otpRequest.attemptCount += 1;

    if (otpRequest.attemptCount >= env.auth.signupOtpMaxAttempts) {
      await SignupOtp.deleteOne({ email: safeEmail });
      throw createHttpError(
        400,
        "Too many wrong OTP attempts. Request a new code and try again."
      );
    }

    await otpRequest.save();

    throw createHttpError(
      400,
      `OTP is incorrect. You have ${
        env.auth.signupOtpMaxAttempts - otpRequest.attemptCount
      } attempt(s) left.`
    );
  }

  await ensureEmailCanSignUp(safeEmail);

  const user = await User.create({
    name: otpRequest.name,
    email: otpRequest.email,
    passwordHash: otpRequest.passwordHash,
    authProvider: "local",
  });

  await SignupOtp.deleteOne({ email: safeEmail });

  return sanitizeUser(await updateLastLogin(user));
};

const loginUser = async ({ email, password }) => {
  ensureDatabaseReady();

  const safeEmail = validateEmail(email);
  const safePassword = validatePassword(password);

  const user = await User.findOne({ email: safeEmail });

  if (!user) {
    throw createHttpError(401, "Email or password is incorrect.");
  }

  if (!user.passwordHash) {
    throw createHttpError(
      401,
      "This account uses Google sign-in. Continue with Google."
    );
  }

  const isPasswordValid = await bcrypt.compare(safePassword, user.passwordHash);

  if (!isPasswordValid) {
    throw createHttpError(401, "Email or password is incorrect.");
  }

  return sanitizeUser(await updateLastLogin(user));
};

const authenticateGoogleUser = async ({ credential }) => {
  ensureDatabaseReady();

  if (!credential) {
    throw createHttpError(400, "Google sign-in did not return a credential.");
  }

  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.auth.googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload.email_verified) {
    throw createHttpError(
      401,
      "Google sign-in did not return a verified email address."
    );
  }

  const email = normalizeEmail(payload.email);
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      googleId: payload.sub,
      avatarUrl: payload.picture || "",
      authProvider: "google",
    });
  } else {
    user.googleId = payload.sub;
    user.avatarUrl = payload.picture || user.avatarUrl || "";
    user.name = payload.name || user.name;

    if (user.passwordHash && user.authProvider === "local") {
      user.authProvider = "hybrid";
    } else if (!user.passwordHash) {
      user.authProvider = "google";
    }

    await user.save();
  }

  await SignupOtp.deleteOne({ email });

  return sanitizeUser(await updateLastLogin(user));
};

const getUserById = async (userId) => {
  ensureDatabaseReady();

  const user = await User.findById(userId);

  if (!user) {
    throw createHttpError(401, "Your session is no longer valid. Please log in again.");
  }

  return sanitizeUser(user);
};

module.exports = {
  requestSignupOtp,
  verifySignupOtpAndCreateUser,
  loginUser,
  authenticateGoogleUser,
  getUserById,
};
