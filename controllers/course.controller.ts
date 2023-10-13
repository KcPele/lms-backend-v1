require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import CourseModel from "../models/course.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ejs from "ejs";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.services";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import path from "path";
import { sendEmail } from "../utils/sendMail";
export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const result = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//edit course
export const updateCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);
        const result = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
      const course = await CourseModel.findByIdAndUpdate(
        { _id: req.params.id },
        { $set: data },
        {
          new: true,
        }
      );
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//get single course --- without purchase
export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.query.id;
      const isCatchExist = await redis.get(courseId as string);
      if (isCatchExist) {
        console.log("from redis");
        return res.status(200).json({
          success: true,
          courses: JSON.parse(isCatchExist),
        });
      } else {
        const course = await CourseModel.findById(req.params.id).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
        if (!course) {
          return next(new ErrorHandler("Course not found", 404));
        }
        await redis.set(courseId as string, JSON.stringify(course));
        console.log("from db");

        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
//get all courses --- without purchase
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCatchExist = await redis.get("allCourses");
      if (isCatchExist) {
        return res.status(200).json({
          success: true,
          courses: JSON.parse(isCatchExist),
        });
      } else {
        const courses = await CourseModel.find().select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );
        if (!courses) {
          return next(new ErrorHandler("Course not found", 404));
        }
        await redis.set("allCourses", JSON.stringify(courses));

        res.status(200).json({
          success: true,
          courses,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get course content -- only for valid user

export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const userListCourses = req.user?.courses;
      console.log(userListCourses, courseId);
      const courseExists = userListCourses?.find(
        (course: any) => course._id.toString() === courseId?.toString()
      );
      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }
      const course = await CourseModel.findById(req.params.id);
      const content = course?.courseData;
      res.status(200).json({
        success: true,
        content,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add question in course
interface IAddQuestionData {
  question: string;
  contentId: string;
  courseId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, contentId, courseId }: IAddQuestionData = req.body;
      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 404));
      }

      const courseContent = course?.courseData.find((content) =>
        content._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("Content not found", 404));
      }
      //crete new question object
      const newQuestion: any = {
        question,
        user: req.user,
        questionReplies: [],
      };
      courseContent.questions.push(newQuestion);
      //save course
      await course?.save();
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add asnwer in course  question

interface IAddAnswerData {
  answer: string;
  questionId: string;
  contentId: string;
  courseId: string;
}

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, questionId, contentId, courseId }: IAddAnswerData =
        req.body;
      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 404));
      }
      const courseContent = course?.courseData.find((content) =>
        content._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("Content not found", 404));
      }
      const question = courseContent.questions.find((question) =>
        question._id.equals(questionId)
      );
      if (!question) {
        return next(new ErrorHandler("Question not found", 404));
      }
      //crete new answer object
      const newAnswer: any = {
        answer,
        user: req.user,
      };
      question.questionReplies?.push(newAnswer);
      //save course
      await course?.save();

      if (req.user?._id === question.user?._id) {
        //create a notification
      } else {
        const data = {
          name: question.user?.name,
          title: courseContent.title,
        };
        const html = await ejs.renderFile(
          path.join(__dirname, "../mail/question-reply.ejs"),
          data
        );

        try {
          await sendEmail({
            email: question.user?.email,
            subject: "Question reply",
            data: html,
          });
        } catch (error) {
          return next(new ErrorHandler(error.message, 500));
        }
      }
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add review in course

interface IAddReviewData {
  review: string;
  rating: number;

  userId: string;
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userListCourses = req.user?.courses;
      const couseId = req.params.id;
      //check if courseID already exist in userlistcourse
      const couseExists = userListCourses?.some(
        (course: any) => course._id.toString() === couseId
      );
      if (!couseExists) {
        return next(
          new ErrorHandler("You are not eligible to add review", 404)
        );
      }
      const course = await CourseModel.findById(couseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const { review, rating }: IAddReviewData = req.body;
      const reviewData: any = {
        user: req.user,
        rating,
        comment: review,
      };
      course?.reviews.push(reviewData);
      //calculate ratings
      let avg = 0;
      course?.reviews.forEach((review) => {
        avg += review.rating;
      });

      course.ratings = avg / course?.reviews?.length;
      await course?.save();
      const notification = {
        title: "New Review Received",
        message: `${req.user?.name} has added a review on your course ${course?.name}`,
      };
      //create notification

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//add reply in review
interface IAddReviewReplyData {
  comment: string;
  courseId: string;
  reviewId: string;
}
export const addReviewReply = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId }: IAddReviewReplyData = req.body;
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const review = course?.reviews.find((review) =>
        review._id.equals(reviewId)
      );
      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }
      const replyData: any = {
        user: req.user,
        comment,
      };
      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      review.commentReplies?.push(replyData);
      await course?.save();
      const notification = {
        title: "New Review Reply Received",
        message: `${req.user?.name} has added a review reply on your course ${course?.name}`,
      };
      //create notification
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
