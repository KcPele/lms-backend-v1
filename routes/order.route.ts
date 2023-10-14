import express from "express";
import { authorizeRoles, isAuthenicated } from "../middleware/auth";
import { createOrder, getAllOrders } from "../controllers/order.controller";
const orderRouter = express.Router();

orderRouter.post("/create-order", isAuthenicated, createOrder);
orderRouter.get(
  "/get-orders",
  isAuthenicated,
  authorizeRoles("admin"),
  getAllOrders
);
export default orderRouter;
