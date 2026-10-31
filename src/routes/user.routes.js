import { Router } from "express";
import {
  registerUser,
  refreshAccessToken,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  getCurrentCurrentUser,
  updateCurrentUserProfile,
  updateCurrentUserAvatar,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.single("avatar"), registerUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentCurrentUser);
router
  .route("/updateuserprofileditela")
  .patch(verifyJWT, updateCurrentUserProfile);
router
  .route("/avatar_update")
  .patch(verifyJWT, upload.single("avatar"), updateCurrentUserAvatar);

export default router;
