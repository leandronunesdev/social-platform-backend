import { Router } from "express";
import { authController } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/registerAccount", authController.registerAccount);
router.post("/login", authController.login);
router.put("/updateProfile", authenticateToken, authController.updateProfile);
router.post("/passwordReset", authController.passwordReset);
router.post("/validateCode", authController.validateCode);

export default router;
