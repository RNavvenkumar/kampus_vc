import { v2 as cloudinary } from 'cloudinary';
import { IStorageProvider, InitiateUploadParams, InitiateUploadResult, ObjectMetadata } from './storageInterface.js';
import { env } from '../config/env.js';

export class CloudinaryStorageProvider implements IStorageProvider {
  readonly name = 'cloudinary';
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    this.cloudName = env.CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = env.CLOUDINARY_API_KEY || '';
    this.apiSecret = env.CLOUDINARY_API_SECRET || '';

    if (this.cloudName && this.apiKey && this.apiSecret) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true
      });
    }
  }

  public async isAvailable(): Promise<boolean> {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  public async initiateUpload(params: InitiateUploadParams): Promise<InitiateUploadResult> {
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = params.objectKey.replace(/\.[^/.]+$/, '');

    const paramsToSign: Record<string, any> = {
      public_id: publicId,
      timestamp
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);
    const resourceType = params.mimeType.startsWith('video/') ? 'video' : 'image';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    return {
      uploadUrl,
      method: 'POST',
      fields: {
        api_key: this.apiKey,
        timestamp: String(timestamp),
        public_id: publicId,
        signature
      },
      headers: {
        'Accept': 'application/json'
      },
      expiresInSeconds: params.expiresInSeconds || env.MEDIA_UPLOAD_URL_TTL_SECONDS
    };
  }

  public async verifyObject(objectKey: string, expectedMime?: string, maxBytes?: number): Promise<ObjectMetadata> {
    const publicId = objectKey.replace(/\.[^/.]+$/, '');
    const resourceType = expectedMime?.startsWith('video/') ? 'video' : 'image';

    try {
      const res = await cloudinary.api.resource(publicId, { resource_type: resourceType });
      const sizeBytes = res.bytes || 0;
      if (maxBytes && sizeBytes > maxBytes) {
        throw new Error(`Cloudinary object size ${sizeBytes} exceeds maximum allowed limit ${maxBytes}`);
      }

      return {
        objectKey,
        sizeBytes,
        mimeType: res.format ? `${resourceType}/${res.format}` : expectedMime,
        etag: res.etag || res.version?.toString(),
        lastModified: res.created_at ? new Date(res.created_at) : new Date()
      };
    } catch (err: any) {
      throw new Error(`Cloudinary object verification failed for ${objectKey}: ${err.message || 'Resource not found'}`);
    }
  }

  public async getSignedDownloadUrl(objectKey: string, _filename?: string, _expiresInSeconds?: number): Promise<string> {
    const publicId = objectKey.replace(/\.[^/.]+$/, '');
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: 'auto'
    });
  }

  public async deleteObject(objectKey: string): Promise<boolean> {
    const publicId = objectKey.replace(/\.[^/.]+$/, '');
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      return true;
    } catch {
      return false;
    }
  }

  public async getObjectBuffer(objectKey: string, _maxBytes?: number): Promise<Buffer> {
    const url = await this.getSignedDownloadUrl(objectKey);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Cloudinary object buffer: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  public async putObject(objectKey: string, buffer: Buffer, mimeType: string): Promise<ObjectMetadata> {
    const publicId = objectKey.replace(/\.[^/.]+$/, '');
    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType
        },
        (error, result) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }
          resolve({
            objectKey,
            sizeBytes: result.bytes,
            mimeType: `${resourceType}/${result.format}`,
            etag: result.etag || result.version?.toString(),
            lastModified: new Date(result.created_at)
          });
        }
      );
      uploadStream.end(buffer);
    });
  }
}
