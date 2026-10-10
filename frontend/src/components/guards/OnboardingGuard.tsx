import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../ui/Skeleton';

export const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Skeleton className="h-12 w-80 mb-6" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // If onboarding is not completed, redirect to appropriate wizard
  if (user.onboardingStatus !== 'completed') {
    if (user.role === 'creator') {
      return <Navigate to="/onboarding/creator" replace />;
    }
    if (user.role === 'brand') {
      return <Navigate to="/onboarding/brand" replace />;
    }
  }

  return <>{children}</>;
};
