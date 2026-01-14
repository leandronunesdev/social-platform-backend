import { Router } from "express";
import { authController } from "../controllers/authController";

const router = Router();

router.post("/registerAccount", authController.registerAccount);
router.put("/updateProfile", authController.updateProfile);

export default router;
