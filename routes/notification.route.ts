import express from "express";
import { authorizeRoles, isAuthenicated } from "../middleware/auth";
import {
  getAllNotification,
  updateNotification,
} from "../controllers/notification.controller";

const notificationRoute = express.Router();

notificationRoute.get(
  "/get-all-notification",
  isAuthenicated,
  authorizeRoles("admin"),
  getAllNotification
);

notificationRoute.put(
  "/update-notification/:id",
  isAuthenicated,
  authorizeRoles("admin"),
  updateNotification
);

export default notificationRoute;
