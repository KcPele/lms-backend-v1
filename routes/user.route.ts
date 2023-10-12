import express from "express";
import {
  activateUser,
  getUserInfo,
  loginUser,
  logoutUser,
  registrationUser,
  socialAuth,
  updateAccessToken,
  updateProfileAvater,
  updateUserInfo,
  updateUserPassword,
} from "../controllers/user.controller";
import { isAuthenicated } from "../middleware/auth";
const userRouter = express.Router();

userRouter.post("/registration", registrationUser);
userRouter.post("/activate-user", activateUser);
userRouter.post("/login", loginUser);
userRouter.get("/logout", isAuthenicated, logoutUser);
userRouter.get("/refresh-token", updateAccessToken);
userRouter.get("/me", isAuthenicated, getUserInfo);
userRouter.post("/social-auth", socialAuth);
userRouter.put("/update-user-info", isAuthenicated, updateUserInfo);
userRouter.put("/update-user-password", isAuthenicated, updateUserPassword);
userRouter.put("/update-user-avatar", isAuthenicated, updateProfileAvater);

export default userRouter;
