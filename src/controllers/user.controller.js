import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { rm } from "node:fs/promises";
import { clearAuthCookies, setAuthCookies } from "../utils/authCookies.js";

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, fullName, password } = req.body ?? {};

    const fields = [username, email, fullName, password];

    if (!fields.every((field) => typeof field === "string" && field.trim())) {
      throw new ApiError(
        400,
        "username, email, fullName, and password are required",
      );
    }

    if (!req.file?.path) {
      throw new ApiError(400, "Avatar image is required");
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      throw new ApiError(
        409,
        "User with this username or email already exists",
      );
    }

    const avatar = await uploadOnCloudinary(req.file.path);

    if (!avatar?.secure_url) {
      throw new ApiError(502, "Avatar upload failed");
    }

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      fullName: fullName.trim(),
      password,
      avatar: avatar.secure_url,
    });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const createdUser = {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    return setAuthCookies(res, accessToken, refreshToken)
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: createdUser },
          "User registered successfully",
        ),
      );
  } finally {
    if (req.file?.path) {
      await rm(req.file.path, { force: true });
    }
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is not configured");
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decodedToken._id);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is invalid or revoked");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return setAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(new ApiResponse(200, {}, "Access token refreshed successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body ?? {};
  const identifier = email ?? username;

  if (
    typeof identifier !== "string" ||
    !identifier.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    throw new ApiError(400, "Username or email and password are required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
  });

  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, "Invalid username/email or password");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const userData = {
    id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };

  return setAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(new ApiResponse(200, { user: userData }, "Login successful"));
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  return clearAuthCookies(res)
    .status(200)
    .json(new ApiResponse(200, {}, "Logout successful"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body ?? {};

  if (
    typeof oldPassword !== "string" ||
    !oldPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 8
  ) {
    throw new ApiError(
      400,
      "Current password and a new password of at least 8 characters are required",
    );
  }

  if (oldPassword === newPassword) {
    throw new ApiError(
      400,
      "New password must differ from the current password",
    );
  }

  const user = await User.findById(req.user._id);
  if (!user || !(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return setAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  const userData = {
    id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, { user: userData }, "Current user fetched"));
});

const updateCurrentUserAvatar = asyncHandler(async (req, res) => {
  try {
    if (!req.file?.path) {
      throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(req.file.path);

    if (!avatar?.secure_url) {
      throw new ApiError(502, "Avatar upload failed");
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: avatar.secure_url } },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(200, { user: userData }, "Avatar updated successfully"),
      );
  } finally {
    if (req.file?.path) {
      await rm(req.file.path, { force: true });
    }
  }
});

export {
  registerUser,
  refreshAccessToken,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  getCurrentCurrentUser,
  updateCurrentUserAvatar,
};
