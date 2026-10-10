import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { OnboardingGuard } from './components/guards/OnboardingGuard';

// Public Pages
import { HomePage } from './pages/HomePage';
import { PublicCreatorProfilePage } from './pages/creators/PublicCreatorProfilePage';
import { BrandsPage } from './pages/BrandsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

// Public Brief Discovery
import { PublicBriefsDirectoryPage } from './pages/briefs/PublicBriefsDirectoryPage';
import { PublicBriefDetailPage } from './pages/briefs/PublicBriefDetailPage';

// Onboarding Pages
import { CreatorOnboardingPage } from './pages/onboarding/CreatorOnboardingPage';
import { BrandOnboardingPage } from './pages/onboarding/BrandOnboardingPage';

// Dashboard & Studio Pages (Phase 3)
import { CreatorDashboardPage } from './pages/dashboard/CreatorDashboardPage';
import { PortfolioManagerPage } from './pages/portfolio/PortfolioManagerPage';
import { ServiceCatalogPage } from './pages/services/ServiceCatalogPage';

import { BrandDashboardPage } from './pages/dashboard/BrandDashboardPage';
import { BrandBriefsManagerPage } from './pages/briefs/BrandBriefsManagerPage';
import { CampaignBriefEditorPage } from './pages/briefs/CampaignBriefEditorPage';

// Phase 4 Creator Proposals & Pitch Studio
import { CreatorProposalsListPage } from './pages/proposals/CreatorProposalsListPage';
import { CreatorProposalDetailPage } from './pages/proposals/CreatorProposalDetailPage';
import { PitchStudioPage } from './pages/proposals/PitchStudioPage';

// Phase 4 Brand Review Center
import { BrandProposalsManagerPage } from './pages/proposals/BrandProposalsManagerPage';
import { BrandProposalReviewDetailPage } from './pages/proposals/BrandProposalReviewDetailPage';

// Phase 5 AI Creative Studio
import { CreativeStudioPage } from './pages/creative-studio/CreativeStudioPage';

// Phase 6 Creator Discovery, Matches & Opportunities
import { CreatorDiscoveryPage } from './pages/discovery/CreatorDiscoveryPage';
import { BrandCampaignMatchesPage } from './pages/matching/BrandCampaignMatchesPage';
import { CreatorOpportunitiesPage } from './pages/opportunities/CreatorOpportunitiesPage';

// Phase 4 Projects Workspaces
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';

import { SettingsPage } from './pages/settings/SettingsPage';

// Utility Pages
import { ComingSoonPage } from './pages/ComingSoonPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Dashboard Redirect Component
const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'creator') return <Navigate to="/creator/dashboard" replace />;
  return <Navigate to="/brand/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Public Website Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<CreatorDiscoveryPage />} />
            <Route path="/creators" element={<CreatorDiscoveryPage />} />
            <Route path="/creators/:usernameOrId" element={<PublicCreatorProfilePage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Public Campaign Discovery */}
            <Route path="/briefs" element={<PublicBriefsDirectoryPage />} />
            <Route path="/briefs/:briefIdOrSlug" element={<PublicBriefDetailPage />} />

            {/* Role-Specific Onboarding Wizards */}
            <Route
              path="/onboarding/creator"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding/brand"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandOnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Authenticated & Guarded Dashboards */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <DashboardRedirect />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />

            {/* Creator Studio & Proposal Routes (Phase 3 & Phase 4) */}
            <Route
              path="/creator/dashboard"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <CreatorDashboardPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/portfolio"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <PortfolioManagerPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/services"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <ServiceCatalogPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/proposals"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <CreatorProposalsListPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/proposals/new/:briefId"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <PitchStudioPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/proposals/:proposalId/edit"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <PitchStudioPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/proposals/:proposalId"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <CreatorProposalDetailPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            {/* Phase 6 Creator Opportunity Discovery */}
            <Route
              path="/creator/opportunities"
              element={
                <ProtectedRoute allowedRoles={['creator', 'admin']}>
                  <OnboardingGuard>
                    <CreatorOpportunitiesPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />

            {/* Brand Campaign Hub, Matches & Proposals (Phase 3, 4, 6) */}
            <Route
              path="/brand/dashboard"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <BrandDashboardPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/creators"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <CreatorDiscoveryPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/briefs"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <BrandBriefsManagerPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/briefs/:briefId/matches"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <BrandCampaignMatchesPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/briefs/new"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <CampaignBriefEditorPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/briefs/:briefId/edit"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <CampaignBriefEditorPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/proposals"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <BrandProposalsManagerPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/proposals/:proposalId"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <BrandProposalReviewDetailPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />

            {/* Phase 5 AI Creative Brief Studio */}
            <Route
              path="/brand/creative-studio"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <CreativeStudioPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/creative-studio/:draftId"
              element={
                <ProtectedRoute allowedRoles={['brand', 'admin']}>
                  <OnboardingGuard>
                    <CreativeStudioPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />

            {/* Awarded Project Workspaces (Phase 4) */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <ProjectsPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId"
              element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <ProjectDetailPage />
                  </OnboardingGuard>
                </ProtectedRoute>
              }
            />

            {/* User Settings */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Preview Routes for Upcoming Phases */}
            <Route path="/messages" element={<ComingSoonPage />} />
            <Route path="/calls" element={<ComingSoonPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
