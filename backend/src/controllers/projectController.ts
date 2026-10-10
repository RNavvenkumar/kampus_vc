import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { z } from 'zod';
import { Project, IProject, IProjectMilestone, MilestoneStatus } from '../models/Project.js';
import { ProjectSubmission, ISubmissionAttachment } from '../models/ProjectSubmission.js';
import { ProjectMessage, IMessageAttachment } from '../models/ProjectMessage.js';
import { ProjectActivity, ProjectActivityType } from '../models/ProjectActivity.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { Review } from '../models/Review.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { BrandProfile } from '../models/BrandProfile.js';
import { User } from '../models/User.js';
import { createNotification } from '../services/notificationService.js';
import { storageService } from '../storage/storageService.js';

// Helper: Authorize and retrieve project for participant
async function getAuthorizedProject(
  rawProjectId: string | string[] | undefined,
  userId: Types.ObjectId | string
): Promise<{
  project: IProject;
  isCreator: boolean;
  isBrand: boolean;
} | null> {
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
  if (!projectId || !Types.ObjectId.isValid(projectId)) {
    return null;
  }

  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const project = await Project.findById(projectId)
    .populate('creatorId', 'name email avatarUrl')
    .populate('brandId', 'name email avatarUrl')
    .populate('briefId', 'title slug companyName category');

  if (!project) {
    return null;
  }

  const creatorId = (project.creatorId as any)._id || project.creatorId;
  const brandId = (project.brandId as any)._id || project.brandId;

  const isCreator = creatorId.equals(userObjectId);
  const isBrand = brandId.equals(userObjectId);

  if (!isCreator && !isBrand) {
    return null;
  }

  return { project, isCreator, isBrand };
}

// Helper: Record project activity event safely
async function logProjectActivity(params: {
  projectId: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: 'creator' | 'brand' | 'system';
  eventType: ProjectActivityType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await ProjectActivity.create({
      projectId: params.projectId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      eventType: params.eventType,
      title: params.title,
      description: params.description,
      metadata: params.metadata || {}
    });
  } catch (err) {
    console.error('Failed to record project activity:', err);
  }
}

// Helper: Automatically add approved deliverable work to Creator's Portfolio Showcase
async function addApprovedWorkToCreatorPortfolio(params: {
  project: IProject;
  milestone?: IProjectMilestone;
  submission?: any;
  brandName?: string;
  creatorId: Types.ObjectId | string;
}): Promise<void> {
  try {
    const { project, milestone, submission, brandName, creatorId } = params;
    const creatorUser = await User.findById(creatorId).lean();
    if (!creatorUser) return;

    let profile = await CreatorProfile.findOne({ userId: creatorId });
    if (!profile) {
      profile = new CreatorProfile({
        userId: creatorId,
        displayName: creatorUser.name || 'Creator',
        username: (creatorUser.name || 'creator').toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900)
      });
    }

    const itemTitle = milestone
      ? `${project.title} — ${milestone.title}`
      : project.title;

    // Avoid duplicate showcase items
    const alreadyExists = profile.portfolioItems.some(
      (item) => item.title === itemTitle || (item.projectUrl && item.projectUrl.includes(project._id.toString()) && (milestone ? item.title.includes(milestone.title) : true))
    );
    if (alreadyExists) {
      return;
    }

    let mediaUrl = '';
    let mediaType: 'image' | 'video' | 'project' = 'image';
    let assetIdObj: Types.ObjectId | undefined;
    let thumbnailUrl: string | undefined;

    // Check submission attachments for media
    if (submission?.attachments && submission.attachments.length > 0) {
      const firstAtt = submission.attachments[0];
      const asset = await MediaAsset.findById(firstAtt.assetId);
      if (asset) {
        asset.visibility = 'public';
        await asset.save();
        assetIdObj = asset._id as Types.ObjectId;

        if (asset.category === 'video' || asset.mimeType?.startsWith('video/')) {
          mediaType = 'video';
        } else {
          mediaType = 'image';
        }

        const provider = storageService.getProvider();
        mediaUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);

        // If video, check for thumbnail image in other attachments
        if (mediaType === 'video' && submission.attachments.length > 1) {
          const secondAtt = submission.attachments.find((att: any) => att.assetId?.toString() !== asset._id.toString());
          if (secondAtt) {
            const secondAsset = await MediaAsset.findById(secondAtt.assetId);
            if (secondAsset && secondAsset.mimeType?.startsWith('image/')) {
              thumbnailUrl = await provider.getSignedDownloadUrl(secondAsset.objectKey, secondAsset.originalFilename);
            }
          }
        }
      }
    }

    // Fallback to external links if provided
    if (!mediaUrl && submission?.externalLinks && submission.externalLinks.length > 0) {
      mediaUrl = submission.externalLinks[0];
      mediaType = 'project';
    }

    // Fallback to project cover or high quality creative graphic
    if (!mediaUrl) {
      mediaUrl = (project as any).coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';
      mediaType = 'image';
    }

    const resolvedBrandName = brandName || 'Brand Partner';

    const newItem = {
      id: new mongoose.Types.ObjectId().toString(),
      title: itemTitle,
      slug: itemTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: submission?.submissionNotes || milestone?.description || project.agreedDescription || `Verified completed work for ${resolvedBrandName} on Kampus.VC.`,
      category: (project as any).category || (project as any).briefId?.category || 'Creative Production',
      tags: [(project as any).category || 'Client Work', 'Verified Delivery', resolvedBrandName].filter(Boolean),
      creativeTools: ['Kampus.VC Production Studio'],
      mediaType,
      mediaUrl,
      thumbnailUrl,
      assetId: assetIdObj,
      clientName: resolvedBrandName,
      projectUrl: `/projects/${project._id}`,
      completionDate: new Date(),
      isFeatured: true,
      displayOrder: 0,
      visibility: 'public' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to top of creator's portfolio showcase
    profile.portfolioItems.unshift(newItem as any);
    profile.calculateCompletion();
    await profile.save();
  } catch (err) {
    console.error('Failed to automatically add completed deliverable to creator portfolio:', err);
  }
}

