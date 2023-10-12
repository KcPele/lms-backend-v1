require("dotenv").config();
import mongoose, { Schema, Model, Document } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const emailRegexPattern = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: {
    public_id: string;
    url: string;
  };
  role: string;
  isVerified: boolean;
  courses: Array<{ _id: string }>;
  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
}

const UserSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      validate: {
        validator: (email: string) => emailRegexPattern.test(email),
        message: "Please enter a valid email",
      },
    },
    password: {
      type: String,

      minLength: [6, "Your password must be longer than 6 characters"],
      select: false,
    },
    avatar: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    role: {
      type: String,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        _id: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

//hash password  before saving it

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// sign access token
UserSchema.methods.SignAccessToken = function () {
  return jwt.sign(
    { id: this._id },
    (process.env.ACCESS_TOKEN as string) || "",
    {
      expiresIn: "5m",
    }
  );
};

//sign refresh token
UserSchema.methods.SignRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    (process.env.REFRESH_TOKEN as string) || ""
  );
};

UserSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

const userModel: Model<IUser> = mongoose.model("User", UserSchema);

export default userModel;
