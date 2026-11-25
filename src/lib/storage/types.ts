export interface StoredObject {
  body: Buffer;
  contentType: string;
}

/** Minimal file storage contract. Swap the driver via STORAGE_DRIVER without touching callers. */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
