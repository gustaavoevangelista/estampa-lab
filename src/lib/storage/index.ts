import "server-only";
import { randomUUID } from "node:crypto";

import { LocalDiskStorage } from "./local";
import type { StorageDriver } from "./types";

let driver: StorageDriver | null = null;

/**
 * Returns the configured storage driver.
 * To add S3 / Cloudflare R2: implement StorageDriver with @aws-sdk/client-s3
 * (R2 is S3-compatible) and return it for STORAGE_DRIVER="s3".
 */
export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER ?? "local";
  if (kind === "local") {
    driver = new LocalDiskStorage(process.env.UPLOAD_DIR ?? "./uploads");
    return driver;
  }
  throw new Error(`STORAGE_DRIVER "${kind}" is not implemented yet. See src/lib/storage/index.ts.`);
}

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Builds a unique key like "transactions/2026/11/<uuid>.pdf". */
export function newStorageKey(prefix: string, contentType: string, now = new Date()) {
  const ext = ALLOWED_UPLOAD_TYPES[contentType] ?? "bin";
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${prefix}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
}
