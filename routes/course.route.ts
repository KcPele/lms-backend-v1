import express from "express";
import {
  addAnswer,
  addQuestion,
  addReview,
  addReviewReply,
  getAllCourses,
  getCourseByUser,
  getSingleCourse,
  updateCourse,
  uploadCourse,
} from "../controllers/course.controller";
import { authorizeRoles, isAuthenicated } from "../middleware/auth";

const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  isAuthenicated,
  authorizeRoles("admin"),
  uploadCourse
);

courseRouter.put(
  "/update-course/:id",
  isAuthenicated,
  authorizeRoles("admin"),
  updateCourse
);

courseRouter.get(
  "/get-course/:id",

  getSingleCourse
);
courseRouter.get(
  "/get-courses",

  getAllCourses
);

courseRouter.get("/get-course-content/:id", isAuthenicated, getCourseByUser);
courseRouter.put("/add-question", isAuthenicated, addQuestion);
courseRouter.put("/add-answer", isAuthenicated, addAnswer);
courseRouter.put("/add-review/:id", isAuthenicated, addReview);
courseRouter.put(
  "/add-review-reply",
  isAuthenicated,
  authorizeRoles("admin"),
  addReviewReply
);

export default courseRouter;
