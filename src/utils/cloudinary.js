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

export { uploadOnCloudinary };