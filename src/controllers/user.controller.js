
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { rm } from "node:fs/promises";

const registerUser = asyncHandler(async (req, res) => {
    let fileHandled = false;

    try {
        const { username, email, fullName, password } = req.body ?? {};

        const fields = [username, email, fullName, password];

        if (
            !fields.every(
                (field) => typeof field === "string" && field.trim()
            )
        ) {
            throw new ApiError(
                400,
                "username, email, fullName, and password are required"
            );
        }

        if (!req.file?.path) {
            throw new ApiError(400, "Avatar image is required");
        }

        const normalizedUsername = username.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            $or: [
                { username: normalizedUsername },
                { email: normalizedEmail }
            ]
        });

        if (existingUser) {
            throw new ApiError(
                409,
                "User with this username or email already exists"
            );
        }

        const avatar = await uploadOnCloudinary(req.file.path);

        if (!avatar?.secure_url) {
            throw new ApiError(502, "Avatar upload failed");
        }

        fileHandled = true;

        const user = await User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            fullName: fullName.trim(),
            password,
            avatar: avatar.secure_url
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
            createdAt: user.createdAt
        };

        const isProduction = process.env.NODE_ENV === "production";

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/"
        };

        return res
            .status(201)
            .cookie("accessToken", accessToken, {
                ...cookieOptions,
                maxAge: 7 * 60 * 1000
            })
            .cookie("refreshToken", refreshToken, {
                ...cookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json(
                new ApiResponse(
                    201,
                    { user: createdUser },
                    "User registered successfully"
                )
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

    let decodedToken;

    try {
        if (!process.env.REFRESH_TOKEN_SECRET) {
            throw new Error("REFRESH_TOKEN_SECRET is not configured");
        }

        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch (error) {
        console.error("Refresh token verification failed:", error.message);

        throw new ApiError(
            401,
            "Invalid or expired refresh token"
        );
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

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/"
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 7 * 60 * 1000
        })
        .cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .json(
            new ApiResponse(
                200,
                {},
                "Access token refreshed successfully"
            )
        );
});

export { registerUser, refreshAccessToken };