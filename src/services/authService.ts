import bcrypt from "bcrypt";
import { userRepository } from "../repositories/userRepository";
import { generateToken } from "../utils/jwt";
import { passwordResetRequestRepository } from "../repositories/passwordResetRequestRepository";
import { codeGenerator } from "../utils/codeGenerator";
import { notificationService } from "./notificationService";
import { DeliveryChannel } from "@prisma/client";

type RegisterAccountParams = {
  name: string;
  username: string;
  email: string;
  password: string;
};

const getHashedPassword = async (password: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  return hashedPassword;
};

const registerAccount = async ({
  name,
  username,
  email,
  password,
}: RegisterAccountParams) => {
  const existingUser = await userRepository.findByEmailOrUsername(
    email,
    username,
  );
  if (existingUser) {
    throw new Error("Username or email already exists");
  }

  const hashedPassword = await getHashedPassword(password);

  const userAccount = await userRepository.createUserAccount({
    name,
    username,
    email,
    password: hashedPassword,
  });

  await userRepository.createUserProfile(userAccount.id);

  const token = generateToken({
    userId: userAccount.id,
    email: userAccount.email,
  });

  return { userAccountId: userAccount.id, token };
};

export type UpdateProfileParams = {
  bio?: string | undefined;
  country?: string | undefined;
  state?: string | undefined;
  city?: string | undefined;
  avatarUrl?: string | undefined;
};

const updateProfile = async (
  userAccountId: string,
  { bio, country, state, city, avatarUrl }: UpdateProfileParams,
) => {
  const userProfile = await userRepository.findUserProfile(userAccountId);

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  await userRepository.updateUserProfile(userAccountId, {
    bio,
    country,
    state,
    city,
    avatarUrl,
  });
};

type LoginParams = {
  email: string;
  password: string;
};

const login = async ({ email, password }: LoginParams) => {
  const userAccount = await userRepository.findByEmail(email);

  if (!userAccount) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, userAccount.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken({
    userId: userAccount.id,
    email: userAccount.email,
  });

  return { userAccountId: userAccount.id, token };
};

const canResend = (createdAt: Date) => {
  const now = new Date();
  return now.getTime() - createdAt.getTime() >= 60000;
};

const requestPasswordReset = async (email: string) => {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new Error("EMAIL_NOT_FOUND");
  }

  const existingPasswordRequest =
    await passwordResetRequestRepository.findLatestPendingByUserAccountId(
      user.id,
    );

  if (
    existingPasswordRequest &&
    !canResend(existingPasswordRequest.createdAt)
  ) {
    throw new Error("RESEND_TOO_SOON");
  }

  const code = codeGenerator.generate6DigitCode();

  const codeHash = await codeGenerator.hash(code);

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await passwordResetRequestRepository.createPasswordResetRequest({
    userAccountId: user.id,
    codeHash,
    expiresAt,
  });

  await notificationService.sendResetCode({
    to: user.email,
    code,
    channel: DeliveryChannel.EMAIL,
  });

  return {
    ok: true,
  };
};

const getPasswordResetRequest = async (email: string) => {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new Error("EMAIL_NOT_FOUND");

  const passwordResetRequest =
    await passwordResetRequestRepository.findLatestPendingByUserAccountId(
      user?.id,
    );

  if (!passwordResetRequest) throw new Error("PASSWORD_RESET_NOT_FOUND");

  return { user, passwordResetRequest };
};

const validateResetCode = async (email: string, code: string) => {
  const { passwordResetRequest } = await getPasswordResetRequest(email);

  const isPasswordResetRequestExpired =
    new Date() > passwordResetRequest?.expiresAt;

  if (isPasswordResetRequestExpired) throw new Error("CODE_EXPIRED");

  const isPasswordResetRequestLocked = passwordResetRequest.status === "LOCKED";

  if (isPasswordResetRequestLocked) throw new Error("USER_LOCKED");

  const isCodeValid = await bcrypt.compare(code, passwordResetRequest.codeHash);

  if (!isCodeValid) {
    await passwordResetRequestRepository.incrementAttempts(
      passwordResetRequest.id,
    );
    throw new Error("INVALID_CODE");
  }

  return { ok: true };
};

const setNewPassword = async (
  email: string,
  code: string,
  newPassword: string,
) => {
  if (newPassword.length < 8) throw new Error("WEAK_PASSWORD");

  await validateResetCode(email, code);

  const { user, passwordResetRequest } = await getPasswordResetRequest(email);

  const hashedPassword = await getHashedPassword(newPassword);

  await userRepository.updatePassword(user.id, hashedPassword);

  await passwordResetRequestRepository.markAsUsed(passwordResetRequest.id);
};

export const authService = {
  registerAccount,
  updateProfile,
  login,
  requestPasswordReset,
  validateResetCode,
  setNewPassword,
};
