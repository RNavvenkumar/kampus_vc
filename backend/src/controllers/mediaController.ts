import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Types } from 'mongoose';
import { MediaAsset, IMediaAsset, MediaCategory } from '../models/MediaAsset.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { Project } from '../models/Project.js';
import { storageService } from '../storage/storageService.js';
import { mediaValidationService, ALL_ALLOWED_MIMES, ALLOWED_IMAGE_MIMES } from '../services/mediaValidationService.js';
import { env } from '../config/env.js';
import { LocalStorageProvider } from '../storage/localStorageProvider.js';

// Validation Schemas
const initiateUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  mimeType: z.string().refine((val) => ALL_ALLOWED_MIMES.includes(val), {
    message: 'Unsupported MIME type. Allowed: JPG, PNG, WebP, GIF, MP4, WebM, MOV.'
  }),
  fileSizeBytes: z.number().int().positive('File size must be positive'),
  category: z.enum(['image', 'video']).optional(),
  intendedUse: z.enum(['portfolio', 'avatar', 'cover', 'project_deliverable', 'general']).default('portfolio')
});

export const initiateMediaUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication is required to initiate media uploads.'
        }
      });
      return;
    }

    const parseResult = initiateUploadSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid upload request payload',
          details: parseResult.error.errors
        }
      });
      return;
    }

    const { filename, mimeType, fileSizeBytes, intendedUse } = parseResult.data;
    const isImage = ALLOWED_IMAGE_MIMES.includes(mimeType);
    const category: MediaCategory = isImage ? 'image' : 'video';

    // 1. Enforce size limits
    const maxBytes = isImage ? env.MEDIA_MAX_IMAGE_BYTES : env.MEDIA_MAX_VIDEO_BYTES;
    if (fileSizeBytes > maxBytes) {
      res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds the maximum permitted limit of ${Math.round(maxBytes / (1024 * 1024))}MB.`
        }
      });
      return;
    }

    // 2. Enforce active pending upload quota (max 20 pending initiated uploads per user)
    const pendingCount = await MediaAsset.countDocuments({
      userId: req.user.id,
      status: 'initiated',
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // past 30 mins
    });

    if (pendingCount >= 20) {
      res.status(429).json({
        error: {
          code: 'UPLOAD_QUOTA_EXCEEDED',
          message: 'Too many pending upload requests. Please complete or wait for previous uploads to finalize.'
        }
      });
      return;
    }

    // 3. Generate secure, unpredictable storage object key
    const sanitizedName = mediaValidationService.sanitizeFilename(filename);
    const uniqueId = crypto.randomUUID();
    const provider = storageService.getProvider();
    const objectKey = `uploads/${req.user.id}/${uniqueId}-${sanitizedName}`;

    // 4. Create persistent MediaAsset document in 'initiated' state
    const expiresAt = new Date(Date.now() + env.MEDIA_UPLOAD_URL_TTL_SECONDS * 1000);
    const asset = new MediaAsset({
      userId: req.user.id,
      storageProvider: provider.name,
      objectKey,
      originalFilename: filename,
      sanitizedFilename: sanitizedName,
      mimeType,
      category,
      fileSizeBytes,
      status: 'initiated',
      visibility: 'private', // starts private until attached or published
      expiresAt,
      metadata: {
        intendedUse
      }
    });

    await asset.save();

    // 5. Generate upload authorization via StorageProvider
    const uploadAuth = await provider.initiateUpload({
      objectKey,
      mimeType,
      fileSizeBytes,
      expiresInSeconds: env.MEDIA_UPLOAD_URL_TTL_SECONDS
    });

    res.status(201).json({
      message: 'Upload initiated successfully',
      data: {
        uploadId: asset.id,
        assetId: asset.id,
        objectKey: asset.objectKey,
        uploadUrl: uploadAuth.uploadUrl,
        method: uploadAuth.method,
        fields: uploadAuth.fields,
        headers: uploadAuth.headers || {},
        directUploadToken: uploadAuth.directUploadToken,
        expiresInSeconds: uploadAuth.expiresInSeconds,
        category: asset.category
      }
    });
  } catch (err: any) {
    console.error('Failed to initiate media upload:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while initiating media upload.'
      }
    });
  }
};

export const completeMediaUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const uploadId = Array.isArray(req.params.uploadId) ? req.params.uploadId[0] : req.params.uploadId;
    if (!uploadId || !Types.ObjectId.isValid(uploadId)) {
      res.status(400).json({
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Invalid upload ID format'
        }
      });
      return;
    }

    const asset = await MediaAsset.findOne({
      _id: uploadId,
      userId: req.user.id
    });

    if (!asset) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Upload record not found or unauthorized'
        }
      });
      return;
    }

    // Idempotent check: If already ready, return asset
    if (asset.status === 'ready') {
      res.status(200).json({
        message: 'Media asset is already verified and ready',
        data: {
          asset
        }
      });
      return;
    }

    const provider = storageService.getProvider();
    const maxBytes = asset.category === 'image' ? env.MEDIA_MAX_IMAGE_BYTES : env.MEDIA_MAX_VIDEO_BYTES;

    // 1. Verify object existence and size on storage provider
    let objectMeta;
    try {
      objectMeta = await provider.verifyObject(asset.objectKey, asset.mimeType, maxBytes);
    } catch (verifyErr: any) {
      asset.status = 'failed';
      asset.failureReason = verifyErr.message || 'Object not found or verification failed in storage';
      await asset.save();

      res.status(400).json({
        error: {
          code: 'UPLOAD_VERIFICATION_FAILED',
          message: asset.failureReason
        }
      });
      return;
    }

    // 2. Retrieve leading bytes for magic byte & codec inspection
    let buffer: Buffer;
    try {
      buffer = await provider.getObjectBuffer(asset.objectKey, 4096);
    } catch (bufErr: any) {
      asset.status = 'failed';
      asset.failureReason = 'Failed to read media buffer for validation';
      await asset.save();

      res.status(400).json({
        error: {
          code: 'BUFFER_READ_FAILED',
          message: 'Unable to inspect media file header'
        }
      });
      return;
    }

    // 3. Inspect and validate media content
    const validation = mediaValidationService.validateMediaContent(
      buffer,
      asset.mimeType,
      objectMeta.sizeBytes
    );

    if (!validation.isValid) {
      asset.status = 'rejected';
      asset.failureReason = validation.error || 'Media validation failed';
      await asset.save();

      // Delete the invalid file from storage
      await provider.deleteObject(asset.objectKey);

      res.status(400).json({
        error: {
          code: 'MEDIA_VALIDATION_FAILED',
          message: validation.error || 'Invalid or malformed media content'
        }
      });
      return;
    }

    // 4. Update asset to 'ready'
    asset.status = 'ready';
    asset.fileSizeBytes = objectMeta.sizeBytes;
    if (validation.dimensions) {
      asset.dimensions = validation.dimensions;
    }
    asset.expiresAt = undefined;
    asset.failureReason = undefined;

    await asset.save();

    // Generate viewing access URL
    const accessUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);

    res.status(200).json({
      message: 'Media upload successfully verified and ready',
      data: {
        asset,
        accessUrl
      }
    });
  } catch (err: any) {
    console.error('Failed to complete media upload:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while verifying media upload.'
      }
    });
  }
};

export const getMediaAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = Array.isArray(req.params.assetId) ? req.params.assetId[0] : req.params.assetId;
    if (!assetId || !Types.ObjectId.isValid(assetId)) {
      res.status(400).json({
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Invalid asset ID'
        }
      });
      return;
    }

    const asset = await MediaAsset.findById(assetId);
    if (!asset) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Media asset not found'
        }
      });
      return;
    }

    // Access authorization
    const isOwner = req.user && asset.userId.equals(req.user.id);
    const isPublicReady = asset.status === 'ready' && asset.visibility === 'public';
    const isUnlistedAuth = asset.visibility === 'unlisted' && req.user;

    let hasProjectAccess = false;
    if (req.user && asset.linkedEntities && asset.linkedEntities.some(e => e.entityType === 'project')) {
      const projectIds = asset.linkedEntities
        .filter(e => e.entityType === 'project')
        .map(e => e.entityId);
      const userObjectId = new Types.ObjectId(req.user.id);
      const authorizedProject = await Project.findOne({
        _id: { $in: projectIds },
        $or: [{ creatorId: userObjectId }, { brandId: userObjectId }]
      });
      if (authorizedProject) {
        hasProjectAccess = true;
      }
    }

    if (!isOwner && !isPublicReady && !isUnlistedAuth && !hasProjectAccess) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this media asset.'
        }
      });
      return;
    }

    const provider = storageService.getProvider();
    const accessUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);

    res.status(200).json({
      data: {
        asset,
        accessUrl
      }
    });
  } catch (err: any) {
    console.error('Failed to get media asset:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve media asset'
      }
    });
  }
};

export const getMediaAssetAccessUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = Array.isArray(req.params.assetId) ? req.params.assetId[0] : req.params.assetId;
    if (!assetId || !Types.ObjectId.isValid(assetId)) {
      res.status(400).json({
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Invalid asset ID'
        }
      });
      return;
    }

    const asset = await MediaAsset.findById(assetId);
    if (!asset) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Media asset not found'
        }
      });
      return;
    }

    if (asset.status !== 'ready') {
      res.status(400).json({
        error: {
          code: 'ASSET_NOT_READY',
          message: `Asset is currently in ${asset.status} state.`
        }
      });
      return;
    }

    const isOwner = req.user && asset.userId.equals(req.user.id);
    const isPublic = asset.visibility === 'public';
    const isUnlisted = asset.visibility === 'unlisted';

    let hasProjectAccess = false;
    if (req.user && asset.linkedEntities && asset.linkedEntities.some(e => e.entityType === 'project')) {
      const projectIds = asset.linkedEntities
        .filter(e => e.entityType === 'project')
        .map(e => e.entityId);
      const userObjectId = new Types.ObjectId(req.user.id);
      const authorizedProject = await Project.findOne({
        _id: { $in: projectIds },
        $or: [{ creatorId: userObjectId }, { brandId: userObjectId }]
      });
      if (authorizedProject) {
        hasProjectAccess = true;
      }
    }

    if (!isOwner && !isPublic && !isUnlisted && !hasProjectAccess) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this private media asset.'
        }
      });
      return;
    }

    const provider = storageService.getProvider();
    const accessUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);

    res.status(200).json({
      data: {
        assetId: asset.id,
        accessUrl,
        mimeType: asset.mimeType,
        category: asset.category
      }
    });
  } catch (err: any) {
    console.error('Failed to get asset access URL:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate asset access URL'
      }
    });
  }
};

export const deleteMediaAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const assetId = Array.isArray(req.params.assetId) ? req.params.assetId[0] : req.params.assetId;
    const force = req.query.force === 'true';

    if (!assetId || !Types.ObjectId.isValid(assetId)) {
      res.status(400).json({
        error: {
          code: 'INVALID_ASSET_ID',
          message: 'Invalid asset ID'
        }
      });
      return;
    }

    const asset = await MediaAsset.findOne({
      _id: assetId,
      userId: req.user.id
    });

    if (!asset) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Media asset not found or unauthorized'
        }
      });
      return;
    }

    // Check if referenced in creator's active portfolio items
    const profile = await CreatorProfile.findOne({
      userId: req.user.id,
      $or: [
        { 'portfolioItems.assetId': asset._id },
        { 'portfolioItems.thumbnailAssetId': asset._id }
      ]
    });

    if (profile && !force) {
      res.status(409).json({
        error: {
          code: 'ASSET_IN_USE',
          message: 'This asset is currently attached to one or more portfolio items. Unlink or pass ?force=true to delete.'
        }
      });
      return;
    }

    // If force is true, unlink from profile
    if (profile) {
      profile.portfolioItems = profile.portfolioItems.map((item) => {
        if (item.assetId && item.assetId.toString() === asset.id) {
          item.assetId = undefined;
        }
        if (item.thumbnailAssetId && item.thumbnailAssetId.toString() === asset.id) {
          item.thumbnailAssetId = undefined;
        }
        return item;
      });
      await profile.save();
    }

    // Delete from storage provider
    const provider = storageService.getProvider();
    await provider.deleteObject(asset.objectKey);

    // Delete database document
    await MediaAsset.findByIdAndDelete(assetId);

    res.status(200).json({
      message: 'Media asset deleted successfully'
    });
  } catch (err: any) {
    console.error('Failed to delete media asset:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete media asset'
      }
    });
  }
};

export const getMyMediaAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { userId: req.user.id };

    if (req.query.category && ['image', 'video'].includes(req.query.category as string)) {
      query.category = req.query.category;
    }

    if (req.query.status && typeof req.query.status === 'string') {
      query.status = req.query.status;
    }

    const [assets, total] = await Promise.all([
      MediaAsset.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      MediaAsset.countDocuments(query)
    ]);

    const provider = storageService.getProvider();
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        let accessUrl: string | undefined;
        if (asset.status === 'ready') {
          accessUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);
        }
        return {
          ...asset.toJSON(),
          accessUrl
        };
      })
    );

    res.status(200).json({
      data: {
        assets: assetsWithUrls,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err: any) {
    console.error('Failed to get media assets:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve media assets'
      }
    });
  }
};

/**
 * Direct Local Storage Upload Handler (for local development provider)
 */
export const handleLocalStorageUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawKey = req.params[0] || req.params.objectKey;
    const objectKey = Array.isArray(rawKey) ? rawKey[0] : String(rawKey || '');
    const token = req.query.token as string;
    const exp = parseInt(req.query.exp as string, 10);

    if (!objectKey || !token || isNaN(exp)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORAGE_REQUEST',
          message: 'Missing objectKey, authorization token, or expiration'
        }
      });
      return;
    }

    const provider = storageService.getProvider();
    if (!(provider instanceof LocalStorageProvider)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORAGE_PROVIDER',
          message: 'Direct local storage upload is only supported when using local storage provider.'
        }
      });
      return;
    }

    const isValidToken = provider.verifyToken(objectKey, 'upload', token, exp);
    if (!isValidToken) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Upload token is invalid or has expired.'
        }
      });
      return;
    }

    // Write file safely
    const filePath = provider.safeResolvePath(objectKey);
    const parentDir = path.dirname(filePath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(filePath);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const stat = fs.statSync(filePath);
      res.status(200).json({
        message: 'File uploaded successfully to local storage',
        sizeBytes: stat.size
      });
    });

    writeStream.on('error', (streamErr) => {
      console.error('Local storage write stream error:', streamErr);
      res.status(500).json({
        error: {
          code: 'STORAGE_WRITE_ERROR',
          message: 'Failed to write file to local disk.'
        }
      });
    });
  } catch (err: any) {
    console.error('Local storage upload handler error:', err);
    res.status(500).json({
      error: {
        code: 'STORAGE_ERROR',
        message: err.message || 'Error processing local storage upload'
      }
    });
  }
};

/**
 * Direct Local Storage Download Handler (for local development provider)
 */
export const handleLocalStorageDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawKey = req.params[0] || req.params.objectKey;
    const objectKey = Array.isArray(rawKey) ? rawKey[0] : String(rawKey || '');
    const token = req.query.token as string;
    const exp = parseInt(req.query.exp as string, 10);

    if (!objectKey || !token || isNaN(exp)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORAGE_REQUEST',
          message: 'Missing objectKey, download token, or expiration'
        }
      });
      return;
    }

    const provider = storageService.getProvider();
    if (!(provider instanceof LocalStorageProvider)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORAGE_PROVIDER',
          message: 'Local storage download is only supported when using local storage provider.'
        }
      });
      return;
    }

    const isValidToken = provider.verifyToken(objectKey, 'download', token, exp);
    if (!isValidToken) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Download token is invalid or has expired.'
        }
      });
      return;
    }

    const filePath = provider.safeResolvePath(objectKey);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Object not found in local storage.'
        }
      });
      return;
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    // Detect MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mov') contentType = 'video/quicktime';

    // Support HTTP Range requests for video streaming
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      if (start >= stat.size || end >= stat.size) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
        res.end();
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600'
      });

      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600'
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('Local storage download handler error:', err);
    res.status(500).json({
      error: {
        code: 'STORAGE_ERROR',
        message: err.message || 'Error downloading local storage file'
      }
    });
  }
};
