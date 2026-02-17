const User = require("../models/User");
const Token = require("../models/Token");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { randomToken, hashToken } = require("../utils/crypto");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
} = require("../utils/jwt");
const { sendMail } = require("../config/email");

exports.validateRegister = [
  body("name").trim().notEmpty().isLength({ max: 80 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  validate,
];

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });

    const user = await User.create({
      name,
      email,
      password,
      role: role || "member",
    });
    const tokenPlain = randomToken();
    const tokenHash = hashToken(tokenPlain);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await Token.create({
      user: user._id,
      type: "verify_email",
      tokenHash,
      expiresAt,
    });

    const verifyUrl = `${process.env.APP_BASE_URL}/api/v1/auth/verify-email/${tokenPlain}`;
    await sendMail({
      to: user.email,
      subject: "Verify your Project Camp account",
      html: `<p>Hello ${user.name},</p><p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Registration successful. Please check your email to verify.",
      });
  } catch (err) {
    next(err);
  }
};

exports.validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validate,
];

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    const match = await user.comparePassword(password);
    if (!match)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    if (!user.isVerified)
      return res
        .status(403)
        .json({ success: false, message: "Email not verified" });

    const accessToken = signAccessToken({ userId: user._id, role: user.role });
    const refreshToken = signRefreshToken({
      userId: user._id,
      role: user.role,
    });

    // Store refresh whitelist
    const tokenHash = hashToken(refreshToken);
    const expMs = parseJwtExp(refreshToken);
    await Token.create({
      user: user._id,
      type: "refresh_whitelist",
      tokenHash,
      expiresAt: new Date(expMs),
    });

    setRefreshCookie(res, refreshToken);
    res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

function parseJwtExp(token) {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString(),
  );
  return payload.exp * 1000;
}

function setRefreshCookie(res, token) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
      const tokenHash = require("../utils/crypto").hashToken(refreshToken);
      await Token.deleteOne({ type: "refresh_whitelist", tokenHash });
    }
    res.clearCookie("refresh_token");
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

exports.currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("name email role");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken)
      return res
        .status(401)
        .json({ success: false, message: "Missing refresh token" });

    const payload = verifyRefresh(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const found = await Token.findOne({
      type: "refresh_whitelist",
      tokenHash,
      user: payload.userId,
    });
    if (!found)
      return res
        .status(401)
        .json({ success: false, message: "Refresh token invalidated" });

    const newAccess = signAccessToken({
      userId: payload.userId,
      role: payload.role,
    });
    res.json({ success: true, accessToken: newAccess });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { verificationToken } = req.params;
    const tokenHash = require("../utils/crypto").hashToken(verificationToken);
    const record = await Token.findOne({ type: "verify_email", tokenHash });
    if (!record)
      return res.status(400).send("Invalid or expired verification token");

    await User.findByIdAndUpdate(record.user, { isVerified: true });
    await Token.deleteMany({ user: record.user, type: "verify_email" });
    res.send("Email verified. You can close this tab and log in.");
  } catch (err) {
    next(err);
  }
};

exports.validateChangePassword = [
  body("oldPassword").notEmpty(),
  body("newPassword").isLength({ min: 6 }),
  validate,
];

exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("+password");
    const { oldPassword, newPassword } = req.body;
    const ok = await user.comparePassword(oldPassword);
    if (!ok)
      return res
        .status(400)
        .json({ success: false, message: "Old password incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password changed" });
  } catch (err) {
    next(err);
  }
};

exports.validateForgotPassword = [
  body("email").isEmail().normalizeEmail(),
  validate,
];

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const tokenPlain = randomToken();
      const tokenHash = hashToken(tokenPlain);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30m
      await Token.create({
        user: user._id,
        type: "reset_password",
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${process.env.APP_BASE_URL}/reset-password.html?token=${tokenPlain}`;
      await sendMail({
        to: user.email,
        subject: "Reset your Project Camp password",
        html: `<p>Hello ${user.name},</p><p>Reset here: <a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    }
    res.json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

exports.validateResetPassword = [
  body("newPassword").isLength({ min: 6 }),
  validate,
];

exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken } = req.params;
    const { newPassword } = req.body;
    const tokenHash = require("../utils/crypto").hashToken(resetToken);
    const record = await Token.findOne({ type: "reset_password", tokenHash });
    if (!record)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });

    const user = await User.findById(record.user).select("+password");
    user.password = newPassword;
    await user.save();
    await Token.deleteMany({ user: user._id, type: "reset_password" });
    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.isVerified)
      return res
        .status(400)
        .json({ success: false, message: "Already verified" });

    await Token.deleteMany({ user: user._id, type: "verify_email" });
    const tokenPlain = randomToken();
    const tokenHash = hashToken(tokenPlain);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await Token.create({
      user: user._id,
      type: "verify_email",
      tokenHash,
      expiresAt,
    });

    const verifyUrl = `${process.env.APP_BASE_URL}/api/v1/auth/verify-email/${tokenPlain}`;
    await sendMail({
      to: user.email,
      subject: "Verify your Project Camp account",
      html: `<p>Hello ${user.name},</p><p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
    res.json({ success: true, message: "Verification email resent" });
  } catch (err) {
    next(err);
  }
};
