import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className,
  ...props
}) => {
  const baseStyles = 'rounded-xl border transition-all duration-300 relative overflow-hidden';

  const variantStyles = {
    default: 'bg-surface border-border',
    elevated: 'bg-surface-elevated border-border shadow-card-dark',
    glass: 'glass-panel shadow-card-dark',
    interactive: 'bg-surface border-border hover:border-accent/40 hover:bg-surface-elevated/70 hover:shadow-glow-sm cursor-pointer'
  };

  return (
    <div
      className={twMerge(clsx(baseStyles, variantStyles[variant], className))}
      {...props}
    >
      {children}
    </div>
  );
};
