import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { postService } from "../services/postService";
import {
  jsonInternalError,
  logRouteError,
} from "../utils/routeError";

const postContentSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, "Content is required.")
      .max(300, "Content must be at most 300 characters."),
  );

const CreatePostSchema = z
  .object({
    content: z.string().optional(),
    sharePostId: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    const content = (val.content ?? "").trim();
    if (!val.sharePostId && content.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Content is required unless you are sharing a post (use sharePostId).",
        path: ["content"],
      });
    }
    if (content.length > 300) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Content must be at most 300 characters.",
        path: ["content"],
      });
    }
  })
  .transform((val) => ({
    content: (val.content ?? "").trim(),
    sharePostId: val.sharePostId,
  }));

const UpdatePostSchema = z.object({
  content: postContentSchema,
});

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function pathParamString(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

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
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 300
 *                 description: Required for normal posts; optional when sharePostId is set (pure reshare)
 *                 example: "Hello world"
 *               sharePostId:
 *                 type: string
 *                 description: If set, creates a share of that post; increments its sharesCount
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
 *       400:
 *         description: Malformed JSON body (e.g. trailing comma, invalid quotes)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: sharePostId does not exist
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
    const post = await postService.createPost({
      userAccountId: userId,
      content: validated.content,
      sharePostId: validated.sharePostId,
    });
    return res.status(201).json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ errors: error.issues });
    }
    if (error instanceof Error && error.message === "SHARE_TARGET_NOT_FOUND") {
      return res.status(404).json({ message: "Shared post not found." });
    }
    logRouteError("posts.createPost", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

/**
 * Rejects PUT /posts (no id). Clients must call PUT /posts/{postId}.
 */
const rejectPutPostsWithoutId = (_req: AuthenticatedRequest, res: Response) => {
  return res.status(422).json({
    message:
      'Missing post id in the URL. Use PUT /posts/{postId} (example: PUT /posts/clxyz...) with JSON body { "content": "your text" }. Swagger: fill the path parameter `id` before Execute.',
  });
};

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Edit own post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Post id from POST /posts, GET /posts/user/..., or GET /posts/{id}/shares (required)
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
 *     responses:
 *       200:
 *         description: Post updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not the post owner
 *       404:
 *         description: Post not found
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
const updatePost = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const rawId = req.params.id;
    const postId = Array.isArray(rawId) ? rawId[0] : rawId;
    const trimmedId = postId?.trim() ?? "";
    if (!trimmedId) {
      return res.status(422).json({
        errors: [{ message: "Post id is required.", path: ["id"] }],
      });
    }
    const validated = UpdatePostSchema.parse(req.body);
    const post = await postService.updatePost({
      postId: trimmedId,
      userAccountId: userId,
      content: validated.content,
    });
    return res.status(200).json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ errors: error.issues });
    }
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      return res.status(404).json({ message: "Post not found." });
    }
    if (error instanceof Error && error.message === "POST_FORBIDDEN") {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }
    logRouteError("posts.updatePost", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

/**
 * @swagger
 * /posts/user/{userId}:
 *   get:
 *     summary: List posts by user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: User account id
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
const listPostsByUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const userId = pathParamString(req.params.userId);
    if (!userId) {
      return res.status(422).json({
        errors: [
          {
            code: z.ZodIssueCode.custom,
            message: "userId is required in the path.",
            path: ["userId"],
          },
        ],
      });
    }
    const query = PaginationQuerySchema.parse(req.query);
    const result = await postService.listPostsByUser({
      userAccountId: userId,
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
    logRouteError("posts.listPostsByUser", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

/**
 * @swagger
 * /posts/{id}/shares:
 *   get:
 *     summary: List posts that share a given post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Original post id
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
 *         description: Paginated share posts (newest first); each item includes userId of who shared
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
 *         description: Original post not found
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
const listPostShares = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const postId = pathParamString(req.params.id);
    if (!postId) {
      return res.status(422).json({
        errors: [
          {
            code: z.ZodIssueCode.custom,
            message: "Post id is required in the path.",
            path: ["id"],
          },
        ],
      });
    }
    const query = PaginationQuerySchema.parse(req.query);
    const result = await postService.listSharesOfPost({
      sharePostId: postId,
      page: query.page,
      limit: query.limit,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ errors: error.issues });
    }
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      return res.status(404).json({ message: "Post not found." });
    }
    logRouteError("posts.listPostShares", error);
    return res
      .status(500)
      .json(jsonInternalError(error, "Internal server error."));
  }
};

const postController = {
  createPost,
  rejectPutPostsWithoutId,
  updatePost,
  listPostsByUser,
  listPostShares,
};

export { postController };
