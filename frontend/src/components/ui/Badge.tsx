import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'cyan' | 'success' | 'warning' | 'error' | 'outline' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors';

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
  };

  const variantStyles = {
    default: 'bg-surface-elevated text-text-secondary border border-border',
    neutral: 'bg-surface-muted text-text-muted border border-border/80',
    cyan: 'bg-accent/10 text-accent border border-accent/30',
    success: 'bg-success/10 text-success border border-success/30',
    warning: 'bg-warning/10 text-warning border border-warning/30',
    error: 'bg-status-error/10 text-status-error border border-status-error/30',
    outline: 'bg-transparent text-text-muted border border-border hover:border-text-secondary',
    purple: 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
};
