import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { LocalStorageProvider } from '../storage/localStorageProvider.js';
import { storageService } from '../storage/storageService.js';
import { mediaValidationService } from '../services/mediaValidationService.js';
import { mediaCleanupService } from '../services/mediaCleanupService.js';

let mongoServer: MongoMemoryServer;
let app: any;

describe('Phase 7 — Secure Media Uploads, Portfolio Asset Management & Object Storage Tests', () => {
  let testStorageDir: string;
  let creatorCookie: string;
  let otherCreatorCookie: string;
  let creatorId: string;
  let otherCreatorId: string;

  // Standard 1x1 Transparent PNG sample buffer (valid magic bytes and IHDR dimensions: 1x1)
  const validPngBuffer = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
    'hex'
  );

  // Standard JPEG header sample buffer
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43
  ]);

  // Fake executable disguised with image extension
  const fakeExecutableBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This is not a real image');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
    app = createApp();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await MediaAsset.deleteMany({});
    await CreatorProfile.deleteMany({});

    // Use isolated temporary directory for test storage
    testStorageDir = path.resolve(process.cwd(), `tmp-test-storage-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    const testProvider = new LocalStorageProvider(testStorageDir);
    storageService.setProvider(testProvider);

    // Register creator 1
    const regRes1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: `media.creator.${Date.now()}.${Math.random().toString(36).substring(7)}@kampus.vc`,
        password: 'Password123!Safe',
        confirmPassword: 'Password123!Safe',
        name: 'Media Artist Alpha',
        role: 'creator'
      });
    creatorCookie = regRes1.headers['set-cookie']?.[0] || '';
    creatorId = regRes1.body?.data?.user?.id || '';

    // Register creator 2
    const regRes2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: `media.creator2.${Date.now()}.${Math.random().toString(36).substring(7)}@kampus.vc`,
        password: 'Password123!Safe',
        confirmPassword: 'Password123!Safe',
        name: 'Media Artist Beta',
        role: 'creator'
      });
    otherCreatorCookie = regRes2.headers['set-cookie']?.[0] || '';
    otherCreatorId = regRes2.body.data.user.id;
  });

  afterEach(async () => {
    // Clean up temporary test storage directory
    try {
      if (fs.existsSync(testStorageDir)) {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error in test tear-down
    }
  });

  describe('1. Storage Provider & Path Traversal Security', () => {
    it('defends against path traversal attacks in object keys', () => {
      const provider = storageService.getProvider() as LocalStorageProvider;

      expect(() => {
        provider.safeResolvePath('../../../etc/passwd');
      }).toThrow();

      expect(() => {
        provider.safeResolvePath('..\\..\\..\\windows\\system32\\cmd.exe');
      }).toThrow();

      expect(() => {
        provider.safeResolvePath('/absolute/path/attempt');
      }).toThrow();

      // Safe relative key inside storage
      const safePath = provider.safeResolvePath('uploads/user123/sample.png');
      expect(safePath.startsWith(provider.getStorageRoot())).toBe(true);
    });

    it('generates and validates HMAC signed upload/download tokens', () => {
      const provider = storageService.getProvider() as LocalStorageProvider;
      const objectKey = 'uploads/user123/file.jpg';

      const { token, exp } = provider.generateToken(objectKey, 'upload', 60);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const isValid = provider.verifyToken(objectKey, 'upload', token, exp);
      expect(isValid).toBe(true);

      // Fails with wrong action or wrong key
      expect(provider.verifyToken(objectKey, 'download', token, exp)).toBe(false);
      expect(provider.verifyToken('uploads/other/file.jpg', 'upload', token, exp)).toBe(false);

      // Fails when expired
      expect(provider.verifyToken(objectKey, 'upload', token, exp - 1000)).toBe(false);
    });
  });

  describe('2. Media Upload Initiation & Validation', () => {
    it('rejects unauthenticated upload initiation with 401', async () => {
      const res = await request(app)
        .post('/api/media/uploads')
        .send({
          filename: 'artwork.png',
          mimeType: 'image/png',
          fileSizeBytes: 10240
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects unsupported and dangerous MIME types (e.g. SVG, EXE, ZIP)', async () => {
      const res = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'malicious.svg',
          mimeType: 'image/svg+xml',
          fileSizeBytes: 10240
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects files exceeding configured size limits', async () => {
      const res = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'huge_image.png',
          mimeType: 'image/png',
          fileSizeBytes: 50 * 1024 * 1024 // 50MB (exceeds 25MB limit)
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('initiates upload successfully and creates persistent MediaAsset in initiated status', async () => {
      const res = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'concept_art_final.png',
          mimeType: 'image/png',
          fileSizeBytes: validPngBuffer.length
        });

      expect(res.status).toBe(201);
      expect(res.body.data.uploadId).toBeDefined();
      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.objectKey).toContain(creatorId);
      expect(res.body.data.category).toBe('image');

      const asset = await MediaAsset.findById(res.body.data.uploadId);
      expect(asset).toBeDefined();
      expect(asset?.status).toBe('initiated');
      expect(asset?.visibility).toBe('private');
      expect(asset?.originalFilename).toBe('concept_art_final.png');
    });
  });

  describe('3. Content Inspection, Magic Bytes & Upload Completion', () => {
    it('detects magic bytes accurately and extracts image dimensions', () => {
      const detectedPng = mediaValidationService.detectMimeType(validPngBuffer);
      expect(detectedPng).toBe('image/png');

      const dimensions = mediaValidationService.extractImageDimensions(validPngBuffer, 'image/png');
      expect(dimensions).toBeDefined();
      expect(dimensions?.width).toBe(1);
      expect(dimensions?.height).toBe(1);

      const detectedJpeg = mediaValidationService.detectMimeType(validJpegBuffer);
      expect(detectedJpeg).toBe('image/jpeg');

      const detectedFake = mediaValidationService.detectMimeType(fakeExecutableBuffer);
      expect(detectedFake).toBe('application/x-dosexec');
    });

    it('rejects upload completion when magic bytes do not match declared MIME type', async () => {
      // 1. Initiate upload
      const initRes = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'fake_photo.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: fakeExecutableBuffer.length
        });
      const { uploadId, uploadUrl } = initRes.body.data;

      // 2. Upload fake executable buffer to local storage
      const uploadRes = await request(app)
        .put(uploadUrl)
        .set('Content-Type', 'image/jpeg')
        .send(fakeExecutableBuffer);
      expect(uploadRes.status).toBe(200);

      // 3. Complete upload (should fail inspection)
      const completeRes = await request(app)
        .post(`/api/media/uploads/${uploadId}/complete`)
        .set('Cookie', creatorCookie);

      expect(completeRes.status).toBe(400);
      expect(completeRes.body.error.code).toBe('MEDIA_VALIDATION_FAILED');

      const asset = await MediaAsset.findById(uploadId);
      expect(asset?.status).toBe('rejected');
      expect(asset?.failureReason).toBeDefined();
    });

    it('orchestrates complete upload lifecycle: initiate -> direct upload -> complete -> ready', async () => {
      // 1. Initiate upload
      const initRes = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'hero_character.png',
          mimeType: 'image/png',
          fileSizeBytes: validPngBuffer.length
        });
      expect(initRes.status).toBe(201);
      const { uploadId, uploadUrl } = initRes.body.data;

      // 2. Direct upload to storage
      const uploadRes = await request(app)
        .put(uploadUrl)
        .set('Content-Type', 'image/png')
        .send(validPngBuffer);
      expect(uploadRes.status).toBe(200);

      // 3. Complete and verify
      const completeRes = await request(app)
        .post(`/api/media/uploads/${uploadId}/complete`)
        .set('Cookie', creatorCookie);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.asset.status).toBe('ready');
      expect(completeRes.body.data.asset.dimensions?.width).toBe(1);
      expect(completeRes.body.data.asset.dimensions?.height).toBe(1);
      expect(completeRes.body.data.accessUrl).toBeDefined();

      // 4. Calling complete again is idempotent
      const retryComplete = await request(app)
        .post(`/api/media/uploads/${uploadId}/complete`)
        .set('Cookie', creatorCookie);
      expect(retryComplete.status).toBe(200);
      expect(retryComplete.body.data.asset.status).toBe('ready');
    });
  });

  describe('4. Asset Access Authorization & Privacy', () => {
    it('allows owner to access their private ready asset, but forbids other users', async () => {
      // Upload asset for Creator 1
      const initRes = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'private_draft.png',
          mimeType: 'image/png',
          fileSizeBytes: validPngBuffer.length
        });
      const { uploadId, uploadUrl } = initRes.body.data;

      await request(app).put(uploadUrl).send(validPngBuffer);
      await request(app).post(`/api/media/uploads/${uploadId}/complete`).set('Cookie', creatorCookie);

      // Creator 1 (owner) accesses asset metadata
      const ownerRes = await request(app)
        .get(`/api/media/assets/${uploadId}`)
        .set('Cookie', creatorCookie);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.asset.originalFilename).toBe('private_draft.png');

      // Creator 2 (foreign user) is forbidden from accessing private asset
      const foreignRes = await request(app)
        .get(`/api/media/assets/${uploadId}`)
        .set('Cookie', otherCreatorCookie);
      expect(foreignRes.status).toBe(403);
      expect(foreignRes.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('5. Creator Portfolio Integration & Asset Linking', () => {
    it('attaches ready media asset to portfolio item and synchronizes public visibility', async () => {
      // 1. Upload media asset
      const initRes = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'portfolio_render.png',
          mimeType: 'image/png',
          fileSizeBytes: validPngBuffer.length
        });
      const { uploadId, uploadUrl } = initRes.body.data;

      await request(app).put(uploadUrl).send(validPngBuffer);
      await request(app).post(`/api/media/uploads/${uploadId}/complete`).set('Cookie', creatorCookie);

      // 2. Create portfolio item referencing the asset
      const portRes = await request(app)
        .post('/api/creator/portfolio')
        .set('Cookie', creatorCookie)
        .send({
          title: 'Cyberpunk Drone 3D Render',
          description: 'High-poly procedural vehicle model',
          category: '3D Animation & Motion',
          mediaType: 'image',
          mediaUrl: `/api/media/assets/${uploadId}`,
          assetId: uploadId,
          visibility: 'public'
        });

      expect(portRes.status).toBe(201);
      expect(portRes.body.data.assetId).toBeDefined();

      // 3. Verify MediaAsset visibility synchronized to public
      const updatedAsset = await MediaAsset.findById(uploadId);
      expect(updatedAsset?.visibility).toBe('public');

      // 4. Update portfolio item to private -> asset visibility synchronizes to private
      const updateRes = await request(app)
        .patch(`/api/creator/portfolio/${portRes.body.data.id}`)
        .set('Cookie', creatorCookie)
        .send({
          visibility: 'private'
        });
      expect(updateRes.status).toBe(200);

      const privateAsset = await MediaAsset.findById(uploadId);
      expect(privateAsset?.visibility).toBe('private');
    });

    it('rejects attaching another creator media asset (cross-user violation)', async () => {
      // Creator 1 uploads an asset
      const initRes = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'creator1_artwork.png',
          mimeType: 'image/png',
          fileSizeBytes: validPngBuffer.length
        });
      const { uploadId, uploadUrl } = initRes.body.data;
      await request(app).put(uploadUrl).send(validPngBuffer);
      await request(app).post(`/api/media/uploads/${uploadId}/complete`).set('Cookie', creatorCookie);

      // Creator 2 tries to attach Creator 1's asset
      const hijackRes = await request(app)
        .post('/api/creator/portfolio')
        .set('Cookie', otherCreatorCookie)
        .send({
          title: 'Stolen Artwork',
          category: '3D Animation & Motion',
          mediaType: 'image',
          mediaUrl: `/api/media/assets/${uploadId}`,
          assetId: uploadId,
          visibility: 'public'
        });

      expect(hijackRes.status).toBe(404);
      expect(hijackRes.body.error.code).toBe('ASSET_NOT_FOUND');
    });
  });

  describe('6. Asset Deletion & Reference Integrity', () => {
    it('prevents asset deletion if currently attached to an active portfolio item unless force=true', async () => {
      // Upload asset and attach to portfolio
      const initRes = await request(app)
        .post('/api/media/uploads')
        .set('Cookie', creatorCookie)
        .send({
          filename: 'linked_render.png',
          mimeType: 'image/png',
          fileSizeBytes: validPngBuffer.length
        });
      const { uploadId, uploadUrl } = initRes.body.data;
      await request(app).put(uploadUrl).send(validPngBuffer);
      await request(app).post(`/api/media/uploads/${uploadId}/complete`).set('Cookie', creatorCookie);

      await request(app)
        .post('/api/creator/portfolio')
        .set('Cookie', creatorCookie)
        .send({
          title: 'Linked Item',
          category: 'General',
          mediaType: 'image',
          mediaUrl: `/api/media/assets/${uploadId}`,
          assetId: uploadId
        });

      // Attempt to delete asset without force
      const deleteRes = await request(app)
        .delete(`/api/media/assets/${uploadId}`)
        .set('Cookie', creatorCookie);

      expect(deleteRes.status).toBe(409);
      expect(deleteRes.body.error.code).toBe('ASSET_IN_USE');

      // Delete with force=true unlinks and deletes
      const forceDeleteRes = await request(app)
        .delete(`/api/media/assets/${uploadId}?force=true`)
        .set('Cookie', creatorCookie);

      expect(forceDeleteRes.status).toBe(200);

      const deletedAsset = await MediaAsset.findById(uploadId);
      expect(deletedAsset).toBeNull();
    });
  });

  describe('7. Media Cleanup Service', () => {
    it('cleans up abandoned initiated uploads and expired records', async () => {
      // Create an expired initiated asset
      const expiredAsset = new MediaAsset({
        userId: creatorId,
        storageProvider: 'local',
        objectKey: `uploads/${creatorId}/expired-file.png`,
        originalFilename: 'expired.png',
        sanitizedFilename: 'expired.png',
        mimeType: 'image/png',
        category: 'image',
        fileSizeBytes: 1024,
        status: 'initiated',
        visibility: 'private',
        expiresAt: new Date(Date.now() - 3600 * 1000) // 1 hour ago
      });
      await expiredAsset.save();

      const cleanupResult = await mediaCleanupService.cleanupExpiredUploads();
      expect(cleanupResult.expiredInitiatedDeleted).toBeGreaterThanOrEqual(1);

      const queryAsset = await MediaAsset.findById(expiredAsset._id);
      expect(queryAsset).toBeNull();
    });
  });
});