// -------------------------------------------------------------
// 1. Projects Listing & Overview
// -------------------------------------------------------------

// GET /api/projects
export async function getMyProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!._id;
    const isBrand = req.user!.role === 'brand';

    const filter: Record<string, any> = isBrand
      ? { brandId: userId }
      : { creatorId: userId };

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .populate('creatorId', 'name email avatarUrl')
      .populate('brandId', 'name email avatarUrl')
      .populate('briefId', 'title slug companyName category')
      .lean();

    res.status(200).json({
      success: true,
      data: projects.map((p: any) => ({
        ...p,
        id: p._id.toString()
      }))
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:projectId
export async function getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project, isCreator, isBrand } = auth;

    // Count pending submissions
    const pendingSubmissionsCount = await ProjectSubmission.countDocuments({
      projectId: project._id,
      status: 'submitted'
    });

    // Count messages
    const messageCount = await ProjectMessage.countDocuments({
      projectId: project._id
    });

    const projectData = project.toJSON();

    res.status(200).json({
      success: true,
      data: {
        ...projectData,
        isCreator,
        isBrand,
        pendingSubmissionsCount,
        messageCount
      }
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/projects/:projectId/status
export async function updateProjectStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project, isCreator, isBrand } = auth;
    const { status } = req.body;

    const allowedStatuses = ['ready_for_kickoff', 'in_progress', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        error: { code: 'INVALID_STATUS', message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` }
      });
      return;
    }

    // Status transition rules
    if (status === 'in_progress') {
      if (project.status !== 'ready_for_kickoff' && project.status !== 'in_progress') {
        res.status(409).json({
          error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${project.status} to in_progress.` }
        });
        return;
      }
      project.status = 'in_progress';
      await project.save();

      await logProjectActivity({
        projectId: project._id as Types.ObjectId,
        actorId: req.user!._id,
        actorRole: isCreator ? 'creator' : 'brand',
        eventType: 'project_kickoff',
        title: 'Project Kicked Off',
        description: `${req.user!.name} initiated project kickoff. Workspace is now actively in progress.`
      });

      const recipientId = isCreator
        ? ((project.brandId as any)._id || project.brandId)
        : ((project.creatorId as any)._id || project.creatorId);

      await createNotification({
        recipientId,
        type: 'project_status_changed',
        title: 'Project Kicked Off',
        message: `${project.title} has been moved to active progress.`,
        projectId: project._id as Types.ObjectId
      });
    } else if (status === 'completed') {
      // REQUIREMENT: Distinguish deliverable approval from overall project completion.
      // Do not mark a project completed while required deliverables remain unapproved.
      const unapprovedMilestones = project.milestones.filter(m => m.status !== 'approved');
      if (unapprovedMilestones.length > 0) {
        res.status(409).json({
          error: {
            code: 'UNFINISHED_DELIVERABLES',
            message: `Cannot mark project completed while ${unapprovedMilestones.length} milestone(s) remain unapproved.`
          }
        });
        return;
      }

      project.status = 'completed';
      await project.save();

      // Automatically add completed deliverables to Creator's Portfolio Showcase
      const brandId = (project.brandId as any)._id || project.brandId;
      const creatorId = (project.creatorId as any)._id || project.creatorId;
      const brandProfile = await BrandProfile.findOne({ userId: brandId }).lean();
      const brandUser = await User.findById(brandId).lean();
      const brandName = brandProfile?.companyName || brandUser?.name || 'Brand Client';

      for (const m of project.milestones) {
        const latestApprovedSub = await ProjectSubmission.findOne({
          projectId: project._id,
          milestoneId: m._id || (m as any).id,
          status: 'approved'
        }).sort({ version: -1 });

        await addApprovedWorkToCreatorPortfolio({
          project,
          milestone: m,
          submission: latestApprovedSub,
          brandName,
          creatorId
        });
      }

      await logProjectActivity({
        projectId: project._id as Types.ObjectId,
        actorId: req.user!._id,
        actorRole: isCreator ? 'creator' : 'brand',
        eventType: 'project_completed',
        title: 'Project Marked Completed',
        description: `All milestones approved. Project successfully finalized by ${req.user!.name}.`
      });

      const recipientId = isCreator
        ? ((project.brandId as any)._id || project.brandId)
        : ((project.creatorId as any)._id || project.creatorId);

      await createNotification({
        recipientId,
        type: 'project_completed',
        title: 'Project Completed! 🎉',
        message: `${project.title} has been officially completed.`,
        projectId: project._id as Types.ObjectId
      });
    } else if (status === 'cancelled') {
      project.status = 'cancelled';
      await project.save();
    }

    res.status(200).json({
      success: true,
      data: project.toJSON()
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 2. Milestones Management
// -------------------------------------------------------------

// GET /api/projects/:projectId/milestones
export async function getProjectMilestones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project } = auth;

    // Attach latest submission summary to each milestone
    const milestonesWithSubmissions = await Promise.all(
      project.milestones.map(async (m) => {
        const mObj = (m as any).toObject ? (m as any).toObject() : { ...m };
        const milestoneId = m._id || (m as any).id;

        const latestSubmission = await ProjectSubmission.findOne({
          projectId: project._id,
          milestoneId
        })
          .sort({ version: -1 })
          .select('version status reviewFeedback submittedAt reviewedAt')
          .lean();

        return {
          ...mObj,
          id: milestoneId?.toString(),
          latestSubmission: latestSubmission
            ? {
                ...latestSubmission,
                id: (latestSubmission as any)._id?.toString()
              }
            : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: milestonesWithSubmissions
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/projects/:projectId/milestones/:milestoneId/status
export async function updateMilestoneStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project, isCreator } = auth;
    const rawMilestoneId = req.params.milestoneId;
    const milestoneId = Array.isArray(rawMilestoneId) ? rawMilestoneId[0] : rawMilestoneId;

    const milestone = project.milestones.find(
      (m: any) => m._id?.toString() === milestoneId || (m as any).id === milestoneId
    );

    if (!milestone) {
      res.status(404).json({
        error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found in this project.' }
      });
      return;
    }

    const { status } = req.body;
    const allowedTransitions: MilestoneStatus[] = ['not_started', 'in_progress'];

    if (!allowedTransitions.includes(status)) {
      res.status(400).json({
        error: {
          code: 'INVALID_MILESTONE_STATUS',
          message: 'Direct status change only allowed for not_started and in_progress. Deliverable submission/review manages review states.'
        }
      });
      return;
    }

    if (!isCreator) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the creator can start work on a milestone.' }
      });
      return;
    }

    milestone.status = status;
    if (status === 'in_progress' && !milestone.startedAt) {
      milestone.startedAt = new Date();
      if (project.status === 'ready_for_kickoff') {
        project.status = 'in_progress';
      }
    }

    await project.save();

    await logProjectActivity({
      projectId: project._id as Types.ObjectId,
      actorId: req.user!._id,
      actorRole: 'creator',
      eventType: 'milestone_started',
      title: 'Milestone Started',
      description: `Creator started working on Milestone #${milestone.order}: "${milestone.title}".`,
      metadata: { milestoneId, milestoneTitle: milestone.title }
    });

    res.status(200).json({
      success: true,
      data: milestone
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 3. Deliverable Submissions & Brand Reviews
// -------------------------------------------------------------

const submitDeliverableSchema = z.object({
  submissionNotes: z.string().trim().min(3, 'Submission notes must be at least 3 characters').max(3000),
  assetIds: z.array(z.string()).optional().default([]),
  externalLinks: z.array(z.string().url('Must be valid URL')).optional().default([])
});

// POST /api/projects/:projectId/milestones/:milestoneId/submissions
export async function submitDeliverable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project, isCreator } = auth;
    if (!isCreator) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the project creator can submit deliverables.' }
      });
      return;
    }

    const rawMilestoneId = req.params.milestoneId;
    const milestoneId = Array.isArray(rawMilestoneId) ? rawMilestoneId[0] : rawMilestoneId;

    const milestone = project.milestones.find(
      (m: any) => m._id?.toString() === milestoneId || (m as any).id === milestoneId
    );

    if (!milestone) {
      res.status(404).json({
        error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found in this project.' }
      });
      return;
    }

    if (milestone.status === 'approved') {
      res.status(409).json({
        error: { code: 'MILESTONE_ALREADY_APPROVED', message: 'This milestone is already approved and finalized.' }
      });
      return;
    }

    const parseResult = submitDeliverableSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid submission payload.' }
      });
      return;
    }

    const { submissionNotes, assetIds, externalLinks } = parseResult.data;

    // Validate all attached media assets
    const attachments: ISubmissionAttachment[] = [];
    if (assetIds && assetIds.length > 0) {
      for (const assetId of assetIds) {
        if (!Types.ObjectId.isValid(assetId)) {
          res.status(400).json({
            error: { code: 'INVALID_ASSET_ID', message: `Invalid asset ID format: ${assetId}` }
          });
          return;
        }

        const asset = await MediaAsset.findById(assetId);
        if (!asset) {
          res.status(404).json({
            error: { code: 'ASSET_NOT_FOUND', message: `Referenced media asset not found: ${assetId}` }
          });
          return;
        }

        // Ownership validation: Submitting creator must own the asset
        if (!asset.userId.equals(req.user!._id)) {
          res.status(403).json({
            error: { code: 'UNAUTHORIZED_ASSET', message: `You do not own asset ${assetId}. Foreign assets cannot be attached.` }
          });
          return;
        }

        if (asset.status !== 'ready') {
          asset.status = 'ready';
          await asset.save();
        }

        // Link asset to project
        const projectObjId = project._id as Types.ObjectId;
        const alreadyLinked = asset.linkedEntities?.some(
          (e) => e.entityType === 'project' && e.entityId.equals(projectObjId)
        );
        if (!alreadyLinked) {
          asset.linkedEntities.push({
            entityType: 'project',
            entityId: projectObjId
          });
          await asset.save();
        }

        attachments.push({
          assetId: asset._id as Types.ObjectId,
          filename: asset.originalFilename,
          fileSizeBytes: asset.fileSizeBytes,
          mimeType: asset.mimeType,
          category: asset.category,
          accessUrl: asset.metadata?.externalUrl || ''
        });
      }
    }

    // Determine next version
    const lastSubmission = await ProjectSubmission.findOne({
      projectId: project._id,
      milestoneId: milestone._id || (milestone as any).id
    }).sort({ version: -1 });

    const nextVersion = (lastSubmission?.version || 0) + 1;

    // Create submission record
    const submission = await ProjectSubmission.create({
      projectId: project._id,
      milestoneId: milestone._id || (milestone as any).id,
      version: nextVersion,
      creatorId: req.user!._id,
      submissionNotes,
      attachments,
      externalLinks,
      status: 'submitted',
      submittedAt: new Date()
    });

    // Update milestone status
    milestone.status = 'submitted_for_review';
    if (project.status === 'ready_for_kickoff') {
      project.status = 'in_progress';
    }
    await project.save();

    // Log Activity
    await logProjectActivity({
      projectId: project._id as Types.ObjectId,
      actorId: req.user!._id,
      actorRole: 'creator',
      eventType: 'deliverable_submitted',
      title: 'Deliverable Submitted',
      description: `Creator submitted Deliverable v${nextVersion} for Milestone: "${milestone.title}".`,
      metadata: {
        milestoneId: (milestone._id || (milestone as any).id).toString(),
        milestoneTitle: milestone.title,
        version: nextVersion,
        attachmentCount: attachments.length
      }
    });

    // Notify Brand
    const brandId = (project.brandId as any)._id || project.brandId;
    await createNotification({
      recipientId: brandId,
      type: 'deliverable_submitted',
      title: 'Deliverable Ready for Review',
      message: `Creator submitted Deliverable v${nextVersion} for "${milestone.title}".`,
      projectId: project._id as Types.ObjectId
    });

    res.status(201).json({
      success: true,
      data: {
        ...submission.toJSON(),
        milestoneStatus: milestone.status
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:projectId/milestones/:milestoneId/submissions
export async function getMilestoneSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project } = auth;
    const rawMilestoneId = req.params.milestoneId;
    const milestoneId = Array.isArray(rawMilestoneId) ? rawMilestoneId[0] : rawMilestoneId;

    const filter: Record<string, any> = { projectId: project._id };
    if (milestoneId && milestoneId !== 'all') {
      filter.milestoneId = milestoneId;
    }

    const submissions = await ProjectSubmission.find(filter)
      .sort({ version: -1 })
      .populate('creatorId', 'name email avatarUrl')
      .populate('reviewedBy', 'name email avatarUrl')
      .lean();

    // Generate signed download URLs for attachments
    const provider = storageService.getProvider();
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (sub: any) => {
        const enrichedAttachments = await Promise.all(
          (sub.attachments || []).map(async (att: any) => {
            try {
              const asset = await MediaAsset.findById(att.assetId).lean();
              if (asset) {
                const accessUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);
                return {
                  ...att,
                  accessUrl
                };
              }
            } catch (e) {
              console.error('Failed generating access URL for submission attachment:', e);
            }
            return att;
          })
        );

        return {
          ...sub,
          id: sub._id.toString(),
          attachments: enrichedAttachments
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedSubmissions
    });
  } catch (err) {
    next(err);
  }
}

