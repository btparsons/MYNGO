// Loading Spinner Component - Animated loading indicator
// Created: Beautiful loading spinner with MYNGO branding

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin"></div>
      </div>
      {text && (
        <p className="text-white/70 text-sm font-medium">{text}</p>
      )}
    </div>
  );
}