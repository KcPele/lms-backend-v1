import { app } from "./app";
import cloudinary from "cloudinary";
import connectDB from "./utils/db";
require("dotenv").config();

//cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY as string,
  api_secret: process.env.CLOUD_SECRET_KEY as string,
});
//create server
app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
  connectDB();
});
