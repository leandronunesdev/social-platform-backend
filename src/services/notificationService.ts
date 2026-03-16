import { DeliveryChannel } from "@prisma/client";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: Number(process.env.SES_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS,
  },
});

type SendResetCode = {
  to: string;
  code: string;
  channel: DeliveryChannel;
};

const sendResetCode = async ({ to, code, channel }: SendResetCode) => {
  if (channel === DeliveryChannel.EMAIL) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: "Your password reset code",
        text: `Your password reset code is: ${code}. It expires in 15 minutes.`,
      });
    } catch (error) {
      console.error("Error sending reset email:", error);
    }
  }
};

export const notificationService = { sendResetCode };
