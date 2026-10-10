import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../../types';
import { getMyProjects, extractErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FolderKanban,
  Clock,
  DollarSign,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyProjects();
        setProjects(data || []);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load awarded projects.'));
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-[#090B10] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>Awarded Project Workspaces</span>
              <Badge variant="success" size="sm">Phase 4 Active</Badge>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Active projects initialized from accepted creator proposals with immutable agreement snapshots.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm mt-3">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
            <FolderKanban className="w-12 h-12 text-gray-500 mx-auto opacity-40" />
            <h3 className="text-lg font-bold text-white">No active projects yet</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Projects are automatically generated once a brand accepts a creator proposal. Check your proposals or campaigns to begin.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link to="/creator/proposals">
                <Button variant="outline" className="border-[#1F2937]">View My Proposals</Button>
              </Link>
              <Link to="/briefs">
                <Button variant="primary">Browse Campaigns</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((proj) => {
              const brief = proj.briefId as any;

              return (
                <Card
                  key={proj.id}
                  className="p-6 bg-[#11151D] border border-emerald-500/30 hover:border-emerald-500/60 transition-all rounded-xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Badge variant="success">Ready for Kickoff</Badge>
                        <span className="text-xs text-gray-400 font-mono">{proj.projectReference}</span>
                        {brief?.title && (
                          <span className="text-xs text-gray-500 truncate">Campaign: {brief.title}</span>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-white hover:text-emerald-400 transition-colors">
                        <Link to={`/projects/${proj.id}`}>{proj.title}</Link>
                      </h2>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1">
                        <span className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          ${proj.agreedPrice?.toLocaleString()} {proj.currency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {proj.deliveryDurationWeeks} weeks timeline
                        </span>
                        <span>
                          {proj.agreedDeliverables?.length || 0} deliverables
                        </span>
                        <span>
                          Awarded: {new Date(proj.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <Link to={`/projects/${proj.id}`}>
                        <Button variant="outline" className="flex items-center gap-2 text-xs py-2 border-[#1F2937] hover:border-emerald-500">
                          <span>View Agreement & Scope</span>
                          <ArrowRight className="w-4 h-4 text-emerald-400" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
