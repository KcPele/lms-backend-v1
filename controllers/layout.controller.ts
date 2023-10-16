import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary";
//create layout
export const createLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const isTypeExist = await LayoutModel.findOne({ type });
      if (isTypeExist) {
        return next(new ErrorHandler(`${type} already exist`, 400));
      }
      if (type === "Banner") {
        const { title, subtitle, image } = req.body;
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          title,
          subtitle,
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
        };
        await LayoutModel.create(banner);
      }
      if (type === "FAQ") {
        const { faq } = req.body;
        const faqItem = await Promise.all(
          faq.map(async (item: any) => {
            const { question, answer } = item;
            const faq = {
              question,
              answer,
            };
            return faq;
          })
        );

        await LayoutModel.create({ type, faq: faqItem });
      }
      if (type === "Categories") {
        const { categories } = req.body;
        const categoryItem = await Promise.all(
          categories.map(async (item: any) => {
            const { title } = item;

            const category = {
              title,
            };
            return category;
          })
        );
        await LayoutModel.create({ type, categories: categoryItem });
      }
      res.status(200).json({
        success: true,
        message: "Layout created successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//edit layout

export const editLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      if (type === "Banner") {
        const bannerData: any = await LayoutModel.findOne({ type });
        const { title, subtitle, image } = req.body;
        await cloudinary.v2.uploader.destroy(bannerData?.image?.public_id);
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          title,
          subtitle,
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
        };
        await LayoutModel.findByIdAndUpdate(bannerData?._id, { banner });
      }
      if (type === "FAQ") {
        const { faq } = req.body;
        const faqData = await LayoutModel.findOne({ type });
        const faqItem = await Promise.all(
          faq.map(async (item: any) => {
            const { question, answer } = item;
            const faq = {
              question,
              answer,
            };
            return faq;
          })
        );

        await LayoutModel.findOneAndUpdate(faqData?._id, {
          type,
          faq: faqItem,
        });
      }
      if (type === "Categories") {
        const { categories } = req.body;
        const categoryData = await LayoutModel.findOne({ type });
        const categoryItem = await Promise.all(
          categories.map(async (item: any) => {
            const { title } = item;

            const category = {
              title,
            };
            return category;
          })
        );
        await LayoutModel.findByIdAndUpdate(categoryData?._id, {
          type,
          categories: categoryItem,
        });
      }
      res.status(200).json({
        success: true,
        message: "Layout Update successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//get layout by type

export const getLayoutByType = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const layout = await LayoutModel.findOne({ type });
      res.status(200).json({
        success: true,
        layout,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
