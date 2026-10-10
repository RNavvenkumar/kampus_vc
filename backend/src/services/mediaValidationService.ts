import { env } from '../config/env.js';

export interface MediaValidationResult {
  isValid: boolean;
  category: 'image' | 'video';
  mimeType: string;
  detectedMimeType: string;
  fileSizeBytes: number;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  error?: string;
}

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

export const ALL_ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES];

export class MediaValidationService {
  /**
   * Sanitizes a user-supplied filename for display and safe storage.
   */
  public sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'asset';
    }

    // Extract base filename without directories
    const basename = filename.replace(/^.*[\\/]/, '');
    
    // Replace non-alphanumeric (except dot, dash, underscore) with underscore
    let sanitized = basename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .trim();

    // Prevent hidden files starting with dot
    if (sanitized.startsWith('.')) {
      sanitized = `file${sanitized}`;
    }

    // Truncate to reasonable length (preserving extension)
    if (sanitized.length > 120) {
      const parts = sanitized.split('.');
      if (parts.length > 1) {
        const ext = parts.pop();
        sanitized = `${parts.join('.').substring(0, 100)}.${ext}`;
      } else {
        sanitized = sanitized.substring(0, 120);
      }
    }

    return sanitized || 'asset';
  }

  /**
   * Identifies actual media format from buffer magic bytes.
   */
  public detectMimeType(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) {
      return null;
    }

    // 1. JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // 3. GIF: GIF87a or GIF89a (47 49 46 38)
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return 'image/gif';
    }

    // 4. WebP: RIFF .... WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50 // WEBP
    ) {
      return 'image/webp';
    }

    // 5. MP4 / QuickTime (MOV): ....ftyp or ftyp at offset 4
    if (buffer.length >= 8) {
      const ftypSignature = buffer.subarray(4, 8).toString('ascii');
      if (ftypSignature === 'ftyp' || ftypSignature === 'moov' || ftypSignature === 'wide') {
        const majorBrand = buffer.length >= 12 ? buffer.subarray(8, 12).toString('ascii') : '';
        if (majorBrand === 'qt  ') {
          return 'video/quicktime';
        }
        return 'video/mp4';
      }
    }

    // 6. WebM (Matroska/EBML): 1A 45 DF A3
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return 'video/webm';
    }

    // Disallow executable headers
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      // Windows PE MZ header
      return 'application/x-dosexec';
    }
    if (
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46
    ) {
      // Linux ELF header
      return 'application/x-elf';
    }

    return null;
  }

  /**
   * Safely extracts dimensions for raster images from header bytes.
   */
  public extractImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | undefined {
    try {
      if (mimeType === 'image/png' && buffer.length >= 24) {
        // PNG IHDR width at offset 16-19, height at 20-23 (big endian)
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0 && width <= 32768 && height <= 32768) {
          return { width, height };
        }
      }

      if (mimeType === 'image/gif' && buffer.length >= 10) {
        // GIF width at offset 6-7, height at 8-9 (little endian)
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }

      if (mimeType === 'image/jpeg') {
        // Iterate JPEG markers to find SOF0 / SOF2
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];
          // SOF0 (Baseline), SOF1 (Extended), SOF2 (Progressive)
          if (marker >= 0xc0 && marker <= 0xc3 && marker !== 0xc4) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            if (width > 0 && height > 0 && width <= 32768 && height <= 32768) {
              return { width, height };
            }
            break;
          }
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }
    } catch {
      // Ignore dimension parsing failure on atypical files
    }

    return undefined;
  }

  /**
   * Validates full buffer content and verifies compliance with security policies.
   */
  public validateMediaContent(
    buffer: Buffer,
    declaredMimeType: string,
    fileSizeBytes: number
  ): MediaValidationResult {
    // 1. Check size limits
    const isImage = ALLOWED_IMAGE_MIMES.includes(declaredMimeType);
    const isVideo = ALLOWED_VIDEO_MIMES.includes(declaredMimeType);

    if (!isImage && !isVideo) {
      return {
        isValid: false,
        category: 'image',
        mimeType: declaredMimeType,
        detectedMimeType: 'unknown',
        fileSizeBytes,
        error: `Unsupported MIME type '${declaredMimeType}'. Allowed formats: JPG, PNG, WebP, GIF, MP4, WebM, MOV.`
      };
    }

    const maxBytes = isImage ? env.MEDIA_MAX_IMAGE_BYTES : env.MEDIA_MAX_VIDEO_BYTES;
    if (fileSizeBytes > maxBytes) {
      return {
        isValid: false,
        category: isImage ? 'image' : 'video',
        mimeType: declaredMimeType,
        detectedMimeType: 'unknown',
        fileSizeBytes,
        error: `File size ${fileSizeBytes} bytes exceeds maximum limit of ${maxBytes} bytes.`
      };
    }

    // 2. Reject SVG explicitly (to prevent Stored XSS / XXE vulnerabilities)
    if (declaredMimeType === 'image/svg+xml') {
      return {
        isValid: false,
        category: 'image',
        mimeType: declaredMimeType,
        detectedMimeType: 'image/svg+xml',
        fileSizeBytes,
        error: 'SVG files are strictly disallowed due to security risks.'
      };
    }

    // 3. Inspect magic bytes
    const detectedMime = this.detectMimeType(buffer);
    if (!detectedMime) {
      return {
        isValid: false,
        category: isImage ? 'image' : 'video',
        mimeType: declaredMimeType,
        detectedMimeType: 'unknown',
        fileSizeBytes,
        error: 'File content does not match any allowed media file signatures or is corrupted.'
      };
    }

    // 4. Validate MIME match
    const mimeMatches =
      detectedMime === declaredMimeType ||
      (detectedMime === 'video/mp4' && declaredMimeType === 'video/quicktime') ||
      (detectedMime === 'video/quicktime' && declaredMimeType === 'video/mp4');

    if (!mimeMatches) {
      return {
        isValid: false,
        category: isImage ? 'image' : 'video',
        mimeType: declaredMimeType,
        detectedMimeType: detectedMime,
        fileSizeBytes,
        error: `Declared MIME type '${declaredMimeType}' does not match detected file signature '${detectedMime}'.`
      };
    }

    // 5. Extract Dimensions if image
    let dimensions: { width: number; height: number } | undefined;
    if (isImage) {
      dimensions = this.extractImageDimensions(buffer, detectedMime);
      if (dimensions && (dimensions.width > 16384 || dimensions.height > 16384)) {
        return {
          isValid: false,
          category: 'image',
          mimeType: declaredMimeType,
          detectedMimeType: detectedMime,
          fileSizeBytes,
          error: 'Image dimensions exceed maximum allowed dimensions (16384x16384px).'
        };
      }
    }

    return {
      isValid: true,
      category: isImage ? 'image' : 'video',
      mimeType: declaredMimeType,
      detectedMimeType: detectedMime,
      fileSizeBytes,
      dimensions
    };
  }
}

export const mediaValidationService = new MediaValidationService();
