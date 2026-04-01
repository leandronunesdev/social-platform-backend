import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { postService } from "../services/postService";
import {
  jsonInternalError,
  logRouteError,
} from "../utils/routeError";

const CreatePostSchema = z.object({
  content: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Content is required.")
        .max(300, "Content must be at most 300 characters."),
    ),
});

const ListPostsQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 300
 *                 example: "Hello world"
 *     responses:
 *       201:
 *         description: Post created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: List posts by user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User account id (defaults to the authenticated user)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated posts (newest first)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
const createPost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const validated = CreatePostSchema.parse(req.body);
    const post = await postService.createPost(userId, validated.content);
    return res.status(201).json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ errors: error.issues });
    }
    logRouteError("posts.createPost", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

const listPosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    if (!authUserId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const query = ListPostsQuerySchema.parse(req.query);
    const targetUserId = query.userId ?? authUserId;
    const result = await postService.listPostsByUser({
      userAccountId: targetUserId,
      page: query.page,
      limit: query.limit,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ errors: error.issues });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found." });
    }
    logRouteError("posts.listPosts", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

const postController = {
  createPost,
  listPosts,
};

export { postController };
