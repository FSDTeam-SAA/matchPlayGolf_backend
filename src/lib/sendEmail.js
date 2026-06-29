import nodemailer from "nodemailer";
import {
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpPass,
  smtpUser,
  emailFrom

} from "../config/config.js"; 

// const transporter = nodemailer.createTransport({
//   host: emailHost,
//   port: emailPort,
//   secure: false,
//   auth: {
//     user: emailAddress,
//     pass: emailPass,
//   },
// });
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure === "true", // true for port 465
  auth: {
    user: smtpUser,
    pass: smtpPass,
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
