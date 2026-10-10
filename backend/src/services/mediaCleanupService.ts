import { MediaAsset } from '../models/MediaAsset.js';
import { storageService } from '../storage/storageService.js';

export interface CleanupResult {
  expiredInitiatedDeleted: number;
  failedRejectedDeleted: number;
  storageObjectsDeleted: number;
  errors: string[];
}

export class MediaCleanupService {
  /**
   * Cleans up expired, abandoned, and failed media uploads.
   */
  public async cleanupExpiredUploads(): Promise<CleanupResult> {
    const result: CleanupResult = {
      expiredInitiatedDeleted: 0,
      failedRejectedDeleted: 0,
      storageObjectsDeleted: 0,
      errors: []
    };

    const now = new Date();
    const provider = storageService.getProvider();

    try {
      // 1. Find expired initiated uploads (e.g. older than expiresAt or 1 hour old without completion)
      const expiredInitiated = await MediaAsset.find({
        status: 'initiated',
        $or: [
          { expiresAt: { $lt: now } },
          { createdAt: { $lt: new Date(now.getTime() - 60 * 60 * 1000) } }
        ]
      }).limit(100);

      for (const asset of expiredInitiated) {
        try {
          await provider.deleteObject(asset.objectKey);
          result.storageObjectsDeleted++;
        } catch (err: any) {
          // Object might not have been uploaded, which is fine
        }
        await MediaAsset.findByIdAndDelete(asset._id);
        result.expiredInitiatedDeleted++;
      }

      // 2. Find failed or rejected uploads older than 24 hours with no active links
      const failedOrRejected = await MediaAsset.find({
        status: { $in: ['failed', 'rejected'] },
        linkedEntities: { $size: 0 },
        createdAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }).limit(100);

      for (const asset of failedOrRejected) {
        try {
          await provider.deleteObject(asset.objectKey);
          result.storageObjectsDeleted++;
        } catch (err: any) {
          // Ignore delete failure
        }
        await MediaAsset.findByIdAndDelete(asset._id);
        result.failedRejectedDeleted++;
      }
    } catch (err: any) {
      result.errors.push(err.message || 'Error during media cleanup execution');
    }

    return result;
  }
}

export const mediaCleanupService = new MediaCleanupService();
