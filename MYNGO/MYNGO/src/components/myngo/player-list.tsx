// Player List Component - Display of all players in the game
// Created: Real-time player list with status indicators and card preview

import React from 'react';
import { MyngoPlayer } from '../../types/myngo';
import { GlassCard } from '../ui/glass-card';
import { Users, Bot, Crown, Eye } from 'lucide-react';
import { isCloseToWin, checkWin } from '../../utils/myngo-utils';

interface PlayerListProps {
  players: MyngoPlayer[];
  calledNumbers: number[];
  onViewCard?: (player: MyngoPlayer) => void;
  className?: string;
}

export function PlayerList({ players, calledNumbers, onViewCard, className = '' }: PlayerListProps) {
  const humanPlayers = players.filter(p => !p.is_bot);
  const botPlayers = players.filter(p => p.is_bot);

  console.log('👥 PlayerList rendering with', players.length, 'total players');
  console.log('👥 Human players:', humanPlayers.length, 'Bot players:', botPlayers.length);

  const getPlayerStatus = (player: MyngoPlayer) => {
    try {
      // Only show as winner if they've actually pressed the MYNGO button
      if (player.is_winner === true) return 'winner';
      
      if (player.card && player.marked_numbers && isCloseToWin(player.card, player.marked_numbers)) {
        return 'close';
      }
      
      return 'playing';
    } catch (error) {
      console.error('Error getting player status for:', player.name, error);
      return player.is_winner ? 'winner' : 'playing';
    }
  };

  const PlayerItem = ({ player }: { player: MyngoPlayer }) => {
    const status = getPlayerStatus(player);
    const markedCount = player.marked_numbers.length;
    
    return (
      <div
        className={`
          flex items-center justify-between p-3 rounded-lg border w-full
          transition-all duration-200 ease-out
          ${status === 'winner' 
            ? 'bg-green-500/20 border-green-500/40' 
            : status === 'close'
              ? 'bg-yellow-500/20 border-yellow-500/40'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }
          ${onViewCard ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20' : ''}
        `}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🖱️ Player clicked:', player.name, 'onViewCard available:', !!onViewCard);
          console.log('🖱️ Player object:', player);
          if (onViewCard) {
            console.log('🖱️ Calling onViewCard with player:', player.name);
            onViewCard(player);
          }
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            {player.is_bot && <Bot className="w-4 h-4 text-cyan-400" />}
            {player.is_winner === true && <Crown className="w-4 h-4 text-yellow-400" />}
            <span className="text-white font-medium truncate max-w-[120px]">{player.name}</span>
          </div>
          
          {status === 'close' && (
            <span className="text-yellow-400 text-xs font-semibold animate-pulse">
              SO CLOSE!
            </span>
          )}
          
          {player.is_winner === true && (
            <span className="text-green-400 text-xs font-semibold animate-pulse">
              WINNER! 🎉
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-white/70 text-sm">
            {markedCount}/24
          </span>
          {onViewCard && (
            <Eye className="w-4 h-4 text-purple-400" />
          )}
        </div>
      </div>
    );
  };

  return (
    <GlassCard className={`p-4 h-full ${className}`}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-white/70" />
          <h3 className="text-white font-semibold">Players</h3>
          <span className="text-white/50 text-sm">({players.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 min-h-0 max-h-full">
          {/* Human Players */}
          {humanPlayers.length > 0 && (
            <div className="overflow-hidden">
              <div className="text-white/70 text-xs mb-2 uppercase tracking-wide">
                Players ({humanPlayers.length})
              </div>
              <div className="space-y-2">
                {humanPlayers.map(player => (
                  <PlayerItem key={player.id} player={player} />
                ))}
              </div>
            </div>
          )}

          {/* Bot Players */}
          {botPlayers.length > 0 && (
            <div className="overflow-hidden">
              <div className="text-white/70 text-xs mb-2 uppercase tracking-wide">
                Demo Bots ({botPlayers.length})
              </div>
              <div className="space-y-2">
                {botPlayers.map(player => (
                  <PlayerItem key={player.id} player={player} />
                ))}
              </div>
            </div>
          )}

          {players.length === 0 && (
            <div className="flex items-center justify-center text-white/50 text-sm py-8">
              No players yet
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}