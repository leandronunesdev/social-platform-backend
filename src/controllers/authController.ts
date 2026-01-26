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

/**
 * @swagger
 * /api/auth/registerAccount:
 *   post:
 *     summary: Register a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - username
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "John Doe"
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 example: "johndoe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Account created successfully."
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already exists
 *       500:
 *         description: Internal server error
 */
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
      if (process.env.NODE_ENV !== "production") {
        console.error(error.stack);
      }
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

/**
 * @swagger
 * /api/auth/updateProfile:
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 maxLength: 160
 *                 example: "Software developer passionate about clean code"
 *               country:
 *                 type: string
 *                 maxLength: 50
 *                 example: "United States"
 *               state:
 *                 type: string
 *                 maxLength: 50
 *                 example: "California"
 *               city:
 *                 type: string
 *                 maxLength: 50
 *                 example: "San Francisco"
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully."
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required or invalid token
 *       404:
 *         description: User profile not found
 *       500:
 *         description: Internal server error
 */
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
      if (process.env.NODE_ENV !== "production") {
        console.error(error.stack);
      }
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful."
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Internal server error
 */
const login = async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    const result = await authService.login(validatedData);

    res.status(200).json({
      message: "Login successful.",
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
      if (process.env.NODE_ENV !== "production") {
        console.error(error.stack);
      }
      return res.status(500).json({ message: "Internal server error." });
    } else {
      console.error("Unexpected error:", error);
      return res.status(500).json({ message: "An unexpected error occurred." });
    }
  }
};

export const authController = { registerAccount, updateProfile, login };
