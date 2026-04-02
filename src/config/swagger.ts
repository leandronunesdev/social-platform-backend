import path from "path";
import fs from "fs";
import swaggerJsdoc from "swagger-jsdoc";

// Resolve project root from this file: src/config/swagger.ts -> project root
const root = path.resolve(__dirname, "..", "..");

// Prefer src/*.ts (dev/ts-node); fallback to dist/*.js (prod) so we never pick .d.ts
const apis: string[] = [];
const srcDirs = [
  path.join(root, "src", "routes", "*.ts"),
  path.join(root, "src", "controllers", "*.ts"),
  path.join(root, "src", "server.ts"),
];
const distDirs = [
  path.join(root, "dist", "routes", "*.js"),
  path.join(root, "dist", "controllers", "*.js"),
  path.join(root, "dist", "server.js"),
];
if (fs.existsSync(path.join(root, "src", "controllers"))) {
  apis.push(...srcDirs);
} else if (fs.existsSync(path.join(root, "dist", "controllers"))) {
  apis.push(...distDirs);
} else {
  apis.push(...srcDirs, ...distDirs);
}

const apiBaseUrl =
  process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

// Swagger "Try it out" runs in the browser. If the docs are https://api.example.com
// but servers.url is http://1.2.3.4, the browser blocks the request (mixed content).
// Same-origin "/" always matches the page you opened (http or https).
const servers: { url: string; description: string }[] = [
  {
    url: "/",
    description: "Current host (use for Try it out in the browser)",
  },
];

const normalizedBase = apiBaseUrl.replace(/\/$/, "");
if (normalizedBase && normalizedBase !== "") {
  servers.push({
    url: normalizedBase,
    description:
      process.env.NODE_ENV === "production"
        ? "Production (API_BASE_URL)"
        : "Development (API_BASE_URL)",
  });
}

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Social Platform API",
      version: "1.0.0",
      description:
        "REST API for social media platform MVP.\n\n" +
        "**Posts** require a JWT. Use **POST /auth/login** (or register), copy the `token` from the response, click **Authorize**, and paste the token (Swagger sends it as Bearer).",
      contact: {
        name: "API Support",
      },
    },
    servers,
    tags: [
      { name: "Health", description: "Liveness and readiness" },
      { name: "Authentication", description: "Accounts, login, profile" },
      { name: "Posts", description: "Create and list posts (JWT required)" },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Post: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            content: { type: "string" },
            sharesCount: { type: "integer" },
            likesCount: { type: "integer" },
            repliesCount: { type: "integer" },
            sharePostId: { type: "string", nullable: true },
            replyPostId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PostLiker: {
          type: "object",
          properties: {
            userId: { type: "string" },
            username: { type: "string" },
            name: { type: "string" },
            likedAt: { type: "string", format: "date-time" },
          },
        },
        PostAuthor: {
          type: "object",
          properties: {
            userId: { type: "string" },
            username: { type: "string" },
            name: { type: "string" },
          },
        },
        PostAuthorWithAvatar: {
          allOf: [
            { $ref: "#/components/schemas/PostAuthor" },
            {
              type: "object",
              properties: {
                avatarUrl: { type: "string", nullable: true },
              },
            },
          ],
        },
        PostReplyItem: {
          allOf: [
            { $ref: "#/components/schemas/Post" },
            {
              type: "object",
              required: ["author", "likedByMe"],
              properties: {
                author: { $ref: "#/components/schemas/PostAuthorWithAvatar" },
                likedByMe: { type: "boolean" },
              },
            },
          ],
        },
        PostSnapshot: {
          allOf: [
            { $ref: "#/components/schemas/Post" },
            {
              type: "object",
              required: ["author"],
              properties: {
                author: { $ref: "#/components/schemas/PostAuthor" },
              },
            },
          ],
        },
        PostDetail: {
          allOf: [
            { $ref: "#/components/schemas/Post" },
            {
              type: "object",
              required: ["author", "likedByMe"],
              properties: {
                author: { $ref: "#/components/schemas/PostAuthor" },
                likedByMe: { type: "boolean" },
                sharedFrom: {
                  oneOf: [
                    { $ref: "#/components/schemas/PostSnapshot" },
                    { type: "null" },
                  ],
                  description:
                    "Original post when this is a share; null if not a share or original was deleted.",
                },
              },
            },
          ],
        },
      },
    },
  },
  apis,
};

/** Regenerate on each call so new JSDoc routes appear without restarting the server. */
export function buildSwaggerSpec(): object {
  return swaggerJsdoc(options);
}