const reviewSubmissionSchema = z.object({
  action: z.enum(['approve', 'request_revision']),
  feedback: z.string().trim().max(3000).optional(),
  rating: z.number().min(1).max(5).optional(),
  review: z.string().trim().max(2000).optional()
});

// POST /api/projects/:projectId/submissions/:submissionId/review
export async function reviewSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project, isBrand } = auth;
    if (!isBrand) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the project brand client can review deliverables.' }
      });
      return;
    }

    const rawSubmissionId = req.params.submissionId;
    const submissionId = Array.isArray(rawSubmissionId) ? rawSubmissionId[0] : rawSubmissionId;

    if (!submissionId || !Types.ObjectId.isValid(submissionId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid submission ID format.' }
      });
      return;
    }

    const parseResult = reviewSubmissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid review payload.' }
      });
      return;
    }

    const { action, feedback, rating, review: reviewComment } = parseResult.data;

    // Requirement: Require a meaningful feedback message for revision requests.
    if (action === 'request_revision' && (!feedback || feedback.trim().length < 5)) {
      res.status(400).json({
        error: {
          code: 'FEEDBACK_REQUIRED',
          message: 'A clear explanation and feedback message (minimum 5 characters) is required when requesting revisions.'
        }
      });
      return;
    }

    const submission = await ProjectSubmission.findOne({
      _id: submissionId,
      projectId: project._id
    });

    if (!submission) {
      res.status(404).json({
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found in this project.' }
      });
      return;
    }

    if (submission.status !== 'submitted') {
      res.status(409).json({
        error: {
          code: 'SUBMISSION_ALREADY_REVIEWED',
          message: `This submission has already been reviewed (status: ${submission.status}).`
        }
      });
      return;
    }

    const milestone = project.milestones.find(
      (m: any) => m._id?.toString() === submission.milestoneId.toString() || (m as any).id === submission.milestoneId.toString()
    );

    if (!milestone) {
      res.status(404).json({
        error: { code: 'MILESTONE_NOT_FOUND', message: 'Corresponding milestone not found.' }
      });
      return;
    }

    const creatorId = (project.creatorId as any)._id || project.creatorId;

    if (action === 'request_revision') {
      submission.status = 'revision_requested';
      submission.reviewFeedback = feedback;
      submission.reviewedBy = req.user!._id;
      submission.reviewedAt = new Date();
      await submission.save();

      milestone.status = 'revision_requested';
      await project.save();

      await logProjectActivity({
        projectId: project._id as Types.ObjectId,
        actorId: req.user!._id,
        actorRole: 'brand',
        eventType: 'revision_requested',
        title: 'Revision Requested',
        description: `Brand requested revisions on Deliverable v${submission.version} for "${milestone.title}": "${feedback}"`,
        metadata: {
          milestoneId: milestone._id?.toString(),
          milestoneTitle: milestone.title,
          version: submission.version,
          feedback
        }
      });

      await createNotification({
        recipientId: creatorId,
        type: 'deliverable_revision_requested',
        title: 'Revision Requested on Deliverable',
        message: `Brand requested revisions on "${milestone.title}": "${feedback}"`,
        projectId: project._id as Types.ObjectId
      });
    } else if (action === 'approve') {
      submission.status = 'approved';
      submission.reviewFeedback = reviewComment || feedback || '';
      submission.reviewedBy = req.user!._id;
      submission.reviewedAt = new Date();
      await submission.save();

      milestone.status = 'approved';
      milestone.approvedAt = new Date();

      // Check if all milestones are now approved
      const allApproved = project.milestones.every((m: any) =>
        (m._id?.toString() === milestone._id?.toString()) || m.status === 'approved'
      );
      if (allApproved && project.status !== 'completed') {
        project.status = 'completed';
      }
      await project.save();

      // Record Review & Rating if rating or feedback provided
      const ratingValue = rating || 5;
      const reviewText = reviewComment || feedback || 'Deliverable verified and approved successfully!';

      const brandUser = req.user!;
      const brandProfile = await BrandProfile.findOne({ userId: brandUser._id }).lean();
      const creatorUser = await User.findById(creatorId).lean();

      const brandName = brandProfile?.companyName || brandUser.name || 'Brand Client';
      const brandAvatar = brandProfile?.logoUrl || (brandUser as any).avatarUrl;
      const creatorName = creatorUser?.name || 'Creator';
      const creatorAvatar = (creatorUser as any)?.avatarUrl;

      await Review.findOneAndUpdate(
        {
          projectId: project._id,
          milestoneId: milestone._id || (milestone as any).id
        },
        {
          projectId: project._id,
          milestoneId: milestone._id || (milestone as any).id,
          brandId: brandUser._id,
          creatorId: creatorId,
          rating: ratingValue,
          review: reviewText,
          projectTitle: project.title,
          brandName,
          brandAvatar,
          creatorName,
          creatorAvatar
        },
        { upsert: true, new: true }
      );

      // Recalculate CreatorProfile average rating and reviewCount
      const allReviews = await Review.find({ creatorId }).lean();
      if (allReviews.length > 0) {
        const sumRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = Number((sumRatings / allReviews.length).toFixed(1));
        await CreatorProfile.findOneAndUpdate(
          { userId: creatorId },
          { averageRating: avgRating, reviewCount: allReviews.length }
        );
      }

      // Automatically add approved work to Creator's portfolio showcase
      await addApprovedWorkToCreatorPortfolio({
        project,
        milestone,
        submission,
        brandName,
        creatorId
      });

      await logProjectActivity({
        projectId: project._id as Types.ObjectId,
        actorId: req.user!._id,
        actorRole: 'brand',
        eventType: 'deliverable_approved',
        title: 'Deliverable Approved',
        description: `Brand approved Deliverable v${submission.version} for "${milestone.title}" with a rating of ${ratingValue}/5.`,
        metadata: {
          milestoneId: milestone._id?.toString(),
          milestoneTitle: milestone.title,
          version: submission.version,
          rating: ratingValue
        }
      });

      await createNotification({
        recipientId: creatorId,
        type: 'deliverable_approved',
        title: 'Deliverable Approved! 🎉',
        message: `Your deliverable for "${milestone.title}" has been approved with a ${ratingValue}★ rating!`,
        projectId: project._id as Types.ObjectId
      });
    }

    res.status(200).json({
      success: true,
      data: {
        submission: submission.toJSON(),
        milestoneStatus: milestone.status
      }
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 4. Secure Project Messaging
// -------------------------------------------------------------

const sendMessageSchema = z.object({
  content: z.string().trim().max(5000),
  assetIds: z.array(z.string()).optional().default([]),
  replyToMessageId: z.string().optional()
});

// GET /api/projects/:projectId/messages
export async function getProjectMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project } = auth;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);

    const messages = await ProjectMessage.find({ projectId: project._id })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('senderId', 'name email avatarUrl')
      .populate('replyToMessageId', 'content senderId')
      .lean();

    // Generate signed download URLs for message attachments
    const provider = storageService.getProvider();
    const enrichedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const enrichedAttachments = await Promise.all(
          (msg.attachments || []).map(async (att: any) => {
            try {
              const asset = await MediaAsset.findById(att.assetId).lean();
              if (asset) {
                const accessUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);
                return {
                  ...att,
                  accessUrl
                };
              }
            } catch (e) {
              console.error('Failed to generate attachment access URL:', e);
            }
            return att;
          })
        );

        return {
          ...msg,
          id: msg._id.toString(),
          attachments: enrichedAttachments
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedMessages
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:projectId/messages
export async function sendProjectMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project, isCreator } = auth;
    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid message payload.' }
      });
      return;
    }

    const { content, assetIds, replyToMessageId } = parseResult.data;

    if (!content && (!assetIds || assetIds.length === 0)) {
      res.status(400).json({
        error: { code: 'EMPTY_MESSAGE', message: 'Message content or attachments required.' }
      });
      return;
    }

    // Validate attachments
    const attachments: IMessageAttachment[] = [];
    if (assetIds && assetIds.length > 0) {
      for (const assetId of assetIds) {
        if (!Types.ObjectId.isValid(assetId)) {
          res.status(400).json({
            error: { code: 'INVALID_ASSET_ID', message: `Invalid asset ID format: ${assetId}` }
          });
          return;
        }

        const asset = await MediaAsset.findById(assetId);
        if (!asset) {
          res.status(404).json({
            error: { code: 'ASSET_NOT_FOUND', message: `Referenced asset not found: ${assetId}` }
          });
          return;
        }

        if (!asset.userId.equals(req.user!._id)) {
          res.status(403).json({
            error: { code: 'UNAUTHORIZED_ASSET', message: `You do not own asset ${assetId}.` }
          });
          return;
        }

        // Link asset to project
        const projectObjId = project._id as Types.ObjectId;
        const alreadyLinked = asset.linkedEntities?.some(
          (e) => e.entityType === 'project' && e.entityId.equals(projectObjId)
        );
        if (!alreadyLinked) {
          asset.linkedEntities.push({
            entityType: 'project',
            entityId: projectObjId
          });
          await asset.save();
        }

        attachments.push({
          assetId: asset._id as Types.ObjectId,
          filename: asset.originalFilename,
          fileSizeBytes: asset.fileSizeBytes,
          mimeType: asset.mimeType,
          category: asset.category
        });
      }
    }

    let replyObjId: Types.ObjectId | undefined;
    if (replyToMessageId) {
      if (Types.ObjectId.isValid(replyToMessageId)) {
        replyObjId = new Types.ObjectId(replyToMessageId);
      }
    }

    const message = await ProjectMessage.create({
      projectId: project._id,
      senderId: req.user!._id,
      senderRole: isCreator ? 'creator' : 'brand',
      content: content || (attachments.length > 0 ? `Sent ${attachments.length} attachment(s)` : ''),
      attachments,
      replyToMessageId: replyObjId
    });

    const populatedMessage = await ProjectMessage.findById(message._id)
      .populate('senderId', 'name email avatarUrl')
      .lean();

    await logProjectActivity({
      projectId: project._id as Types.ObjectId,
      actorId: req.user!._id,
      actorRole: isCreator ? 'creator' : 'brand',
      eventType: 'message_sent',
      title: 'Message Sent',
      description: `${req.user!.name} posted a message in the collaboration workspace.`
    });

    // Send notification to other participant
    const recipientId = isCreator
      ? ((project.brandId as any)._id || project.brandId)
      : ((project.creatorId as any)._id || project.creatorId);

    await createNotification({
      recipientId,
      type: 'project_message',
      title: `Message from ${req.user!.name}`,
      message: (content || 'Sent an attachment').slice(0, 100),
      projectId: project._id as Types.ObjectId
    });

    res.status(201).json({
      success: true,
      data: {
        ...(populatedMessage as any),
        id: message._id.toString()
      }
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 5. Activity Timeline & Workspace Files
// -------------------------------------------------------------

// GET /api/projects/:projectId/activity
export async function getProjectActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project } = auth;
    const activities = await ProjectActivity.find({ projectId: project._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('actorId', 'name email avatarUrl')
      .lean();

    res.status(200).json({
      success: true,
      data: activities.map((a: any) => ({
        ...a,
        id: a._id.toString()
      }))
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:projectId/files
export async function getProjectFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project } = auth;
    const projectObjId = project._id as Types.ObjectId;

    // Find all media assets linked to this project
    const assets = await MediaAsset.find({
      'linkedEntities.entityType': 'project',
      'linkedEntities.entityId': projectObjId,
      status: 'ready'
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email avatarUrl')
      .lean();

    const provider = storageService.getProvider();
    const filesWithUrls = await Promise.all(
      assets.map(async (asset: any) => {
        let accessUrl = '';
        try {
          accessUrl = await provider.getSignedDownloadUrl(asset.objectKey, asset.originalFilename);
        } catch (e) {
          console.error('Failed generating file access URL:', e);
        }

        return {
          id: asset._id.toString(),
          assetId: asset._id.toString(),
          filename: asset.originalFilename,
          fileSizeBytes: asset.fileSizeBytes,
          mimeType: asset.mimeType,
          category: asset.category,
          dimensions: asset.dimensions,
          uploader: asset.userId,
          accessUrl,
          createdAt: asset.createdAt
        };
      })
    );

    res.status(200).json({
      success: true,
      data: filesWithUrls
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// 6. Project Reviews, Ratings & Collaboration History
// -------------------------------------------------------------

// POST /api/projects/:projectId/review
export async function submitProjectReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await getAuthorizedProject(req.params.projectId, req.user!._id);
    if (!auth) {
      res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' }
      });
      return;
    }

    const { project, isBrand } = auth;
    if (!isBrand) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the brand client can submit project ratings & reviews.' }
      });
      return;
    }

    const reviewSchema = z.object({
      rating: z.number().min(1).max(5),
      review: z.string().trim().min(2, 'Review must be at least 2 characters').max(2000)
    });

    const parseResult = reviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid rating or review.' }
      });
      return;
    }

    const { rating, review: reviewText } = parseResult.data;
    const creatorId = (project.creatorId as any)._id || project.creatorId;
    const brandUser = req.user!;
    const brandProfile = await BrandProfile.findOne({ userId: brandUser._id }).lean();
    const creatorUser = await User.findById(creatorId).lean();

    const brandName = brandProfile?.companyName || brandUser.name || 'Brand Client';
    const brandAvatar = brandProfile?.logoUrl || (brandUser as any).avatarUrl;
    const creatorName = creatorUser?.name || 'Creator';
    const creatorAvatar = (creatorUser as any)?.avatarUrl;

    const savedReview = await Review.findOneAndUpdate(
      { projectId: project._id },
      {
        projectId: project._id,
        brandId: brandUser._id,
        creatorId: creatorId,
        rating,
        review: reviewText,
        projectTitle: project.title,
        brandName,
        brandAvatar,
        creatorName,
        creatorAvatar
      },
      { upsert: true, new: true }
    );

    // Recalculate Creator average rating & count
    const allReviews = await Review.find({ creatorId }).lean();
    if (allReviews.length > 0) {
      const sumRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = Number((sumRatings / allReviews.length).toFixed(1));
      await CreatorProfile.findOneAndUpdate(
        { userId: creatorId },
        { averageRating: avgRating, reviewCount: allReviews.length }
      );
    }

    res.status(200).json({
      success: true,
      data: savedReview
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/history
export async function getProjectHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!._id;

    const query: Record<string, any> = {
      $or: [{ brandId: userId }, { creatorId: userId }]
    };

    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .populate('creatorId', 'name email avatarUrl username')
      .populate('brandId', 'name email avatarUrl')
      .populate('briefId', 'title slug companyName category')
      .lean();

    const historyItems = await Promise.all(
      projects.map(async (proj: any) => {
        const review = await Review.findOne({ projectId: proj._id }).sort({ createdAt: -1 }).lean();
        const brandProfile = await BrandProfile.findOne({ userId: proj.brandId?._id || proj.brandId }).lean();
        const creatorProfile = await CreatorProfile.findOne({ userId: proj.creatorId?._id || proj.creatorId }).lean();

        return {
          id: proj._id.toString(),
          projectId: proj._id.toString(),
          projectReference: proj.projectReference,
          title: proj.title,
          status: proj.status,
          agreedPrice: proj.agreedPrice,
          currency: proj.currency,
          completedAt: proj.updatedAt,
          createdAt: proj.createdAt,
          brand: {
            id: (proj.brandId?._id || proj.brandId)?.toString(),
            name: brandProfile?.companyName || proj.brandId?.name || 'Brand Client',
            avatar: brandProfile?.logoUrl || proj.brandId?.avatarUrl,
            industry: brandProfile?.industry
          },
          creator: {
            id: (proj.creatorId?._id || proj.creatorId)?.toString(),
            name: creatorProfile?.displayName || proj.creatorId?.name || 'Creator',
            username: creatorProfile?.username,
            avatar: creatorProfile?.avatarUrl || proj.creatorId?.avatarUrl,
            headline: creatorProfile?.headline
          },
          rating: review ? review.rating : undefined,
          review: review ? review.review : undefined,
          reviewedAt: review ? review.createdAt : undefined
        };
      })
    );

    res.status(200).json({
      success: true,
      data: historyItems
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/creators/:creatorId/reviews
export async function getCreatorReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idOrUsername = Array.isArray(req.params.creatorId) ? req.params.creatorId[0] : req.params.creatorId;

    let targetUserId: any = null;
    if (mongoose.Types.ObjectId.isValid(idOrUsername)) {
      const profile = await CreatorProfile.findOne({
        $or: [{ _id: idOrUsername }, { userId: idOrUsername }]
      }).lean();
      if (profile) {
        targetUserId = profile.userId;
      } else {
        targetUserId = idOrUsername;
      }
    } else {
      const profile = await CreatorProfile.findOne({ username: idOrUsername.toLowerCase() }).lean();
      if (profile) {
        targetUserId = profile.userId;
      }
    }

    if (!targetUserId) {
      res.status(404).json({
        error: { code: 'CREATOR_NOT_FOUND', message: 'Creator not found.' }
      });
      return;
    }

    const reviews = await Review.find({ creatorId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const allReviews = await Review.find({ creatorId: targetUserId }).select('rating').lean();
    const count = allReviews.length;
    const avg = count > 0
      ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
      : 5.0;

    res.status(200).json({
      success: true,
      data: {
        averageRating: avg,
        reviewCount: count,
        reviews: reviews.map((r: any) => ({
          id: r._id.toString(),
          projectId: r.projectId?.toString(),
          rating: r.rating,
          review: r.review,
          projectTitle: r.projectTitle,
          brandName: r.brandName,
          brandAvatar: r.brandAvatar,
          createdAt: r.createdAt
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/brand/reviews
export async function getBrandReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brandId = req.user!._id;
    const reviews = await Review.find({ brandId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      data: reviews.map((r: any) => ({
        id: r._id.toString(),
        projectId: r.projectId?.toString(),
        rating: r.rating,
        review: r.review,
        projectTitle: r.projectTitle,
        creatorName: r.creatorName,
        creatorAvatar: r.creatorAvatar,
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
}
