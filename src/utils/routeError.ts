import type { Response } from "express";
import { Prisma } from "@prisma/client";

/** When `true`, 500 responses include a `debug` object (disable after fixing prod issues). */
export const isDebugApiErrors = (): boolean =>
  process.env.DEBUG_API_ERRORS === "true";

/**
 * Always log to stdout/stderr (visible in `docker logs`).
 * Stack traces: non-production always; production only if DEBUG_API_ERRORS=true.
 */
export function logRouteError(route: string, error: unknown): void {
  const detail = formatErrorForLog(error);
  console.error(`[${route}]`, detail);
  if (process.env.NODE_ENV !== "production" || isDebugApiErrors()) {
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

function formatErrorForLog(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `Prisma ${error.code}: ${error.message}`;
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return `Prisma validation: ${error.message}`;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return `Prisma init [${error.errorCode}]: ${error.message}`;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return `Prisma engine: ${error.message}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

/** Safe structured detail for JSON when DEBUG_API_ERRORS=true (no stack). */
export function serializeErrorForDebug(
  error: unknown,
): Record<string, unknown> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      kind: "PrismaClientKnownRequestError",
      code: error.code,
      message: error.message,
      meta: error.meta,
    };
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return { kind: "PrismaClientValidationError", message: error.message };
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      kind: "PrismaClientInitializationError",
      errorCode: error.errorCode,
      message: error.message,
    };
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return { kind: "PrismaClientRustPanicError", message: error.message };
  }
  if (error instanceof Error) {
    return { kind: error.name, message: error.message };
  }
  return { kind: "unknown", message: String(error) };
}

export function isInvalidJsonBodyError(err: unknown): boolean {
  if (err instanceof SyntaxError) {
    const m = err.message;
    return /JSON|position|Unexpected|Expected/i.test(m);
  }
  if (err && typeof err === "object") {
    const e = err as { type?: string; statusCode?: number; status?: number };
    if (e.type === "entity.parse.failed") {
      return true;
    }
    const code = e.statusCode ?? e.status;
    if (code === 400 && err instanceof Error) {
      return /JSON|position|Unexpected|Expected/i.test(err.message);
    }
  }
  return false;
}

export function respondInvalidJsonBody(res: Response, err: unknown): void {
  const parserMessage = err instanceof Error ? err.message : undefined;
  const body: { message: string; debug?: { parserMessage: string } } = {
    message:
      "Request body is not valid JSON. Use double-quoted strings, no trailing commas after the last property, and Content-Type: application/json.",
  };
  if (isDebugApiErrors() && parserMessage) {
    body.debug = { parserMessage };
  }
  res.status(400).json(body);
}

/** Body for generic 500 responses. */
export function jsonInternalError(
  error: unknown,
  message: string,
): { message: string; debug?: Record<string, unknown> } {
  const body: { message: string; debug?: Record<string, unknown> } = {
    message,
  };
  if (isDebugApiErrors()) {
    body.debug = serializeErrorForDebug(error);
  }
  return body;
}
