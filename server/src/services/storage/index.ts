import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';

// Storage is isolated per user by directory, but that isolation is
// defense-in-depth only — the real access-control boundary is the
// document.userId check every route does before ever calling read()
// (see routes/documents.ts and test/integration/documents.idor.test.ts).
//
// Swapping this for S3/R2 in production means implementing the same three
// methods against an object-storage SDK; nothing above this module needs
// to change.
export interface StorageProvider {
  save(userId: string, key: string, buffer: Buffer): Promise<string>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}

function assertSafeKey(key: string) {
  if (!/^[a-zA-Z0-9/_-]+$/.test(key) || key.includes('..')) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

class LocalDiskStorage implements StorageProvider {
  private root: string;
  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private fullPath(storageKey: string) {
    assertSafeKey(storageKey);
    const resolved = path.resolve(this.root, storageKey);
    if (!resolved.startsWith(this.root)) throw new Error('Path traversal attempt blocked');
    return resolved;
  }

  async save(userId: string, key: string, buffer: Buffer): Promise<string> {
    assertSafeKey(userId);
    assertSafeKey(key);
    const storageKey = `${userId}/${key}`;
    const full = this.fullPath(storageKey);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer, { mode: 0o600 });
    return storageKey;
  }

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.fullPath(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(this.fullPath(storageKey), { force: true });
  }
}

export const storage: StorageProvider = new LocalDiskStorage(env.STORAGE_ROOT);
