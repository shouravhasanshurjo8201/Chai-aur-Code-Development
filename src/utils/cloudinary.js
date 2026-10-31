import { v2 as cloudinary } from "cloudinary";
import { promises as fs } from "node:fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;

    let uploadError;
    try {
        return await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
    } catch (error) {
        uploadError = error;
        throw error;
    } finally {
        try {
            await fs.unlink(localFilePath);
        } catch (cleanupError) {
            if (cleanupError.code !== "ENOENT") {
                if (uploadError) {
                    throw new AggregateError(
                        [uploadError, cleanupError],
                        "Cloudinary upload and temporary file cleanup failed"
                    );
                }
                throw cleanupError;
            }
        }
    }
}

const deleteFromCloudinary = async (publicId) => {
    const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image"
    });

    if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }

    return result;
};

const getCloudinaryPublicIdFromUrl = (secureUrl) => {
    let url;

    try {
        url = new URL(secureUrl);
    } catch {
        return null;
    }

    if (!url.hostname.endsWith(".cloudinary.com")) {
        return null;
    }

    const pathSegments = url.pathname.split("/").filter(Boolean);
    const uploadIndex = pathSegments.findIndex(
        (segment, index) => segment === "upload" && pathSegments[index - 1] === "image"
    );
    const versionIndex = pathSegments.findIndex(
        (segment, index) => index > uploadIndex && /^v\d+$/.test(segment)
    );

    if (uploadIndex === -1 || versionIndex === -1) {
        return null;
    }

    const publicId = pathSegments.slice(versionIndex + 1).join("/");
    return publicId.replace(/\.[^/.]+$/, "") || null;
};

export {
    uploadOnCloudinary,
    deleteFromCloudinary,
    getCloudinaryPublicIdFromUrl
};