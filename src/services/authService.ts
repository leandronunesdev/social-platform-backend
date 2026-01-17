import bcrypt from "bcrypt";
import { userRepository } from "../repositories/userRepository";
import { generateToken } from "../utils/jwt";

type RegisterAccountParams = {
  name: string;
  username: string;
  email: string;
  password: string;
};

const registerAccount = async ({
  name,
  username,
  email,
  password,
}: RegisterAccountParams) => {
  const existingUser = await userRepository.findByEmailOrUsername(
    email,
    username
  );
  if (existingUser) {
    throw new Error("Username or email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

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
  userAccountId: string;
  bio?: string | undefined;
  country?: string | undefined;
  state?: string | undefined;
  city?: string | undefined;
  avatarUrl?: string | undefined;
};

const updateProfile = async ({
  userAccountId,
  bio,
  country,
  state,
  city,
  avatarUrl,
}: UpdateProfileParams) => {
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

export const authService = { registerAccount, updateProfile, login };
