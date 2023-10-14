import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import CourseModel from "../models/course.model";
import ejs from "ejs";
import path from "path";
import { sendEmail } from "../utils/sendMail";
import NotificationModel from "../models/notification.model";
import OrderModel, { IOrder } from "../models/order.model";
import { getAllOrdersService, newOrder } from "../services/order.services";

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;
      const user = await userModel.findById(req.user?._id);
      const courseExistInUser = user?.courses.some(
        (course) => course?._id?.toString() === courseId
      );
      if (courseExistInUser) {
        return next(new ErrorHandler("You already purchase this course", 400));
      }
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const data: any = {
        courseId,
        userId: req.user?._id,
        payment_info,
      };

      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 5),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        mailData
      );

      try {
        await sendEmail({
          email: user?.email as string,
          subject: "Order Confirmation",
          data: html,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
      user?.courses.push(course._id);
      await user?.save();
      await NotificationModel.create({
        userId: user?._id,
        title: "New Order",
        message: `You have purchased ${course.name}`,
      });
      if (!course.purchased) {
        course.purchased = 0;
      }
      course.purchased += 1;

      await course.save();
      newOrder(data, res, next);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//get all orders for only admin
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
