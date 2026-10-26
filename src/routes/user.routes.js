
import { Router } from "express";
import {
    registerUser,
    refreshAccessToken
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
    upload.single("avatar"),
    registerUser
);

router.route("/refresh-token").post(
    refreshAccessToken
);

export default router;
