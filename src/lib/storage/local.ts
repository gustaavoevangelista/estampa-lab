import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageDriver } from "./types";

/** Stores files under UPLOAD_DIR (default ./uploads). Dev / single-server use. */
export class LocalDiskStorage implements StorageDriver {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, body: Buffer, contentType: string) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    await writeFile(`${full}.meta`, contentType);
  }

  async get(key: string) {
    const full = this.resolve(key);
    try {
      const [body, contentType] = await Promise.all([readFile(full), readFile(`${full}.meta`, "utf8")]);
      return { body, contentType };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const full = this.resolve(key);
    await Promise.all([unlink(full).catch(() => {}), unlink(`${full}.meta`).catch(() => {})]);
  }
}
