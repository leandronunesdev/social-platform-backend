import { Request, Response } from "express";
import { authService } from "../services/authService";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  jsonInternalError,
  logRouteError,
} from "../utils/routeError";

const RegisterAccountSchema = z.object({
  name: z.string().min(1, "Name is required."),
  username: z.string().min(3, "Username must be at least 3 characters long."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

/**
 * @swagger
 * /auth/registerAccount:
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
      logRouteError("registerAccount", error);
      return res
        .status(500)
        .json(jsonInternalError(error, "Internal server error."));
    } else {
      logRouteError("registerAccount", error);
      return res
        .status(500)
        .json(jsonInternalError(error, "An unexpected error occurred."));
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
 * /auth/updateProfile:
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
      logRouteError("updateProfile", error);
      return res
        .status(500)
        .json(jsonInternalError(error, "Internal server error."));
    } else {
      logRouteError("updateProfile", error);
      return res
        .status(500)
        .json(jsonInternalError(error, "An unexpected error occurred."));
    }
  }
};

const LoginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

/**
 * @swagger
 * /auth/login:
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
      logRouteError("login", error);
      return res
        .status(500)
        .json(jsonInternalError(error, "Internal server error."));
    } else {
      logRouteError("login", error);
      return res
        .status(500)
        .json(jsonInternalError(error, "An unexpected error occurred."));
    }
  }
};

const PasswordResetSchema = z.object({
  email: z.string().email(),
});

/**
 * @swagger
 * /auth/passwordReset:
 *   post:
 *     summary: Request a password reset code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: Reset code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If an account exists for this email, a reset code has been sent."
 *       400:
 *         description: Validation error
 *       404:
 *         description: Email not found
 *       429:
 *         description: Resend too soon
 *       500:
 *         description: Internal server error
 */
const passwordReset = async (req: Request, res: Response) => {
  try {
    const validatedData = PasswordResetSchema.parse(req.body);

    await authService.requestPasswordReset(validatedData.email);

    res.status(200).json({
      message:
        "If an account exists for this email, a reset code has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    } else if (error instanceof Error) {
      if (error.message === "EMAIL_NOT_FOUND") {
        return res
          .status(404)
          .json({ message: "Email not found. Please check it and try again" });
      }
      if (error.message === "RESEND_TOO_SOON") {
        return res
          .status(429)
          .json({ message: "Resend too soon. Try again after the countdown." });
      }
      if (error.message === "EMAIL_DELIVERY_FAILED") {
        return res
          .status(503)
          .json({ message: "Email service unavailable. Try again in a moment." });
      }
      logRouteError("passwordReset", error);
      return res
        .status(500)
        .json(jsonInternalError(error, "Internal server error."));
    }
    logRouteError("passwordReset", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

const ValidateCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const passwordResetErrorHandler = (error: unknown, res: Response) => {
  if (error instanceof Error) {
    if (error.message === "CODE_EXPIRED") {
      return res
        .status(400)
        .json({ message: "Code has expired. Request a new one." });
    }

    if (error.message === "USER_LOCKED") {
      return res
        .status(429)
        .json({ message: "Too many attempts. Request a new code." });
    }

    if (error.message === "INVALID_CODE") {
      return res.status(400).json({
        message: "We couldn't validate the code. Check it and try again.",
      });
    }
  }
  logRouteError("passwordResetFlow", error);
  return res
    .status(500)
    .json(jsonInternalError(error, "Internal server error."));
};

/**
 * @swagger
 * /auth/validateCode:
 *   post:
 *     summary: Validate password reset code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Code validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Code validated successfully."
 *       400:
 *         description: Validation error or invalid/expired code
 *       429:
 *         description: Too many attempts
 *       500:
 *         description: Internal server error
 */
const validateCode = async (req: Request, res: Response) => {
  try {
    const validatedData = ValidateCodeSchema.parse(req.body);

    await authService.validateResetCode(
      validatedData.email,
      validatedData.code
    );

    res.status(200).json({ message: "Code validated successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    } else if (error instanceof Error) {
      return passwordResetErrorHandler(error, res);
    }
    logRouteError("validateCode", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

const NewPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

/**
 * @swagger
 * /auth/setNewPassword:
 *   post:
 *     summary: Set new password after reset code validation
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully. You can now sign in."
 *       400:
 *         description: Validation error or invalid/expired code
 *       429:
 *         description: Too many attempts
 *       500:
 *         description: Internal server error
 */
const setNewPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = NewPasswordSchema.parse(req.body);

    await authService.setNewPassword(email, code, newPassword);

    res.status(200).json({
      message: "Password updated successfully. You can now sign in.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    } else if (error instanceof Error) {
      return passwordResetErrorHandler(error, res);
    }
    logRouteError("setNewPassword", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

export const authController = {
  registerAccount,
  updateProfile,
  login,
  passwordReset,
  validateCode,
  setNewPassword,
};
