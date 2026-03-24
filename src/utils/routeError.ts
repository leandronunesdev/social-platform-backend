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
export function serializeErrorForDebug(error: unknown): Record<string, unknown> {
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
