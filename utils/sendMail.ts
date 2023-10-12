import * as nodemailer from "nodemailer";

require("dotenv").config();
const SMTP_EMAIL = process.env.SMTP_EMAIL as string;

interface EmailOprions {
  email: string;
  subject: string;
  data: any;
}
export function sendEmail(options: EmailOprions): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a transporter using SMTP
      const transporter: nodemailer.Transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        service: process.env.SMTP_SERVICE,
        secure: true,
        auth: {
          user: SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD as string,
        },
      });

      // Create the email message
      const { email, subject, data } = options;

      const message = {
        from: process.env.SMTP_EMAIL as string,
        to: email,
        subject,
        html: data,
      };
      // Send the email
      await transporter.sendMail(message);

      resolve(`Email sent to ${email}`);
    } catch (error) {
      reject(error);
    }
  });
}
