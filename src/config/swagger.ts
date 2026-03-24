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
      description: "REST API for social media platform MVP",
      contact: {
        name: "API Support",
      },
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis,
};

export const swaggerSpec = swaggerJsdoc(options);
