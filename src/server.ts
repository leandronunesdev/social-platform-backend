import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();

// Enable CORS for frontend (comma-separated origins; localhost:3000 always allowed in production for local dev)
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
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

// Swagger documentation (exact /api-docs.json before /api-docs prefix so it’s not handled by swagger-ui)
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

import authRoutes from "./routes/authRoutes";
app.use("/auth", authRoutes);

const PORT = process.env.PORT || 4000;

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
