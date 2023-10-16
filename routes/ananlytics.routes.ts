import express from "express";
import {
  getCourseAnalytics,
  getOrderAnalytics,
  getUserAnalytics,
} from "../controllers/analytics.controller";
import { authorizeRoles, isAuthenicated } from "../middleware/auth";
const analyticsRouter = express.Router();

analyticsRouter.get(
  "/get-users-analytics",
  isAuthenicated,
  authorizeRoles("admin"),
  getUserAnalytics
);
analyticsRouter.get(
  "/get-orders-analytics",
  isAuthenicated,
  authorizeRoles("admin"),
  getOrderAnalytics
);
analyticsRouter.get(
  "/get-courses-analytics",
  isAuthenicated,
  authorizeRoles("admin"),
  getCourseAnalytics
);

export default analyticsRouter;
