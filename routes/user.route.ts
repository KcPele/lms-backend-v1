import express from "express";
import {
  activateUser,
  deleteUser,
  getAllUsers,
  getUserInfo,
  loginUser,
  logoutUser,
  registrationUser,
  socialAuth,
  updateAccessToken,
  updateProfileAvater,
  updateUserInfo,
  updateUserPassword,
  updateUserRole,
} from "../controllers/user.controller";
import { authorizeRoles, isAuthenicated } from "../middleware/auth";
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
userRouter.get(
  "/get-users",
  isAuthenicated,
  authorizeRoles("admin"),
  getAllUsers
);
userRouter.put(
  "/update-user-role",
  isAuthenicated,
  authorizeRoles("admin"),
  updateUserRole
);
userRouter.delete(
  "/delete-user",
  isAuthenicated,
  authorizeRoles("admin"),
  deleteUser
);
export default userRouter;
