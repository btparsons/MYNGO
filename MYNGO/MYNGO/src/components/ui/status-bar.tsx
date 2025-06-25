// Status Bar Component - Display game status and host connection state
// Updated: Enhanced status display with active game tracking and detailed status messages

import React from 'react';
import { GlassCard } from './glass-card';

interface StatusBarProps {
  isGameActive: boolean;
  isAutoCalling: boolean;
  autoCallFrequency?: number;
  isHostDisconnected: boolean;
  isHostPaused: boolean;
  roomStatus?: string;
  hasWinner?: boolean;
  className?: string;
}

export function StatusBar({ 
  isGameActive, 
  isAutoCalling, 
  autoCallFrequency, 
  isHostDisconnected, 
  isHostPaused, 
  roomStatus,
  hasWinner,
  className = '' 
}: StatusBarProps) {
  console.log('📊 StatusBar render with:', {
    isGameActive,
    isAutoCalling,
    autoCallFrequency,
    isHostDisconnected,
    isHostPaused,
    roomStatus,
    hasWinner
  });
  
  const getStatusInfo = () => {
    // Show finished status for completed games
    if (roomStatus === 'finished' || hasWinner) {
      return {
        icon: '🏆',
        text: 'Game Complete - Winner declared!',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        textColor: 'text-green-300'
      };
    }
    
    if (roomStatus === 'cancelled') {
      return {
        icon: '🚫',
        text: 'Game Cancelled',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-300'
      };
    }
    
    if (isHostDisconnected) {
      return {
        icon: '🔴',
        text: 'Connection lost - Checking...',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-300'
      };
    } else if (isHostPaused) {
      return {
        icon: '🟠',
        text: 'Game Paused - Waiting for host',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
        textColor: 'text-orange-300'
      };
    } else if (isGameActive) {
      if (isAutoCalling && autoCallFrequency) {
        return {
          icon: '🟢',
          text: `Game Active - Auto-calling every ${autoCallFrequency} seconds`,
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          textColor: 'text-green-300'
        };
      } else {
        return {
          icon: '🟡',
          text: 'Game Active - Manual mode',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-300'
        };
      }
    } else {
      return {
        icon: '🟠',
        text: 'Waiting for host to start calling numbers',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
        textColor: 'text-orange-300'
      };
    }
  };

  const status = getStatusInfo();
  console.log('📊 StatusBar final status:', status);

  return (
    <div className={`${className}`}>
      <div className={`
        ${status.bgColor} ${status.borderColor} border rounded-lg p-3
        flex items-center justify-center gap-2
        transition-all duration-200 ease-out
      `}>
        <span className="text-lg">{status.icon}</span>
        <span className={`${status.textColor} font-medium text-sm sm:text-base`}>
          {status.text}
        </span>
      </div>
    </div>
  );
}