import nodemailer from "nodemailer";
import {
  emailHost,
  emailPort,
  emailAddress,
  emailPass,
  emailFrom,
} from "../config/config.js"; 

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: false,
  auth: {
    user: emailAddress,
    pass: emailPass,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: emailFrom,
    to,
    subject,
    html,
  });
};

export default sendEmail;
