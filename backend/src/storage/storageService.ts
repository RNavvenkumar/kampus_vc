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
    if (env.MEDIA_STORAGE_PROVIDER === 's3') {
      return new S3StorageProvider();
    }
    if (env.MEDIA_STORAGE_PROVIDER === 'cloudinary') {
      return new CloudinaryStorageProvider();
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
