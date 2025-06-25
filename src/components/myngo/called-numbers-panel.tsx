// Called Numbers Panel - Display of called numbers with timestamps
// Created: Side panel showing called numbers history with visual indicators

import React from 'react';
import { CalledNumber } from '../../types/myngo';
import { formatCalledNumber } from '../../utils/myngo-utils';
import { GlassCard } from '../ui/glass-card';
import { Clock } from 'lucide-react';

interface CalledNumbersPanelProps {
  calledNumbers: CalledNumber[];
  playerCard?: any;
  markedNumbers?: number[];
  className?: string;
}

export function CalledNumbersPanel({ 
  calledNumbers, 
  playerCard, 
  markedNumbers = [],
  className = '' 
}: CalledNumbersPanelProps) {
  const markedSet = new Set(markedNumbers);

  // Get all numbers from player's card for checking
  const cardNumbers = playerCard ? [
    ...playerCard.M,
    ...playerCard.Y,
    ...playerCard.N,
    ...playerCard.G,
    ...playerCard.O
  ] : [];
  const cardNumbersSet = new Set(cardNumbers);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-white/70" />
          <h3 className="text-white font-semibold">Called Numbers</h3>
          <span className="text-white/50 text-sm">({calledNumbers.length}/75)</span>
        </div>

        {calledNumbers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
            No numbers called yet
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {/* Most recent number - large display */}
            {calledNumbers[0] && (
              <div className="mb-4">
                <div className="text-white/70 text-xs mb-1">Latest Call</div>
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-center">
                  <div className="text-white font-bold text-3xl">
                    {formatCalledNumber(calledNumbers[0])}
                  </div>
                  <div className="text-white/80 text-xs mt-1">
                    {formatTime(calledNumbers[0].called_at)}
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            <div className="space-y-1">
              <div className="text-white/70 text-xs mb-2">History</div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                {calledNumbers.slice(1).map((calledNumber, index) => {
                  const isOnCard = cardNumbersSet.has(calledNumber.number);
                  const isMarked = markedSet.has(calledNumber.number);
                  
                  return (
                    <div
                      key={calledNumber.id}
                      className={`
                        flex items-center justify-between p-2 lg:p-3 rounded-lg
                        ${isOnCard 
                          ? isMarked 
                            ? 'bg-green-500/20 border border-green-500/30' 
                            : 'bg-yellow-500/20 border border-yellow-500/30'
                          : 'bg-white/5 border border-white/10'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono font-semibold text-sm lg:text-base">
                          {formatCalledNumber(calledNumber)}
                        </span>
                        {isOnCard && (
                          <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${isMarked ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        )}
                      </div>
                      <span className="text-white/50 text-xs lg:text-sm">
                        {formatTime(calledNumber.called_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}