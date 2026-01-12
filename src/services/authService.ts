import bcrypt from "bcrypt";
import { userRepository } from "../repositories/userRepository";

const registerAccount = async ({
  name,
  username,
  email,
  password,
}: {
  name: string;
  username: string;
  email: string;
  password: string;
}) => {
  // Step 1: Check if email or username already exists
  const existingUser = await userRepository.findByEmailOrUsername(
    email,
    username
  );
  if (existingUser) {
    throw new Error("Username or email already exists");
  }

  // Step 2: Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Step 3: Create the user account
  const userAccount = await userRepository.createUserAccount({
    name,
    username,
    email,
    password: hashedPassword,
  });

  // Step 4: Create an empty profile for the user
  await userRepository.createUserProfile(userAccount.id);
};

export const authService = { registerAccount };
