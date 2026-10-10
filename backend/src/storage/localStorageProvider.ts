import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IStorageProvider, InitiateUploadParams, InitiateUploadResult, ObjectMetadata } from './storageInterface.js';
import { env } from '../config/env.js';

export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';
  private readonly storageRoot: string;
  private readonly secret: string;

  constructor(customStorageDir?: string) {
    this.storageRoot = path.resolve(process.cwd(), customStorageDir || env.MEDIA_STORAGE_LOCAL_DIR);
    this.secret = env.SESSION_SECRET;

    // Ensure storage root directory exists
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  public getStorageRoot(): string {
    return this.storageRoot;
  }

  /**
   * Sanitizes object key and ensures the resolved absolute path is safely within the storage root.
   */
  public safeResolvePath(objectKey: string): string {
    if (!objectKey || typeof objectKey !== 'string') {
      throw new Error('Invalid object key provided');
    }

    // Explicitly reject absolute paths and leading slashes
    if (objectKey.startsWith('/') || objectKey.startsWith('\\') || path.isAbsolute(objectKey)) {
      throw new Error('Absolute path is not allowed in object key');
    }

    // Strip any null bytes
    const sanitizedKey = objectKey.replace(/\0/g, '');
    const normalizedRelative = path.normalize(sanitizedKey);

    // Prevent path traversal
    if (normalizedRelative.startsWith('..') || path.isAbsolute(normalizedRelative)) {
      throw new Error('Path traversal attack detected in object key');
    }

    const resolved = path.resolve(this.storageRoot, normalizedRelative);
    const normalizedRoot = path.resolve(this.storageRoot);

    if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
      throw new Error('Resolved path outside storage root');
    }

    return resolved;
  }

  public generateToken(objectKey: string, action: 'upload' | 'download', expiresInSeconds: number): { token: string; exp: number } {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${action}:${objectKey}:${exp}`;
    const token = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    return { token, exp };
  }

  public verifyToken(objectKey: string, action: 'upload' | 'download', token: string, exp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > exp) {
      return false; // Expired
    }

    const payload = `${action}:${objectKey}:${exp}`;
    const expected = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    const bufA = Buffer.from(token || '', 'hex');
    const bufB = Buffer.from(expected, 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.storageRoot)) {
        fs.mkdirSync(this.storageRoot, { recursive: true });
      }
      fs.accessSync(this.storageRoot, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  async initiateUpload(params: InitiateUploadParams): Promise<InitiateUploadResult> {
    const expiresInSeconds = params.expiresInSeconds || env.MEDIA_UPLOAD_URL_TTL_SECONDS;
    const { token, exp } = this.generateToken(params.objectKey, 'upload', expiresInSeconds);

    // In local development, the client PUTs directly to the backend local-storage handler
    const uploadUrl = `/api/media/local-storage/${encodeURIComponent(params.objectKey)}?token=${token}&exp=${exp}`;

    return {
      uploadUrl,
      method: 'PUT',
      directUploadToken: token,
      expiresInSeconds,
      headers: {
        'Content-Type': params.mimeType,
      }
    };
  }

  async verifyObject(objectKey: string, expectedMime?: string, maxBytes?: number): Promise<ObjectMetadata> {
    const filePath = this.safeResolvePath(objectKey);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Object not found in storage: ${objectKey}`);
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      throw new Error(`Object is not a valid file: ${objectKey}`);
    }

    if (maxBytes && stat.size > maxBytes) {
      throw new Error(`Object exceeds maximum permitted size of ${maxBytes} bytes`);
    }

    if (stat.size === 0) {
      throw new Error('Uploaded object is empty (0 bytes)');
    }

    return {
      objectKey,
      sizeBytes: stat.size,
      mimeType: expectedMime,
      lastModified: stat.mtime
    };
  }

  async getSignedDownloadUrl(objectKey: string, _filename?: string, expiresInSeconds?: number): Promise<string> {
    const ttl = expiresInSeconds || env.MEDIA_DOWNLOAD_URL_TTL_SECONDS;
    const { token, exp } = this.generateToken(objectKey, 'download', ttl);
    return `/api/media/local-storage/${encodeURIComponent(objectKey)}?token=${token}&exp=${exp}`;
  }

  async deleteObject(objectKey: string): Promise<boolean> {
    try {
      const filePath = this.safeResolvePath(objectKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Failed to delete local object ${objectKey}:`, err);
      return false;
    }
  }

  async getObjectBuffer(objectKey: string, maxBytes?: number): Promise<Buffer> {
    const filePath = this.safeResolvePath(objectKey);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Object not found: ${objectKey}`);
    }

    const stat = fs.statSync(filePath);
    if (maxBytes && stat.size > maxBytes) {
      // Read only the requested leading bytes for signature checks
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(maxBytes);
      fs.readSync(fd, buffer, 0, maxBytes, 0);
      fs.closeSync(fd);
      return buffer;
    }

    return fs.readFileSync(filePath);
  }

  async putObject(objectKey: string, buffer: Buffer, mimeType: string): Promise<ObjectMetadata> {
    const filePath = this.safeResolvePath(objectKey);
    const parentDir = path.dirname(filePath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    const stat = fs.statSync(filePath);

    return {
      objectKey,
      sizeBytes: stat.size,
      mimeType,
      lastModified: stat.mtime
    };
  }
}
