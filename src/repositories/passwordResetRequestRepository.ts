import { DeliveryChannel, ResetStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

const createPasswordResetRequest = (data: {
  userAccountId: string;
  codeHash: string;
  expiresAt: Date;
}) => {
  return prisma.passwordResetRequest.create({
    data: {
      userAccountId: data.userAccountId,
      codeHash: data.codeHash,
      channel: DeliveryChannel.EMAIL,
      createdAt: new Date(),
      expiresAt: data.expiresAt,
      attempts: 0,
      status: ResetStatus.PENDING,
    },
  });
};

const findLatestPendingByUserAccountId = async (userAccountId: string) => {
  return prisma.passwordResetRequest.findFirst({
    where: {
      userAccountId,
      status: ResetStatus.PENDING,
    },
    orderBy: { createdAt: "desc" },
  });
};

const incrementAttempts = async (requestId: string, maxAttempts = 5) => {
  const current = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
    select: { attempts: true },
  });
  if (!current) return null;
  const newAttempts = current.attempts + 1;
  return prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: {
      attempts: newAttempts,
      ...(newAttempts >= maxAttempts && { status: ResetStatus.LOCKED }),
    },
  });
};

export const passwordResetRequestRepository = {
  createPasswordResetRequest,
  findLatestPendingByUserAccountId,
  incrementAttempts,
};
