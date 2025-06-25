// Glass Card Component - Reusable glassmorphism card with hover effects
// Created: Beautiful glassmorphism card component for consistent UI

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', hover = false, onClick }: GlassCardProps) {
  return (
    <div
      className={`
        backdrop-blur-[10px] bg-black/50 border border-white/10 rounded-xl
        transition-all duration-200 ease-out
        ${hover ? 'hover:bg-black/60 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer' : ''}
        ${onClick ? 'active:scale-[0.98]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}