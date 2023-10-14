require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";

import ejs from "ejs";
import path from "path";
import cloudinary from "cloudinary";
import { sendEmail } from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import {
  getAllUserService,
  getUserById,
  updateUserRoleSevices,
} from "../services/user.services";
//register user
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avater?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, avater } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exist", 400));
      }
      const user: IRegistrationBody = {
        name,
        email,
        password,
      };
      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );
      try {
        await sendEmail({
          email: user.email,
          subject: "Account Activation",
          data: html,
        });
        res.status(200).json({
          success: true,
          message: `please check your email: ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (
  user: IRegistrationBody
): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationCode };
};

//activate user

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } = req.body;

      const decoded: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as Secret
      ) as { user: IUser; activationCode: string };

      if (activation_code !== decoded.activationCode) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = decoded.user;

      //check if user already exist
      const existUser = await userModel.findOne({ email });
      if (existUser) {
        return next(new ErrorHandler("User already exist", 400));
      }
      const newUser = await userModel.create({
        name,
        email,
        password,
      });

      res.status(201).json({
        success: true,
        message: "Account is created and activated",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//login user
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;
      if (!email || !password) {
        return next(new ErrorHandler("Please enter email & password", 400));
      }
      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }
      const isPasswordMatched = await user.comparePassword(password);
      if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      sendToken(user, 200, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//logout user
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", {
        maxAge: 1,
      });
      res.cookie("refresh_token", "", {
        maxAge: 1,
      });
      redis.del(req.user?._id);
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as Secret
      ) as JwtPayload;
      const message = "Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandler(message, 401));
      }
      const seasion = await redis.get(decoded?.id as string);
      if (!seasion) {
        return next(new ErrorHandler(message, 401));
      }
      const user = JSON.parse(seasion) as IUser;
      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as Secret,
        {
          expiresIn: "5m",
        }
      );
      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as Secret,
        {
          expiresIn: "3d",
        }
      );
      req.user = user;
      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);
      res.status(200).json({
        success: true,
        access_token: accessToken,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//get user info

export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      return getUserById(userId as string, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//social auth
interface ISocialAuthBody {
  email: string;
  name: string;
  avater: string;
}
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avater } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({
          name,
          email,
          avater,
        });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user info
interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;
      const user = await userModel.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      if (email) {
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler("Email already exist", 400));
        }
        user.email = email;
      }
      if (name) {
        user.name = name;
      }
      await user.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user password
interface IUpdateUserPassword {
  oldPassword: string;
  newPassword: string;
}
export const updateUserPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdateUserPassword;
      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler("Please enter old password and new password", 400)
        );
      }
      const userId = req.user?._id;
      const user = await userModel.findById(userId).select("+password");
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      if (user?.password === undefined) {
        return next(new ErrorHandler("Social auth user", 404));
      }
      const isPasswordMatched = await user.comparePassword(oldPassword);
      if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid password", 400));
      }
      user.password = newPassword;
      await user.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update profile avater
interface IUpdateProfileAvater {
  avater: string;
}
export const updateProfileAvater = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;
      const userId = req.user?._id;
      const user = await userModel.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      if (avatar) {
        if (user?.avatar?.public_id) {
          await cloudinary.v2.uploader.destroy(user.avatar.public_id);
          const myCloud = await cloudinary.v2.uploader.upload(
            avatar as string,
            {
              folder: "avatars",
              width: 150,
            }
          );
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(
            avatar as string,
            {
              folder: "avatars",
              width: 150,
            }
          );
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }
      await user.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//get all users for only admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUserService(res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//udate user role -- only admin

export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;
      updateUserRoleSevices(res, id, role);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//Delete user -- only admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.body;
      const user = await userModel.findById(id);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      await user.deleteOne({ id });
      await redis.del(id);
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
