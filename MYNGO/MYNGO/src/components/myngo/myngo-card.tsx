// MYNGO Card Component - Interactive game card with win detection
// Updated: Replaced "So Close" with "MYNGO" win button when player has winning pattern

import React from 'react';
import { MyngoCard as MyngoCardType } from '../../types/myngo';
import { checkWin, isCloseToWin } from '../../utils/myngo-utils';
import { GlassCard } from '../ui/glass-card';

interface MyngoCardProps {
  card: MyngoCardType;
  markedNumbers: number[];
  calledNumbers: number[];
  onMarkNumber: (number: number) => void;
  canMark?: boolean;
  showWinButton?: boolean;
  onWin?: () => void;
}

export function MyngoCard({ 
  card, 
  markedNumbers, 
  calledNumbers,
  onMarkNumber, 
  canMark = true,
  showWinButton = false,
  onWin 
}: MyngoCardProps) {
  const markedSet = new Set(markedNumbers);
  const calledSet = new Set(calledNumbers);
  const winCheck = checkWin(card, markedNumbers);
  const isClose = isCloseToWin(card, markedNumbers);

  // Enhanced logging for win detection
  console.log('🎴 MyngoCard render:', {
    markedCount: markedNumbers.length,
    calledCount: calledNumbers.length,
    hasWin: winCheck.hasWin,
    isClose,
    showWinButton,
    canMark
  });

  // Convert card to array for rendering
  const cardArray: (number | 'WILD')[][] = [];
  for (let row = 0; row < 5; row++) {
    cardArray[row] = [];
    cardArray[row][0] = card.M[row]; // M column
    cardArray[row][1] = card.Y[row]; // Y column
    
    // N column - WILD in center (row 2)
    if (row === 2) {
      cardArray[row][2] = 'WILD';
    } else {
      const nIndex = row < 2 ? row : row - 1;
      cardArray[row][2] = card.N[nIndex];
    }
    
    cardArray[row][3] = card.G[row]; // G column
    cardArray[row][4] = card.O[row]; // O column
  }

  const handleCellClick = (cell: number | 'WILD') => {
    if (cell === 'WILD' || !canMark) return;
    
    const number = cell as number;
    if (!calledSet.has(number)) return; // Can only mark called numbers
    
    if (markedSet.has(number)) return; // Already marked
    
    onMarkNumber(number);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* MYNGO Win Button - Shows when player has winning pattern */}
      {winCheck.hasWin && showWinButton && (
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl">
          {console.log('🎉 Rendering MYNGO win button!')}
          <button
            onClick={onWin}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 
                       text-white font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl px-8 py-4 sm:py-6 md:py-8 rounded-xl
                       shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/50
                       animate-pulse hover:animate-none hover:scale-105
                       transition-all duration-200 ease-out
                       border-2 border-green-400/50"
          >
            🎉 MYNGO! 🎉
          </button>
          <div className="text-center mt-2">
            <p className="text-green-400 font-semibold text-sm sm:text-base">
              Click to declare your win!
            </p>
          </div>
        </div>
      )}
      
      {/* Close to win banner - only show if not winning and close */}
      {isClose && !winCheck.hasWin && (
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold text-center animate-pulse">
          So Close! 🔥
        </div>
      )}

      {/* MYNGO Card */}
      <GlassCard className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-2xl xl:max-w-4xl">
        <div className="flex flex-col items-center gap-4">
          {/* Header */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-6 text-center w-full">
            {['M', 'Y', 'N', 'G', 'O'].map((letter, index) => (
              <div 
                key={letter}
                className="h-8 sm:h-10 md:h-12 lg:h-16 xl:h-24 flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl lg:text-2xl xl:text-4xl rounded-lg"
                style={{
                  background: index === 0 ? '#8B5CF6' : 
                            index === 1 ? '#06B6D4' : 
                            index === 2 ? '#EC4899' : 
                            index === 3 ? '#10B981' : '#F59E0B'
                }}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-6 w-full">
            {cardArray.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isWild = cell === 'WILD';
                const number = cell as number;
                const isMarked = isWild || markedSet.has(number);
                const isCalled = isWild || calledSet.has(number);
                const canClick = canMark && !isWild && isCalled && !isMarked;

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(cell)}
                    disabled={!canClick}
                    className={`
                      aspect-square rounded-lg border-2 font-bold text-xs sm:text-sm md:text-base lg:text-xl xl:text-2xl
                      transition-all duration-200 ease-out
                      min-h-[40px] sm:min-h-[48px] md:min-h-[56px] lg:min-h-[72px] xl:min-h-[88px]
                      ${isMarked 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400 text-white scale-95' 
                        : isCalled
                          ? 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:scale-105 cursor-pointer'
                          : 'bg-black/30 border-white/10 text-white/50 cursor-not-allowed'
                      }
                      ${canClick ? 'hover:shadow-lg hover:shadow-purple-500/30' : ''}
                    `}
                  >
                    {isWild ? 'WILD' : number}
                  </button>
                );
              })
            )}
          </div>

          {/* Numbers marked counter */}
          <div className="text-white/70 text-sm md:text-base lg:text-lg xl:text-xl">
            {markedNumbers.length}/24 marked
          </div>
        </div>
      </GlassCard>
    </div>
  );
}