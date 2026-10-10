import crypto from 'crypto';
import { IStorageProvider, InitiateUploadParams, InitiateUploadResult, ObjectMetadata } from './storageInterface.js';
import { env } from '../config/env.js';

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
}

export class S3StorageProvider implements IStorageProvider {
  readonly name = 's3';
  private readonly config: S3Config;

  constructor(config?: Partial<S3Config>) {
    this.config = {
      bucket: config?.bucket || env.MEDIA_BUCKET || '',
      region: config?.region || env.MEDIA_REGION || 'us-east-1',
      endpoint: config?.endpoint || env.MEDIA_ENDPOINT,
      accessKeyId: config?.accessKeyId || env.MEDIA_ACCESS_KEY_ID || '',
      secretAccessKey: config?.secretAccessKey || env.MEDIA_SECRET_ACCESS_KEY || '',
      publicBaseUrl: config?.publicBaseUrl || env.MEDIA_PUBLIC_BASE_URL
    };

    // If instantiated in production without credentials, validate eagerly
    if (env.NODE_ENV === 'production') {
      if (!this.config.bucket || !this.config.accessKeyId || !this.config.secretAccessKey) {
        throw new Error(
          'Production S3 configuration error: MEDIA_BUCKET, MEDIA_ACCESS_KEY_ID, and MEDIA_SECRET_ACCESS_KEY must be provided.'
        );
      }
    }
  }

  private getHost(): string {
    if (this.config.endpoint) {
      const url = new URL(this.config.endpoint);
      return url.host;
    }
    return `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
  }

  private getEndpointUrl(objectKey: string): string {
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
    if (this.config.endpoint) {
      const base = this.config.endpoint.replace(/\/$/, '');
      return `${base}/${this.config.bucket}/${encodedKey}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${encodedKey}`;
  }

  /**
   * Generates standard AWS SigV4 Presigned URL for PUT or GET requests
   */
  private generatePresignedUrl(
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
    objectKey: string,
    expiresInSeconds: number,
    headers: Record<string, string> = {}
  ): string {
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 8);
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const service = 's3';
    const region = this.config.region;
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const host = this.getHost();
    const canonicalUri = `/${encodeURIComponent(objectKey).replace(/%2F/g, '/')}`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresInSeconds.toString(),
      'X-Amz-SignedHeaders': 'host'
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${this.config.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const baseUrl = this.getEndpointUrl(objectKey);
    return `${baseUrl}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.bucket || !this.config.accessKeyId || !this.config.secretAccessKey) {
      return false;
    }
    return true;
  }

  async initiateUpload(params: InitiateUploadParams): Promise<InitiateUploadResult> {
    const expiresInSeconds = params.expiresInSeconds || env.MEDIA_UPLOAD_URL_TTL_SECONDS;
    const uploadUrl = this.generatePresignedUrl('PUT', params.objectKey, expiresInSeconds, {
      'Content-Type': params.mimeType
    });

    return {
      uploadUrl,
      method: 'PUT',
      expiresInSeconds,
      headers: {
        'Content-Type': params.mimeType
      }
    };
  }

  async verifyObject(objectKey: string, expectedMime?: string, maxBytes?: number): Promise<ObjectMetadata> {
    const signedUrl = this.generatePresignedUrl('HEAD', objectKey, 60);

    try {
      const response = await fetch(signedUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`S3 HEAD request failed with status: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const sizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const contentType = response.headers.get('content-type') || expectedMime;
      const etag = response.headers.get('etag')?.replace(/"/g, '') || undefined;

      if (maxBytes && sizeBytes > maxBytes) {
        throw new Error(`Object exceeds maximum permitted size of ${maxBytes} bytes`);
      }

      return {
        objectKey,
        sizeBytes,
        mimeType: contentType,
        etag
      };
    } catch (err: any) {
      throw new Error(`Failed to verify object in S3: ${err.message || 'Unknown error'}`);
    }
  }

  async getSignedDownloadUrl(objectKey: string, filename?: string, expiresInSeconds?: number): Promise<string> {
    if (this.config.publicBaseUrl) {
      const base = this.config.publicBaseUrl.replace(/\/$/, '');
      const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
      return `${base}/${encodedKey}`;
    }

    const ttl = expiresInSeconds || env.MEDIA_DOWNLOAD_URL_TTL_SECONDS;
    return this.generatePresignedUrl('GET', objectKey, ttl);
  }

  async deleteObject(objectKey: string): Promise<boolean> {
    const signedUrl = this.generatePresignedUrl('DELETE', objectKey, 60);
    try {
      const response = await fetch(signedUrl, { method: 'DELETE' });
      return response.ok || response.status === 204 || response.status === 404;
    } catch {
      return false;
    }
  }

  async getObjectBuffer(objectKey: string, maxBytes?: number): Promise<Buffer> {
    const signedUrl = this.generatePresignedUrl('GET', objectKey, 60);
    const headers: Record<string, string> = {};
    if (maxBytes) {
      headers['Range'] = `bytes=0-${maxBytes - 1}`;
    }

    const response = await fetch(signedUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch object buffer from S3: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async putObject(objectKey: string, buffer: Buffer, mimeType: string): Promise<ObjectMetadata> {
    const signedUrl = this.generatePresignedUrl('PUT', objectKey, 60);
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType
      },
      body: new Uint8Array(buffer)
    });

    if (!response.ok) {
      throw new Error(`Failed to PUT object to S3: ${response.statusText}`);
    }

    return {
      objectKey,
      sizeBytes: buffer.length,
      mimeType
    };
  }
}
