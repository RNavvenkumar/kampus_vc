import { Request, Response } from 'express';
import { aiService } from '../services/aiService';

export const getAIProviderStatus = async (_req: Request, res: Response): Promise<void> => {
  const status = aiService.getProviderStatus();
  res.status(200).json({
    success: true,
    data: status
  });
};

export const generateBrief = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const result = await aiService.generateBrief(userId, req.body);
    res.status(200).json({
      success: true,
      message: 'Creative brief generated successfully',
      data: result.brief,
      usage: result.usage
    });
  } catch (err: any) {
    if (err.message.startsWith('AI_PROVIDER_NOT_CONFIGURED')) {
      res.status(503).json({
        success: false,
        error: { code: 'AI_PROVIDER_UNAVAILABLE', message: err.message }
      });
      return;
    }
    if (err.message.startsWith('AI_QUOTA_EXCEEDED')) {
      res.status(429).json({
        success: false,
        error: { code: 'AI_QUOTA_EXCEEDED', message: err.message }
      });
      return;
    }
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input parameters', details: err.errors }
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'AI_GENERATION_FAILED', message: err.message || 'Brief generation failed' }
    });
  }
};

export const generateDirections = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const result = await aiService.generateDirections(userId, req.body);
    res.status(200).json({
      success: true,
      message: 'Creative directions generated successfully',
      data: result.directions,
      usage: result.usage
    });
  } catch (err: any) {
    if (err.message.startsWith('AI_PROVIDER_NOT_CONFIGURED')) {
      res.status(503).json({
        success: false,
        error: { code: 'AI_PROVIDER_UNAVAILABLE', message: err.message }
      });
      return;
    }
    if (err.message.startsWith('AI_QUOTA_EXCEEDED')) {
      res.status(429).json({
        success: false,
        error: { code: 'AI_QUOTA_EXCEEDED', message: err.message }
      });
      return;
    }
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input parameters', details: err.errors }
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'AI_DIRECTIONS_FAILED', message: err.message || 'Directions generation failed' }
    });
  }
};

export const analyzeMoodboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const result = await aiService.analyzeMoodboard(userId, req.body);
    res.status(200).json({
      success: true,
      message: 'Moodboard analyzed successfully',
      data: result.analysis,
      usage: result.usage
    });
  } catch (err: any) {
    if (err.message.startsWith('SSRF_SECURITY_VIOLATION')) {
      res.status(400).json({
        success: false,
        error: { code: 'SSRF_SECURITY_VIOLATION', message: err.message }
      });
      return;
    }
    if (err.message.startsWith('AI_PROVIDER_NOT_CONFIGURED')) {
      res.status(503).json({
        success: false,
        error: { code: 'AI_PROVIDER_UNAVAILABLE', message: err.message }
      });
      return;
    }
    if (err.message.startsWith('AI_QUOTA_EXCEEDED')) {
      res.status(429).json({
        success: false,
        error: { code: 'AI_QUOTA_EXCEEDED', message: err.message }
      });
      return;
    }
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid image references', details: err.errors }
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'MOODBOARD_ANALYSIS_FAILED', message: err.message || 'Moodboard analysis failed' }
    });
  }
};

export const synthesizeRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const result = await aiService.synthesizeRequirements(userId, req.body);
    res.status(200).json({
      success: true,
      message: 'Deliverables and requirements synthesized successfully',
      data: result.synthesis,
      usage: result.usage
    });
  } catch (err: any) {
    if (err.message.startsWith('AI_PROVIDER_NOT_CONFIGURED')) {
      res.status(503).json({
        success: false,
        error: { code: 'AI_PROVIDER_UNAVAILABLE', message: err.message }
      });
      return;
    }
    if (err.message.startsWith('AI_QUOTA_EXCEEDED')) {
      res.status(429).json({
        success: false,
        error: { code: 'AI_QUOTA_EXCEEDED', message: err.message }
      });
      return;
    }
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid synthesis parameters', details: err.errors }
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'REQUIREMENT_SYNTHESIS_FAILED', message: err.message || 'Synthesis failed' }
    });
  }
};

export const improveDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const result = await aiService.improveDraft(userId, req.body);
    res.status(200).json({
      success: true,
      message: 'Draft improvement generated successfully',
      data: result.improvement,
      usage: result.usage
    });
  } catch (err: any) {
    if (err.message.startsWith('AI_PROVIDER_NOT_CONFIGURED')) {
      res.status(503).json({
        success: false,
        error: { code: 'AI_PROVIDER_UNAVAILABLE', message: err.message }
      });
      return;
    }
    if (err.message.startsWith('AI_QUOTA_EXCEEDED')) {
      res.status(429).json({
        success: false,
        error: { code: 'AI_QUOTA_EXCEEDED', message: err.message }
      });
      return;
    }
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input parameters', details: err.errors }
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'DRAFT_IMPROVEMENT_FAILED', message: err.message || 'Draft improvement failed' }
    });
  }
};
