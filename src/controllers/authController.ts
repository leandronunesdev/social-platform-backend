import { Request, Response } from "express";
import { authService } from "../services/authService";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

const RegisterAccountSchema = z.object({
  name: z.string().min(1, "Name is required."),
  username: z.string().min(3, "Username must be at least 3 characters long."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

const registerAccount = async (req: Request, res: Response) => {
  try {
    const validatedData = RegisterAccountSchema.parse(req.body);

    const result = await authService.registerAccount(validatedData);

    res.status(201).json({
      message: "Account created successfully.",
      token: result.token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    } else if (error instanceof Error) {
      if (error.message === "Username or email already exists") {
        return res
          .status(409)
          .json({ message: "Username or email already exists." });
      }
      console.error("Internal Server Error:", error.message);
      return res.status(500).json({ message: "Internal server error." });
    } else {
      console.error("Unexpected error:", error);
      return res.status(500).json({ message: "An unexpected error occurred." });
    }
  }
};

const UpdateProfileSchema = z.object({
  bio: z.string().max(160, "Bio must be less than 160 characters.").optional(),
  country: z
    .string()
    .max(50, "Country must be less than 50 characters.")
    .optional(),
  state: z
    .string()
    .max(50, "State must be less than 50 characters.")
    .optional(),
  city: z.string().max(50, "City must be less than 50 characters.").optional(),
  avatarUrl: z.string().url("Invalid avatar URL.").optional(),
});

const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract userAccountId from authenticated request (set by auth middleware)
    const userAccountId = req.userId;

    if (!userAccountId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const validatedData = UpdateProfileSchema.parse(req.body);
    await authService.updateProfile(userAccountId, validatedData);

    res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    } else if (error instanceof Error) {
      if (error.message === "User profile not found") {
        return res.status(404).json({ message: "User profile not found." });
      }
      console.error("Internal Server Error:", error.message);
      return res.status(500).json({ message: "Internal server error." });
    } else {
      console.error("Unexpected error:", error);
      return res.status(500).json({ message: "An unexpected error occurred." });
    }
  }
};

const LoginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

const login = async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    const result = await authService.login(validatedData);

    res.status(200).json({
      message: "Login successful.",
      userAccountId: result.userAccountId,
      token: result.token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    } else if (error instanceof Error) {
      if (error.message === "Invalid email or password") {
        return res.status(401).json({ message: "Invalid email or password." });
      }
      console.error("Internal Server Error:", error.message);
      return res.status(500).json({ message: "Internal server error." });
    } else {
      console.error("Unexpected error:", error);
      return res.status(500).json({ message: "An unexpected error occurred." });
    }
  }
};

export const authController = { registerAccount, updateProfile, login };
