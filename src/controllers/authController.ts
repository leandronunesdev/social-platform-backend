import { Request, Response } from "express";
import { authService } from "../services/authService";
import { z } from "zod";

// Zod validation schema for account registration
const RegisterAccountSchema = z.object({
  name: z.string().min(1, "Name is required."),
  username: z.string().min(3, "Username must be at least 3 characters long."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

const registerAccount = async (req: Request, res: Response) => {
  try {
    // Validate input using Zod
    const validatedData = RegisterAccountSchema.parse(req.body);

    // Delegate to the service layer
    await authService.registerAccount(validatedData);

    // Return success response
    res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Use the 'issues' array for detailed validation errors
      return res.status(400).json({ errors: error.issues });
    } else if (error instanceof Error) {
      // Check for duplicate user error
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

export const authController = { registerAccount };
