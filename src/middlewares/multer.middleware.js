import multer from "multer";
import { mkdir } from "node:fs";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        mkdir("./public/temp", { recursive: true }, (error) => {
            cb(error, "./public/temp");
        });
    },
    filename: function (_req, file, cb) {
        cb(null, `${randomUUID()}${extname(file.originalname).slice(0, 16)}`);
    }
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});