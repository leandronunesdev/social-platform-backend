import { DeliveryChannel } from "@prisma/client";

type SendResetCode = {
  to: string;
  code: string;
  channel: DeliveryChannel;
};

const sendResetCode = async ({ to, code, channel }: SendResetCode) => {
  if (channel === DeliveryChannel.EMAIL) {
    console.log(`Password reset code for ${to} - ${code}`);
  }
};

export const notificationService = { sendResetCode };
