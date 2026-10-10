import { IStorageProvider } from './storageInterface.js';
import { LocalStorageProvider } from './localStorageProvider.js';
import { S3StorageProvider } from './s3StorageProvider.js';
import { CloudinaryStorageProvider } from './cloudinaryStorageProvider.js';
import { env } from '../config/env.js';

class StorageService {
  private provider: IStorageProvider;

  constructor() {
    this.provider = this.createDefaultProvider();
  }

  private createDefaultProvider(): IStorageProvider {
    if (env.MEDIA_STORAGE_PROVIDER === 'cloudinary') {
      if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
        return new CloudinaryStorageProvider();
      }
      console.warn('⚠️ Cloudinary credentials missing or incomplete, falling back to LocalStorageProvider');
      return new LocalStorageProvider();
    }
    if (env.MEDIA_STORAGE_PROVIDER === 's3') {
      if (env.MEDIA_BUCKET && env.MEDIA_ACCESS_KEY_ID && env.MEDIA_SECRET_ACCESS_KEY) {
        return new S3StorageProvider();
      }
      console.warn('⚠️ S3 credentials missing or incomplete, falling back to LocalStorageProvider');
      return new LocalStorageProvider();
    }
    return new LocalStorageProvider();
  }

  public getProvider(): IStorageProvider {
    return this.provider;
  }

  public setProvider(customProvider: IStorageProvider): void {
    this.provider = customProvider;
  }

  public resetProvider(): void {
    this.provider = this.createDefaultProvider();
  }
}

export const storageService = new StorageService();
