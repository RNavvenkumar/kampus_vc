import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Film,
  Image as ImageIcon,
  Loader2,
  X,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  initiateMediaUpload,
  uploadFileToStorage,
  completeMediaUpload,
  extractErrorMessage
} from '../../services/api';
import { MediaAsset } from '../../types';

interface MediaUploadDropzoneProps {
  onUploadComplete: (asset: MediaAsset, accessUrl: string) => void;
  onRemove?: () => void;
  category?: 'image' | 'video' | 'all';
  currentUrl?: string;
  currentAssetId?: string;
  className?: string;
  label?: string;
  intendedUse?: string;
}

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  all: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
};

export const MediaUploadDropzone: React.FC<MediaUploadDropzoneProps> = ({
  onUploadComplete,
  onRemove,
  category = 'all',
  currentUrl,
  className = '',
  label = 'Upload Artwork or Video Reel',
  intendedUse = 'portfolio'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'verifying' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [uploadedAsset, setUploadedAsset] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedMimes = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.all;

  const handleFileProcess = useCallback(async (file: File) => {
    // 1. Client-side MIME validation with extension fallback
    let mimeType = file.type;
    if (!mimeType) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'mp4' || ext === 'm4v') mimeType = 'video/mp4';
      else if (ext === 'webm') mimeType = 'video/webm';
      else if (ext === 'mov') mimeType = 'video/quicktime';
      else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'gif') mimeType = 'image/gif';
    }

    if (!mimeType || !allowedMimes.includes(mimeType)) {
      setErrorMessage(`Unsupported format (${mimeType || file.name || 'unknown'}). Allowed: JPG, PNG, WebP, GIF, MP4, WebM, MOV.`);
      setUploadStatus('error');
      return;
    }

    // 2. Client-side size limit validation
    const isImage = mimeType.startsWith('image/');
    const maxBytes = isImage ? 25 * 1024 * 1024 : 250 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Limit: ${isImage ? '25MB' : '250MB'}.`);
      setUploadStatus('error');
      return;
    }

    setErrorMessage(null);
    setUploadStatus('uploading');
    setProgress(0);

    try {
      // Step A: Initiate upload on backend
      const initData = await initiateMediaUpload({
        filename: file.name,
        mimeType,
        fileSizeBytes: file.size,
        category: isImage ? 'image' : 'video',
        intendedUse
      });

      // Step B: Direct upload to storage with live progress
      await uploadFileToStorage(
        initData.uploadUrl,
        file,
        initData.headers || {},
        (percent) => {
          setProgress(percent);
        },
        initData.method || 'PUT',
        initData.fields
      );

      // Step C: Complete & Verify upload on backend
      setUploadStatus('verifying');
      const completeData = await completeMediaUpload(initData.uploadId);

      setUploadedAsset(completeData.asset);
      setPreviewUrl(completeData.accessUrl);
      setUploadStatus('ready');
      onUploadComplete(completeData.asset, completeData.accessUrl);
    } catch (err: any) {
      console.error('Upload process failed:', err);
      const msg = extractErrorMessage(err, 'Failed to complete media upload.');
      setErrorMessage(msg);
      setUploadStatus('error');
    }
  }, [allowedMimes, onUploadComplete]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setUploadStatus('idle');
    setPreviewUrl(null);
    setUploadedAsset(null);
    setErrorMessage(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-zinc-300 mb-2">{label}</label>}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept={allowedMimes.join(',')}
        className="hidden"
      />

      {/* Ready Preview State */}
      {(uploadStatus === 'ready' || (uploadStatus === 'idle' && previewUrl)) ? (
        <div className="relative rounded-xl border border-zinc-700/80 bg-zinc-900/90 p-4 overflow-hidden group">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Media Preview Box */}
            <div className="relative w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-black/60 border border-zinc-800 flex items-center justify-center shrink-0">
              {uploadedAsset?.category === 'video' || (previewUrl && previewUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i)) ? (
                <video
                  src={previewUrl!}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={previewUrl!}
                  alt="Asset Preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Asset Details */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-white truncate">
                  {uploadedAsset ? uploadedAsset.originalFilename : 'Media Ready'}
                </span>
                <Badge variant="success" className="text-xs shrink-0">Verified</Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-zinc-400 mb-3">
                {uploadedAsset && (
                  <>
                    <span>{(uploadedAsset.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>•</span>
                    <span className="uppercase">{uploadedAsset.mimeType.split('/')[1]}</span>
                    {uploadedAsset.dimensions && (
                      <>
                        <span>•</span>
                        <span>{uploadedAsset.dimensions.width}x{uploadedAsset.dimensions.height}px</span>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dropzone / Uploading / Verifying / Error Container */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => uploadStatus !== 'uploading' && uploadStatus !== 'verifying' && fileInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed p-6 sm:p-8 transition-all duration-200 cursor-pointer text-center ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
              : 'border-zinc-700/80 bg-zinc-900/60 hover:border-cyan-500/60 hover:bg-zinc-900/90'
          }`}
        >
          {/* Upload Progress Bar */}
          {uploadStatus === 'uploading' && (
            <div className="max-w-md mx-auto py-2">
              <div className="flex justify-between items-center mb-2 text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-cyan-400 animate-pulse" />
                  Uploading to Secure Object Storage...
                </span>
                <span className="text-cyan-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Verification Spinner */}
          {uploadStatus === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
              <p className="text-sm font-medium text-white">Inspecting & Verifying Media Integrity...</p>
              <p className="text-xs text-zinc-400 mt-1">Checking magic bytes, stripping EXIF, and confirming storage persistence</p>
            </div>
          )}

          {/* Error Message */}
          {uploadStatus === 'error' && (
            <div className="py-2">
              <div className="flex items-center justify-center gap-2 text-rose-400 text-sm mb-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage || 'Failed to upload media'}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadStatus('idle');
                  fileInputRef.current?.click();
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Default Idle State */}
          {uploadStatus === 'idle' && (
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                {category === 'video' ? (
                  <Film className="w-6 h-6" />
                ) : category === 'image' ? (
                  <ImageIcon className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>

              <p className="text-sm font-medium text-white mb-1">
                <span className="text-cyan-400 font-semibold hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mb-3">
                {category === 'image'
                  ? 'High-res JPG, PNG, WebP, or GIF (max 25MB)'
                  : category === 'video'
                  ? 'High-definition MP4, WebM, or MOV (max 250MB)'
                  : 'High-res images up to 25MB, video reels up to 250MB'}
              </p>

              <div className="flex flex-wrap justify-center gap-1.5">
                <Badge variant="outline" className="text-[10px] text-zinc-400">JPG</Badge>
                <Badge variant="outline" className="text-[10px] text-zinc-400">PNG</Badge>
                <Badge variant="outline" className="text-[10px] text-zinc-400">WebP</Badge>
                <Badge variant="outline" className="text-[10px] text-zinc-400">MP4</Badge>
                <Badge variant="outline" className="text-[10px] text-zinc-400">WebM</Badge>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
