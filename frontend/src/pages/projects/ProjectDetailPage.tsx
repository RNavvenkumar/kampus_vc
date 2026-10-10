import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Check,
  Lock,
  Clock,
  Send,
  MessageSquare,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  Play,
  Download,
  Paperclip,
  ChevronDown,
  ChevronUp,
  CreditCard
} from 'lucide-react';
import {
  Project,
  ProjectMilestone,
  DeliverableSubmission,
  ProjectActivityItem,
  ProjectWorkspaceFile,
  ProjectFinancialsResponse
} from '../../types';
import {
  getProjectById,
  getProjectMilestones,
  getMilestoneSubmissions,
  getProjectActivity,
  getProjectFiles,
  getProjectFinancials,
  updateProjectStatus,
  updateMilestoneStatus,
  extractErrorMessage
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DeliverableSubmitModal } from '../../components/projects/DeliverableSubmitModal';
import { SubmissionReviewModal } from '../../components/projects/SubmissionReviewModal';
import { ProjectChatBox } from '../../components/projects/ProjectChatBox';
import { FinancialSummaryTab } from '../../components/payments/FinancialSummaryTab';
import { PaymentCheckoutModal } from '../../components/payments/PaymentCheckoutModal';

type WorkspaceTab = 'overview' | 'milestones' | 'financials' | 'files' | 'messages' | 'activity';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [submissions, setSubmissions] = useState<DeliverableSubmission[]>([]);
  const [activities, setActivities] = useState<ProjectActivityItem[]>([]);
  const [files, setFiles] = useState<ProjectWorkspaceFile[]>([]);
  const [financialsData, setFinancialsData] = useState<ProjectFinancialsResponse | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('milestones');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [selectedMilestoneForSubmit, setSelectedMilestoneForSubmit] = useState<ProjectMilestone | null>(null);
  const [selectedMilestoneForCheckout, setSelectedMilestoneForCheckout] = useState<ProjectMilestone | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState<{
    submission: DeliverableSubmission;
    milestoneTitle: string;
  } | null>(null);

  // Submissions history accordion per milestone
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  const toggleMilestoneAccordion = (milestoneId: string) => {
    setExpandedMilestones((prev) => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const loadAllProjectData = async (silent = false) => {
    if (!projectId) return;
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [projData, milestonesData, submissionsData, activityData, filesData, finData] = await Promise.all([
        getProjectById(projectId),
        getProjectMilestones(projectId),
        getMilestoneSubmissions(projectId, 'all'),
        getProjectActivity(projectId),
        getProjectFiles(projectId),
        getProjectFinancials(projectId).catch(() => null)
      ]);

      setProject(projData);
      setMilestones(milestonesData || []);
      setSubmissions(submissionsData || []);
      setActivities(activityData || []);
      setFiles(filesData || []);
      if (finData) setFinancialsData(finData);
    } catch (err: any) {
      if (!silent) setError(extractErrorMessage(err, 'Failed to load project workspace.'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllProjectData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090B10] text-white flex items-center justify-center py-24">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading project workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#090B10] text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold">Project Workspace Unavailable</h2>
          <p className="text-gray-400 text-sm">{error || 'The requested project could not be found or access is restricted.'}</p>
          <Link to="/projects">
            <Button variant="primary">Return to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentUserId = user?.id || '';
  const creatorId = (project.creatorId as any)?.id || (project.creatorId as any)?._id || project.creatorId;
  const brandId = (project.brandId as any)?.id || (project.brandId as any)?._id || project.brandId;
  const isCreator = currentUserId === creatorId;
  const isBrand = currentUserId === brandId;

  const snapshot = project.agreementSnapshot;

  // Handle Project Kickoff
  const handleKickoffProject = async () => {
    if (!projectId) return;
    try {
      setActionLoading(true);
      await updateProjectStatus(projectId, 'in_progress');
      setNotificationMsg({ text: 'Project officially kicked off! Workspace is now active.', type: 'success' });
      await loadAllProjectData(true);
    } catch (err: any) {
      setNotificationMsg({ text: extractErrorMessage(err, 'Failed to kick off project.'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Project Completion
  const handleCompleteProject = async () => {
    if (!projectId) return;
    try {
      setActionLoading(true);
      await updateProjectStatus(projectId, 'completed');
      setNotificationMsg({ text: 'Project marked as completed! Congratulations on the project delivery.', type: 'success' });
      await loadAllProjectData(true);
    } catch (err: any) {
      setNotificationMsg({ text: extractErrorMessage(err, 'Failed to complete project.'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Milestone Start
  const handleStartMilestone = async (milestoneId: string) => {
    if (!projectId) return;
    try {
      setActionLoading(true);
      await updateMilestoneStatus(projectId, milestoneId, 'in_progress');
      setNotificationMsg({ text: 'Milestone status updated to In Progress.', type: 'success' });
      await loadAllProjectData(true);
    } catch (err: any) {
      setNotificationMsg({ text: extractErrorMessage(err, 'Failed to start milestone.'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const allMilestonesApproved = milestones.length > 0 && milestones.every((m) => m.status === 'approved');
  const approvedMilestonesCount = milestones.filter((m) => m.status === 'approved').length;

  return (
    <div className="min-h-screen bg-[#090B10] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <div>
            <Link
              to="/projects"
              className="inline-flex items-center text-xs text-gray-400 hover:text-emerald-400 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Projects
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{project.title}</h1>
              {project.status === 'ready_for_kickoff' && <Badge variant="warning">Ready for Kickoff</Badge>}
              {project.status === 'in_progress' && <Badge variant="cyan">In Progress</Badge>}
              {project.status === 'completed' && <Badge variant="success">Completed 🎉</Badge>}
              {project.status === 'cancelled' && <Badge variant="error">Cancelled</Badge>}
              <span className="text-xs text-gray-500 font-mono">{project.projectReference}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {project.status === 'ready_for_kickoff' && (
              <Button
                variant="primary"
                onClick={handleKickoffProject}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Play className="w-4 h-4 mr-1.5" />
                {actionLoading ? 'Initializing...' : 'Kick Off Project'}
              </Button>
            )}
            {project.status === 'in_progress' && allMilestonesApproved && (
              <Button
                variant="primary"
                onClick={handleCompleteProject}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {actionLoading ? 'Finalizing...' : 'Complete Project'}
              </Button>
            )}
          </div>
        </div>

        {/* Global Notification Toast */}
        {notificationMsg && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-sm ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/50 border border-red-500/50 text-red-200'
            }`}
          >
            <span>{notificationMsg.text}</span>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-xs opacity-70 hover:opacity-100 ml-4 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <div className="flex border-b border-[#1F2937] overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'milestones'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Milestones & Deliverables ({approvedMilestonesCount}/{milestones.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'messages'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Collaboration Chat
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'financials'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Escrow & Financials
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'files'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Workspace Files ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Contract & Agreement
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'activity'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Activity Log
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: MILESTONES & DELIVERABLES */}
        {/* ==================================================== */}
        {activeTab === 'milestones' && (
          <div className="space-y-6">
            {/* Progress summary bar */}
            <Card className="p-5 bg-[#11151D] border-[#1F2937] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base">Project Milestone Pipeline</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Deliverables submitted against agreed milestones must be reviewed and approved by the brand.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-[#1F2937] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${milestones.length > 0 ? (approvedMilestonesCount / milestones.length) * 100 : 0}%`
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {approvedMilestonesCount} / {milestones.length} Approved
                </span>
              </div>
            </Card>

            {/* Milestone Cards List */}
            <div className="space-y-4">
              {milestones.map((m) => {
                const milestoneId = (m.id || m._id || '').toString();
                const milestoneSubs = submissions.filter(
                  (s) => s.milestoneId?.toString() === milestoneId
                );
                const isExpanded = !!expandedMilestones[milestoneId];

                return (
                  <Card
                    key={milestoneId}
                    className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                            Milestone #{m.order}
                          </span>
                          {/* Status Badge */}
                          {m.status === 'not_started' && <Badge variant="outline">Not Started</Badge>}
                          {m.status === 'in_progress' && <Badge variant="cyan">In Progress</Badge>}
                          {m.status === 'submitted_for_review' && <Badge variant="warning">Under Brand Review</Badge>}
                          {m.status === 'revision_requested' && (
                            <Badge variant="error">Revision Requested</Badge>
                          )}
                          {m.status === 'approved' && <Badge variant="success">Approved ✓</Badge>}
                        </div>

                        <h3 className="text-lg font-bold text-white">{m.title}</h3>
                        {m.description && <p className="text-xs text-gray-400 leading-relaxed">{m.description}</p>}

                        {/* Deliverables tags */}
                        {m.deliverables && m.deliverables.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {m.deliverables.map((deliv, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-[#161B26] border border-[#2B3545] text-[11px] text-gray-300 flex items-center gap-1"
                              >
                                <Check className="w-3 h-3 text-emerald-400" />
                                {deliv}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Meta & Action Buttons */}
                      <div className="flex flex-col sm:items-end gap-3 shrink-0">
                        <div className="text-right">
                          {m.amount !== undefined && (
                            <div className="text-lg font-extrabold text-emerald-400">
                              ₹{m.amount.toLocaleString()} {project.currency === 'USD' ? 'INR' : project.currency}
                            </div>
                          )}
                          {m.durationWeeks && (
                            <div className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {m.durationWeeks} Weeks Target
                            </div>
                          )}
                        </div>

                        {/* Participant Actions */}
                        <div className="flex items-center gap-2">
                          {/* Creator: Start Work button */}
                          {isCreator && m.status === 'not_started' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartMilestone(milestoneId)}
                              disabled={actionLoading}
                            >
                              Start Working
                            </Button>
                          )}

                          {/* Creator: Submit Deliverable button */}
                          {isCreator &&
                            (m.status === 'in_progress' || m.status === 'revision_requested') && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setSelectedMilestoneForSubmit(m)}
                              >
                                <Send className="w-3.5 h-3.5 mr-1" />
                                Submit Deliverable
                              </Button>
                            )}

                          {/* Brand: Review Submission button */}
                          {isBrand && m.status === 'submitted_for_review' && milestoneSubs.length > 0 && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-500"
                              onClick={() =>
                                setSelectedSubmissionForReview({
                                  submission: milestoneSubs[0],
                                  milestoneTitle: m.title
                                })
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Review Submission
                            </Button>
                          )}

                          {/* Brand: Deposit Milestone Escrow button */}
                          {isBrand && (
                            (() => {
                              const isPaid = financialsData?.payments.some(
                                (p) =>
                                  p.milestoneId === milestoneId &&
                                  (p.status === 'captured' || p.status === 'partially_refunded')
                              );

                              if (isPaid) {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-lg">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Funded
                                  </span>
                                );
                              }

                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500 hover:text-zinc-950"
                                  onClick={() => {
                                    setSelectedMilestoneForCheckout(m);
                                    setCheckoutModalOpen(true);
                                  }}
                                >
                                  <Lock className="w-3.5 h-3.5 mr-1" />
                                  Fund Escrow
                                </Button>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Submission History Accordion Toggle */}
                    {milestoneSubs.length > 0 && (
                      <div className="pt-3 border-t border-[#1F2937]">
                        <button
                          type="button"
                          onClick={() => toggleMilestoneAccordion(milestoneId)}
                          className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 hover:text-emerald-400 transition-colors"
                        >
                          <span>
                            Submission History ({milestoneSubs.length} version{milestoneSubs.length > 1 ? 's' : ''})
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            {milestoneSubs.map((sub) => (
                              <div
                                key={sub.id}
                                className="p-4 rounded-xl bg-[#090B10] border border-[#1F2937] space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">Version v{sub.version}</span>
                                    {sub.status === 'submitted' && <Badge variant="warning">Submitted</Badge>}
                                    {sub.status === 'revision_requested' && (
                                      <Badge variant="error">Revision Requested</Badge>
                                    )}
                                    {sub.status === 'approved' && <Badge variant="success">Approved</Badge>}
                                  </div>
                                  <span className="text-gray-500">
                                    {new Date(sub.submittedAt).toLocaleString()}
                                  </span>
                                </div>

                                {/* Creator Walkthrough Notes */}
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  {sub.submissionNotes}
                                </p>

                                {/* Attached Files */}
                                {sub.attachments && sub.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {sub.attachments.map((att, aIdx) => (
                                      <div
                                        key={aIdx}
                                        className="p-1.5 px-2 rounded-lg bg-[#161B26] border border-[#2B3545] flex items-center gap-2 text-[11px]"
                                      >
                                        <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-gray-200 truncate max-w-[140px]">
                                          {att.filename}
                                        </span>
                                        {att.accessUrl && (
                                          <a
                                            href={att.accessUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-emerald-400 hover:text-emerald-300 ml-1"
                                            title="Download file"
                                          >
                                            <Download className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Review Feedback Note */}
                                {sub.reviewFeedback && (
                                  <div className="mt-2 p-2.5 rounded-lg bg-[#1A1612] border border-amber-900/50 text-amber-200">
                                    <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">
                                      Brand Feedback ({sub.status})
                                    </span>
                                    <p className="italic">{sub.reviewFeedback}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: PROJECT MESSAGES (CHAT) */}
        {/* ==================================================== */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <ProjectChatBox projectId={project.id} currentUserId={currentUserId} />
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: WORKSPACE FILES GALLERY */}
        {/* ==================================================== */}
        {activeTab === 'files' && (
          <div className="space-y-6">
            <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Aggregated Project Files</h3>
                  <p className="text-xs text-gray-400">
                    All deliverable renders and attachments submitted in this private project workspace.
                  </p>
                </div>
                <Badge variant="outline">{files.length} Assets</Badge>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-12 text-gray-500 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-gray-600" />
                  <p className="text-sm">No files uploaded to this workspace yet.</p>
                  <p className="text-xs">Files will appear here once deliverables or attachments are submitted.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 rounded-xl bg-[#090B10] border border-[#1F2937] hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                            {file.category === 'video' ? (
                              <FileText className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="truncate">
                            <h4 className="font-bold text-white text-xs truncate" title={file.filename}>
                              {file.filename}
                            </h4>
                            <p className="text-[10px] text-gray-400 uppercase">
                              {(file.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • {file.category}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#1F2937] flex items-center justify-between text-xs">
                        <span className="text-[10px] text-gray-500">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                        {file.accessUrl && (
                          <a
                            href={file.accessUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: CONTRACT & AGREEMENT (OVERVIEW) */}
        {/* ==================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Immutable Snapshot Notification Banner */}
            <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-100 flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Immutable Agreement Snapshot Verified</h3>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  Recorded upon proposal acceptance on{' '}
                  {new Date(snapshot?.acceptedAt || project.createdAt).toLocaleString()}. Deliverables, pricing, and
                  timelines are permanently frozen in this snapshot, remaining immutable through any profile or brief updates.
                </p>
              </div>
            </div>

            {/* Commercial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
                <p className="text-xs text-gray-400 uppercase font-medium">Agreed Total Price</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                  ${project.agreedPrice?.toLocaleString()} {project.currency}
                </p>
              </Card>
              <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
                <p className="text-xs text-gray-400 uppercase font-medium">Agreed Timeline</p>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {project.deliveryDurationWeeks} Weeks
                </p>
              </Card>
              <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
                <p className="text-xs text-gray-400 uppercase font-medium">Revision Allowance</p>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {project.revisionAllowance} Cycles
                </p>
              </Card>
              <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
                <p className="text-xs text-gray-400 uppercase font-medium">Agreement Version</p>
                <p className="text-2xl font-extrabold text-[#58D5FF] mt-1">
                  v{snapshot?.proposalVersion || 1}
                </p>
              </Card>
            </div>

            {/* Participants Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-5 bg-[#11151D] border-[#1F2937] rounded-xl space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase">Creator Participant</span>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-white text-sm">
                    {(project.creatorId as any)?.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{(project.creatorId as any)?.name || 'Creator'}</h4>
                    <p className="text-xs text-gray-400">{(project.creatorId as any)?.email}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-[#11151D] border-[#1F2937] rounded-xl space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase">Brand Participant</span>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
                    {(project.brandId as any)?.name?.[0]?.toUpperCase() || 'B'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{(project.brandId as any)?.name || 'Brand Client'}</h4>
                    <p className="text-xs text-gray-400">{(project.brandId as any)?.email}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Agreed Deliverables Checklist */}
            <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-[#1F2937] pb-3">
                Authoritative Deliverables Scope
              </h3>
              <ul className="space-y-2.5">
                {project.agreedDeliverables?.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-gray-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: ACTIVITY TIMELINE AUDIT LOG */}
        {/* ==================================================== */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Project Activity Audit Log</h3>
                  <p className="text-xs text-gray-400">
                    Immutable chronological record of milestone changes, deliverable reviews, and project events.
                  </p>
                </div>
                <Badge variant="outline">{activities.length} Events</Badge>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-800">
                  {activities.map((act) => (
                    <div key={act.id} className="relative flex items-start gap-4 text-xs">
                      <div className="w-7 h-7 rounded-full bg-[#11151D] border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shrink-0 z-10">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 p-3.5 rounded-xl bg-[#090B10] border border-[#1F2937] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{act.title}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">{act.description}</p>
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider bg-gray-800 text-gray-400">
                            {act.actorRole}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: ESCROW & FINANCIAL LEDGER (Phase 9) */}
        {/* ==================================================== */}
        {activeTab === 'financials' && (
          <FinancialSummaryTab
            project={project}
            financialData={financialsData}
            loading={loading}
            currentUserRole={user?.role || 'creator'}
            onRefresh={() => loadAllProjectData(true)}
          />
        )}

        {/* Modal: Deliverable Submission */}
        {selectedMilestoneForSubmit && (
          <DeliverableSubmitModal
            projectId={project.id}
            milestone={selectedMilestoneForSubmit}
            isOpen={true}
            onClose={() => setSelectedMilestoneForSubmit(null)}
            onSuccess={() => {
              setNotificationMsg({ text: 'Deliverable submitted successfully! Brand client notified.', type: 'success' });
              loadAllProjectData(true);
            }}
          />
        )}

        {/* Modal: Submission Review */}
        {selectedSubmissionForReview && (
          <SubmissionReviewModal
            projectId={project.id}
            submission={selectedSubmissionForReview.submission}
            milestoneTitle={selectedSubmissionForReview.milestoneTitle}
            isOpen={true}
            onClose={() => setSelectedSubmissionForReview(null)}
            onSuccess={(_updatedSub, milestoneStatus) => {
              setNotificationMsg({
                text: milestoneStatus === 'approved' ? 'Deliverable approved successfully!' : 'Revision requested successfully.',
                type: 'success'
              });
              loadAllProjectData(true);
            }}
          />
        )}

        {/* Modal: Escrow Payment Checkout (Phase 9) */}
        {checkoutModalOpen && (
          <PaymentCheckoutModal
            project={project}
            milestone={selectedMilestoneForCheckout}
            isOpen={true}
            onClose={() => {
              setCheckoutModalOpen(false);
              setSelectedMilestoneForCheckout(null);
            }}
            onSuccess={(payment) => {
              setCheckoutModalOpen(false);
              setSelectedMilestoneForCheckout(null);
              setNotificationMsg({
                text: `Payment of ${payment.currency} ${(payment.capturedAmountMinor / 100).toLocaleString()} secured in escrow!`,
                type: 'success'
              });
              loadAllProjectData(true);
            }}
          />
        )}
      </div>
    </div>
  );
};
