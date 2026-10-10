export interface InitiateUploadParams {
  objectKey: string;
  mimeType: string;
  fileSizeBytes: number;
  isPublic?: boolean;
  expiresInSeconds?: number;
  metadata?: Record<string, string>;
}

export interface InitiateUploadResult {
  uploadUrl: string;
  method: 'PUT' | 'POST';
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  directUploadToken?: string;
  expiresInSeconds: number;
}

export interface ObjectMetadata {
  objectKey: string;
  sizeBytes: number;
  mimeType?: string;
  etag?: string;
  lastModified?: Date;
}

export interface IStorageProvider {
  readonly name: string;

  /**
   * Checks if the storage provider is reachable and correctly configured.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generates a pre-signed or direct-upload URL and headers for a client upload.
   */
  initiateUpload(params: InitiateUploadParams): Promise<InitiateUploadResult>;

  /**
   * Verifies that an object actually exists in storage and matches size/type constraints.
   */
  verifyObject(objectKey: string, expectedMime?: string, maxBytes?: number): Promise<ObjectMetadata>;

  /**
   * Generates a short-lived authorized download or viewing URL for the object.
   */
  getSignedDownloadUrl(objectKey: string, filename?: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Deletes an object from storage.
   */
  deleteObject(objectKey: string): Promise<boolean>;

  /**
   * Retrieves an object buffer for server-side validation or processing.
   */
  getObjectBuffer(objectKey: string, maxBytes?: number): Promise<Buffer>;

  /**
   * Stores a buffer directly into storage.
   */
  putObject(objectKey: string, buffer: Buffer, mimeType: string): Promise<ObjectMetadata>;
}
