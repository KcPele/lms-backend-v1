import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";

//authenticated user
export const isAuthenicated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.cookies.access_token;
      if (!accessToken) {
        return next(
          new ErrorHandler("Please login to access this resource", 401)
        );
      }
      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN as string
      ) as JwtPayload;
      if (!decoded) {
        return next(new ErrorHandler("access token is not valid", 401));
      }
      const user = await redis.get(decoded?.id);
      if (!user) {
        return next(
          new ErrorHandler("Please login to access this ressourse", 404)
        );
      }
      req.user = JSON.parse(user);
      next();
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//validate user role

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Role (${req.user?.role}) is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};
