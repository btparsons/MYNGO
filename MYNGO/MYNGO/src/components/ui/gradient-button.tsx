// Gradient Button Component - Beautiful gradient buttons with glow effects
// Created: Premium gradient buttons for CTAs and actions

import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'purple' | 'cyan' | 'pink' | 'green' | 'red' | 'yellow';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  className?: string;
}

const variants = {
  purple: 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-500/25 hover:shadow-purple-500/40',
  cyan: 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-500/25 hover:shadow-cyan-500/40',
  pink: 'bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 shadow-pink-500/25 hover:shadow-pink-500/40',
  green: 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-green-500/25 hover:shadow-green-500/40',
  red: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/25 hover:shadow-red-500/40',
  yellow: 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 shadow-yellow-500/25 hover:shadow-yellow-500/40'
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
  xl: 'px-12 py-6 text-xl'
};

export function GradientButton({ 
  children, 
  onClick, 
  variant = 'purple', 
  size = 'md',
  disabled = false,
  className = ''
}: GradientButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        text-white font-semibold rounded-xl
        shadow-lg transition-all duration-200 ease-out
        hover:scale-105 hover:shadow-xl
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
      `}
    >
      {children}
    </button>
  );
}