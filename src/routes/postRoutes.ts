import { Router } from "express";
import { postController } from "../controllers/postController";

const router = Router();

router.post("/", postController.createPost);
router.get("/", postController.listPosts);

export default router;
