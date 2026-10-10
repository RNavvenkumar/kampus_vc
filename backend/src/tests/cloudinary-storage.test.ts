import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudinaryStorageProvider } from '../storage/cloudinaryStorageProvider.js';
import { storageService } from '../storage/storageService.js';
import { v2 as cloudinary } from 'cloudinary';

// Mock cloudinary SDK
vi.mock('cloudinary', () => {
  return {
    v2: {
      config: vi.fn(),
      utils: {
        api_sign_request: vi.fn().mockReturnValue('mock_sha1_cloudinary_signature_12345')
      },
      api: {
        resource: vi.fn().mockImplementation(async (publicId) => {
          if (publicId.includes('notfound')) {
            throw new Error('Resource not found');
          }
          return {
            public_id: publicId,
            bytes: 102400,
            format: 'png',
            etag: 'etag_mock_cloudinary',
            created_at: '2026-10-10T12:00:00Z'
          };
        })
      },
      url: vi.fn().mockImplementation((publicId) => {
        return `https://res.cloudinary.com/rx2vyfuy/image/upload/v1728000000/${publicId}.png`;
      }),
      uploader: {
        destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
        upload_stream: vi.fn().mockImplementation((options, callback) => {
          return {
            end: (buffer: Buffer) => {
              callback(null, {
                public_id: options.public_id,
                bytes: buffer.length,
                format: 'jpg',
                etag: 'etag_stream_mock',
                created_at: '2026-10-10T12:00:00Z'
              });
            }
          };
        })
      }
    }
  };
});

describe('Cloudinary Media Storage Integration Tests', () => {
  let provider: CloudinaryStorageProvider;

  beforeEach(() => {
    provider = new CloudinaryStorageProvider();
  });

  it('correctly initializes and reports availability', async () => {
    expect(provider.name).toBe('cloudinary');
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it('generates signed direct upload authorization with secure signature and parameters', async () => {
    const result = await provider.initiateUpload({
      objectKey: 'uploads/user_123/asset_456-design.png',
      mimeType: 'image/png',
      fileSizeBytes: 102400,
      expiresInSeconds: 900
    });

    expect(result.method).toBe('POST');
    expect(result.uploadUrl).toContain('https://api.cloudinary.com/v1_1/rx2vyfuy/image/upload');
    expect(result.fields).toBeDefined();
    expect(result.fields?.api_key).toBe('141797521242532');
    expect(result.fields?.signature).toBe('mock_sha1_cloudinary_signature_12345');
    expect(result.fields?.public_id).toBe('uploads/user_123/asset_456-design');
  });

  it('verifies uploaded object metadata from Cloudinary API', async () => {
    const meta = await provider.verifyObject('uploads/user_123/asset_456-design.png', 'image/png', 500000);
    expect(meta.objectKey).toBe('uploads/user_123/asset_456-design.png');
    expect(meta.sizeBytes).toBe(102400);
    expect(meta.mimeType).toBe('image/png');
    expect(meta.etag).toBe('etag_mock_cloudinary');
  });

  it('rejects verification if Cloudinary object size exceeds maximum allowed limit', async () => {
    await expect(
      provider.verifyObject('uploads/user_123/asset_456-design.png', 'image/png', 50000) // limit 50KB < 100KB
    ).rejects.toThrow(/exceeds maximum allowed limit/);
  });

  it('rejects verification if object is not found in Cloudinary', async () => {
    await expect(
      provider.verifyObject('uploads/user_123/notfound.png', 'image/png')
    ).rejects.toThrow(/verification failed/);
  });

  it('generates secure delivery URL for assets', async () => {
    const url = await provider.getSignedDownloadUrl('uploads/user_123/asset_456-design.png');
    expect(url).toContain('https://res.cloudinary.com/rx2vyfuy/image/upload/');
  });

  it('destroys object upon deletion', async () => {
    const success = await provider.deleteObject('uploads/user_123/asset_456-design.png');
    expect(success).toBe(true);
    expect(cloudinary.uploader.destroy).toHaveBeenCalled();
  });

  it('puts binary buffer directly into Cloudinary via stream upload', async () => {
    const testBuffer = Buffer.from('mock image binary content');
    const meta = await provider.putObject('uploads/user_123/direct.jpg', testBuffer, 'image/jpeg');

    expect(meta.objectKey).toBe('uploads/user_123/direct.jpg');
    expect(meta.sizeBytes).toBe(testBuffer.length);
    expect(meta.mimeType).toBe('image/jpg');
  });

  it('storageService instantiates CloudinaryStorageProvider when configured', () => {
    const activeProvider = storageService.getProvider();
    expect(activeProvider.name).toBe('cloudinary');
  });
});
