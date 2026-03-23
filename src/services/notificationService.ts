import { DeliveryChannel } from "@prisma/client";
import nodemailer from "nodemailer";

const getRequiredEnv = (key: keyof NodeJS.ProcessEnv) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`MISSING_ENV_${String(key)}`);
  }
  return value;
};

const createTransporter = () => {
  const host = getRequiredEnv("SES_SMTP_HOST");
  const port = Number(process.env.SES_SMTP_PORT || "587");
  const user = getRequiredEnv("SES_SMTP_USER");
  const pass = getRequiredEnv("SES_SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

type SendResetCode = {
  to: string;
  code: string;
  channel: DeliveryChannel;
};

const sendResetCode = async ({ to, code, channel }: SendResetCode) => {
  if (channel === DeliveryChannel.EMAIL) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: getRequiredEnv("EMAIL_FROM"),
        to,
        subject: "Your password reset code",
        text: `Your password reset code is: ${code}. It expires in 15 minutes.`,
      });
    } catch (error) {
      console.error("Error sending reset email:", error);
      throw new Error("EMAIL_DELIVERY_FAILED");
    }
  }
};

export const notificationService = { sendResetCode };
