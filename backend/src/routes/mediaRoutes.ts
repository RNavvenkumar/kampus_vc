import { Router } from 'express';
import {
  initiateMediaUpload,
  completeMediaUpload,
  getMediaAsset,
  getMediaAssetAccessUrl,
  deleteMediaAsset,
  getMyMediaAssets,
  handleLocalStorageUpload,
  handleLocalStorageDownload,
  handleDirectBase64Upload,
  handleCreateExternalMediaAsset
} from '../controllers/mediaController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// 1. Direct Local Storage Upload & Download Handlers (Must precede parameterized routes)
router.all('/local-storage/*', (req, res) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return handleLocalStorageDownload(req, res);
  }
  if (req.method === 'PUT' || req.method === 'POST') {
    return handleLocalStorageUpload(req, res);
  }
  res.status(405).json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed on storage endpoint'
    }
  });
});

// 2. Direct File Upload & External Media Attachment
router.post('/direct', requireAuth, handleDirectBase64Upload);
router.post('/external', requireAuth, handleCreateExternalMediaAsset);

// 3. Authenticated Upload Lifecycle
router.post('/uploads', requireAuth, initiateMediaUpload);
router.post('/uploads/:uploadId/complete', requireAuth, completeMediaUpload);

// 3. Media Asset Retrieval & Access URLs
router.get('/my-assets', requireAuth, getMyMediaAssets);
router.get('/assets/:assetId', optionalAuth, getMediaAsset);
router.get('/assets/:assetId/access', optionalAuth, getMediaAssetAccessUrl);
router.delete('/assets/:assetId', requireAuth, deleteMediaAsset);

export default router;
