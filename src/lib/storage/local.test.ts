import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { LocalDiskStorage } from "./local";

describe("LocalDiskStorage", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "estampa-"));
  const s = new LocalDiskStorage(dir);
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("puts, gets and deletes", async () => {
    await s.put("a/b/file.pdf", Buffer.from("hello"), "application/pdf");
    expect(await s.get("a/b/file.pdf")).toEqual({ body: Buffer.from("hello"), contentType: "application/pdf" });
    await s.delete("a/b/file.pdf");
    expect(await s.get("a/b/file.pdf")).toBeNull();
  });

  it("rejects path traversal", async () => {
    await expect(s.put("../evil.txt", Buffer.from("x"), "text/plain")).rejects.toThrow();
  });
});
