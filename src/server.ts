import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { buildSwaggerSpec } from "./config/swagger";
import { prisma } from "./lib/prisma";
import {
  isInvalidJsonBodyError,
  jsonInternalError,
  logRouteError,
  respondInvalidJsonBody,
} from "./utils/routeError";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import { authenticateToken } from "./middlewares/authMiddleware";

const app = express();

const corsOriginEnv = process.env.CORS_ORIGIN || "http://localhost:3000";
const allowedOrigins = corsOriginEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (
  process.env.NODE_ENV === "production" &&
  !allowedOrigins.includes("http://localhost:3000")
) {
  allowedOrigins.push("http://localhost:3000");
}
const apiPublicBase =
  process.env.API_BASE_URL?.trim().replace(/\/$/, "") || "";
if (apiPublicBase && !allowedOrigins.includes(apiPublicBase)) {
  allowedOrigins.push(apiPublicBase);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api-docs.json", (_req, res) => res.json(buildSwaggerSpec()));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerUrl: "/api-docs.json",
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);

app.use("/auth", authRoutes);
app.use("/posts", authenticateToken, postRoutes);

const PORT = process.env.PORT || 4000;

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is running
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    logRouteError("health/ready", error);
    res.status(503).json({
      status: "error",
      database: "disconnected",
      ...(process.env.DEBUG_API_ERRORS === "true"
        ? { debug: { message: error instanceof Error ? error.message : String(error) } }
        : {}),
    });
  }
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (isInvalidJsonBodyError(err)) {
      logRouteError("expressErrorHandler:invalidJsonBody", err);
      return respondInvalidJsonBody(res, err);
    }
    logRouteError("expressErrorHandler", err);
    res
      .status(500)
      .json(jsonInternalError(err, "Internal server error."));
  },
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
