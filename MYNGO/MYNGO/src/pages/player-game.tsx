// Player Game Page - Interactive MYNGO gameplay interface with real-time updates
// Updated: Removed all console.log statements for production readiness

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MyngoCard } from '../components/myngo/myngo-card';
import { CalledNumbersPanel } from '../components/myngo/called-numbers-panel';
import { GlassCard } from '../components/ui/glass-card';
import { GradientButton } from '../components/ui/gradient-button';
import { StatusBar } from '../components/ui/status-bar';
import { useMyngoRoom } from '../hooks/use-myngo-room';
import { SupabaseService } from '../lib/supabase-service';
import { checkWin } from '../utils/myngo-utils';
import { Wifi, WifiOff, Users, Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export function PlayerGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  const { room, players, calledNumbers, loading, error, isConnected, hostDisconnected, isGameActive, gameFinished } = useMyngoRoom(roomCode!);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [showMobileNumbers, setShowMobileNumbers] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [gameCancelled, setGameCancelled] = useState(false);
  const [isLeavingGame, setIsLeavingGame] = useState(false);
  const [hasSetupCleanup, setHasSetupCleanup] = useState(false);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  const [gameStats, setGameStats] = useState<any>(null);

  // Define leaveGame function early to prevent reference errors
  const leaveGame = useCallback(async () => {
    setIsLeavingGame(true);
    
    // Clean up presence tracking first
    if (presenceChannel && currentPlayer) {
      try {
        await SupabaseService.untrackPlayerPresence(presenceChannel, currentPlayer.id);
      } catch (error) {
        // Silent error handling
      }
    }
    
    if (playerId) {
      try {
        await SupabaseService.removePlayer(playerId);
      } catch (error) {
        // Silent error handling
      }
    }
    
    // Clear session storage
    if (roomCode) {
      sessionStorage.removeItem(`myngo_player_${roomCode}`);
    }
    
    navigate('/');
  }, [playerId, roomCode, navigate, presenceChannel, currentPlayer]);

  // Get or create player ID for this browser tab - only run once
  useEffect(() => {
    if (!roomCode) return;
    
    const tabPlayerId = sessionStorage.getItem(`myngo_player_${roomCode}`);
    
    if (tabPlayerId) {
      setPlayerId(tabPlayerId);
    } else {
      // Small delay before redirecting to allow for any async operations
      const timer = setTimeout(() => {
        navigate('/join');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [roomCode, navigate]);

  // Find current player based on stored player ID - memoized to prevent unnecessary recalculations
  const foundPlayer = useMemo(() => {
    if (!playerId || players.length === 0) return null;
    
    return players.find(p => p.id === playerId) || null;
  }, [playerId, players]);

  // Update current player when found player changes
  useEffect(() => {
    if (foundPlayer && (!currentPlayer || currentPlayer.id !== foundPlayer.id)) {
      setCurrentPlayer(foundPlayer);
      setMarkedNumbers(foundPlayer.marked_numbers || []);
    } else if (!foundPlayer && playerId && players.length > 0) {
      // Don't immediately redirect, wait a bit for real-time updates
      const timer = setTimeout(() => {
        const playerStillNotFound = !players.find(p => p.id === playerId);
        if (playerStillNotFound && players.length > 0) {
          sessionStorage.removeItem(`myngo_player_${roomCode}`);
          navigate('/join');
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [foundPlayer, currentPlayer, playerId, players, roomCode, navigate]);

  // Synchronize markedNumbers with currentPlayer updates from real-time subscriptions
  useEffect(() => {
    if (!currentPlayer?.marked_numbers) return;
    
    // Only update if the arrays are actually different
    const currentMarkedSet = new Set(markedNumbers);
    const playerMarkedSet = new Set(currentPlayer.marked_numbers);
    
    const isDifferent = currentMarkedSet.size !== playerMarkedSet.size || 
      [...currentMarkedSet].some(num => !playerMarkedSet.has(num)) ||
      [...playerMarkedSet].some(num => !currentMarkedSet.has(num));
    
    if (isDifferent) {
      setMarkedNumbers(currentPlayer.marked_numbers);
    }
  }, [currentPlayer?.marked_numbers, currentPlayer?.id]);

  // Check for win whenever marked numbers change - use callback to prevent recreation
  const checkForWin = useCallback(() => {
    if (!currentPlayer?.card || markedNumbers.length === 0) return;
    
    try {
      const winCheck = checkWin(currentPlayer.card, markedNumbers);
      
      if (winCheck.hasWin && !hasWon) {
        setHasWon(true);
      }
    } catch (error) {
      // Silent error handling
    }
  }, [currentPlayer?.card, currentPlayer?.name, markedNumbers, hasWon]);

  useEffect(() => {
    checkForWin();
  }, [checkForWin]);

  // Set up browser navigation cleanup - only once per session
  useEffect(() => {
    if (!playerId || !roomCode || hasSetupCleanup) return;
    
    setHasSetupCleanup(true);
    
    const handleBeforeUnload = () => {
      // Use sendBeacon for more reliable cleanup on page unload
      if (navigator.sendBeacon && playerId) {
        const formData = new FormData();
        formData.append('action', 'remove_player');
        formData.append('playerId', playerId);
        navigator.sendBeacon('/cleanup', formData);
      }
      
      // Also try direct cleanup (may not complete before page unloads)
      try {
        SupabaseService.removePlayer(playerId).catch(() => {});
      } catch (error) {
        // Silent error handling
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Set a timer to clean up if page stays hidden
        setTimeout(() => {
          if (document.hidden && playerId) {
            SupabaseService.removePlayer(playerId).catch(() => {});
          }
        }, 30000); // 30 second delay
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playerId, roomCode, hasSetupCleanup]);

  // Set up player presence tracking
  useEffect(() => {
    if (!currentPlayer || !room?.id || presenceChannel) return;
    
    const setupPresence = async () => {
      try {
        const channel = await SupabaseService.trackPlayerPresence(
          room.id,
          currentPlayer.id,
          currentPlayer.name
        );
        
        setPresenceChannel(channel);
      } catch (error) {
        // Silent error handling
      }
    };
    
    setupPresence();
    
    return () => {
      if (presenceChannel && currentPlayer) {
        SupabaseService.untrackPlayerPresence(presenceChannel, currentPlayer.id).catch(() => {});
      }
    };
  }, [currentPlayer?.id, room?.id]);

  // Check if game was cancelled
  useEffect(() => {
    // Only show cancellation modal for actual cancellations, not finished games
    if (room?.status === 'cancelled' && !gameFinished && !gameCancelled && !isLeavingGame) {
      setGameCancelled(true);
    }
    
    // Also check for host disconnection
    if (hostDisconnected && !gameFinished && !gameCancelled && !isLeavingGame) {
      setGameCancelled(true);
    }
  }, [room?.status, gameFinished, hostDisconnected, gameCancelled, isLeavingGame]);

  const handleMarkNumber = useCallback((number: number) => {
    if (markedNumbers.includes(number)) return;
    if (!currentPlayer) return;
    
    const newMarkedNumbers = [...markedNumbers, number];
    setMarkedNumbers(newMarkedNumbers);
    
    // Update player in Supabase
    try {
      SupabaseService.updatePlayerMarkedNumbers(currentPlayer.id, newMarkedNumbers);
    } catch (error) {
      // Silent error handling
    }
  }, [markedNumbers, currentPlayer]);

  const handleWin = useCallback(async () => {
    if (!currentPlayer) return;

    // Celebrate with confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    try {
      // Mark player as winner in Supabase
      await SupabaseService.markPlayerAsWinner(currentPlayer.id, room?.id || '');
      
      // Don't auto-navigate after winning - let players stay and see the celebration
    } catch (error) {
      // Silent error handling
    }
  }, [currentPlayer, navigate]);

  // Find winner - memoized to prevent unnecessary recalculations
  const winner = useMemo(() => {
    const winnerPlayer = players.find(p => p.is_winner === true);
    return winnerPlayer;
  }, [players]);

  const isCurrentPlayerWinner = useMemo(() => {
    const isWinner = currentPlayer && (currentPlayer.is_winner === true || hasWon);
    return isWinner;
  }, [currentPlayer, hasWon]);

  // Check for any winner in the game - memoized to prevent unnecessary recalculations
  const gameHasWinner = useMemo(() => {
    const hasWinner = players.some(p => p.is_winner === true);
    return hasWinner;
  }, [players]);

  // Game Cancelled Modal
  const GameCancelledModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Game Cancelled
          </h2>
          <p className="text-white/70 text-lg">
            {hostDisconnected ? 'The host has disconnected.' : 'The host has left the game.'}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm">
              {hostDisconnected ? 'The host has lost connection. The game has been cancelled.' : 'The host has disconnected or ended the game.'} Thank you for playing MYNGO!
            </p>
          </div>
          
          <GradientButton
            variant="red"
            size="lg"
            onClick={leaveGame}
            className="w-full"
          >
            Return to Home
          </GradientButton>
        </div>
      </GlassCard>
    </div>
  );

  // Winner Announcement Component
  const WinnerAnnouncement = () => {
    if (!gameHasWinner) return null;

    // Get game stats for winner banner
    const ballsCalledCount = calledNumbers.length;

    return (
      <div className="mb-6">
        {isCurrentPlayerWinner ? (
          <GlassCard className="p-8 bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-500/50 shadow-2xl shadow-green-500/20">
            <div className="text-center">
              <div className="animate-bounce mb-4">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4 animate-pulse">
                🎉 Congratulations {currentPlayer?.name} YOU WIN! 🎉
              </h2>
              <div className="text-white/70 text-xl font-mono tracking-wider mb-4">
                Room: {room?.code}
              </div>
              
              {/* Game Statistics */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-4 mb-6">
                <h3 className="text-white font-semibold mb-3 text-center">Game Statistics</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-white/70">Players</div>
                    <div className="text-white font-bold text-xl">{players.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/70">Numbers Called</div>
                    <div className="text-white font-bold text-xl">{calledNumbers.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/70">Duration</div>
                    <div className="text-white font-bold text-xl">
                      {room?.created_at ? Math.round((Date.now() - new Date(room.created_at).getTime()) / (1000 * 60)) : 0} min
                    </div>
                  </div>
                </div>
              </div>
              
              <GradientButton
                variant="cyan"
                size="lg"
                onClick={leaveGame}
                className="w-full max-w-xs"
              >
                Leave Game
              </GradientButton>
            </div>
          </GlassCard>
        ) : winner ? (
          <GlassCard className="p-6 bg-gradient-to-r from-gray-600/20 to-gray-700/20 border-gray-500/30">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-300 mb-2">
                🎉 {winner.name} Wins! 🎉
              </h3>
              <div className="text-white/70 text-xl font-mono tracking-wider mb-4">
                Room: {room?.code}
              </div>
              
              {/* Game Statistics */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-4 mb-6">
                <h3 className="text-white font-semibold mb-3 text-center">Game Statistics</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-white/70">Players</div>
                    <div className="text-white font-bold text-lg">{players.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/70">Numbers Called</div>
                    <div className="text-white font-bold text-lg">{calledNumbers.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/70">Duration</div>
                    <div className="text-white font-bold text-lg">
                      {room?.created_at ? Math.round((Date.now() - new Date(room.created_at).getTime()) / (1000 * 60)) : 0} min
                    </div>
                  </div>
                </div>
              </div>
              
              <GradientButton
                variant="cyan"
                size="lg"
                onClick={leaveGame}
                className="w-full max-w-xs"
              >
                Leave Game
              </GradientButton>
            </div>
          </GlassCard>
        ) : null}
      </div>
    );
  };

  // Trigger confetti when current player wins - only once
  useEffect(() => {
    if (isCurrentPlayerWinner && !confettiTriggered) {
      setConfettiTriggered(true);
      
      // Confetti for the actual winner
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B']
      });
      
      // Additional confetti bursts
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.7 }
        });
      }, 500);
    }
  }, [isCurrentPlayerWinner, confettiTriggered]);

  // Trigger confetti when any player wins (for non-winners to see celebration)
  useEffect(() => {
    if (gameHasWinner && !isCurrentPlayerWinner && !confettiTriggered) {
      setConfettiTriggered(true);
      
      // Smaller confetti for non-winners
      confetti({
        particleCount: 75,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#8B5CF6', '#EC4899', '#06B6D4']
      });
    }
  }, [gameHasWinner, isCurrentPlayerWinner, confettiTriggered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-cyan-800 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading game...</p>
          <p className="text-white/60 text-sm mt-2">Room: {roomCode}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-cyan-800 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-red-400 mb-4">Failed to connect to game</p>
          <p className="text-white/60 text-sm mb-4">{error}</p>
          <GradientButton onClick={leaveGame}>
            Back to Home
          </GradientButton>
        </div>
      </div>
    );
  }

  // If no current player yet, show loading
  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-cyan-800 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-lg">Loading your game...</p>
            <p className="text-white/60 text-sm mt-2">
              {playerId ? 'Finding your player data...' : 'Checking session...'}
            </p>
          </div>
          <div className="mt-4">
            <GradientButton onClick={() => navigate('/join')}>
              Back to Join
            </GradientButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-cyan-800 to-purple-900 p-4">
      {/* Top Bar - Desktop */}
      <div className="hidden md:flex items-center justify-between mb-6 bg-black/30 backdrop-blur-sm rounded-xl p-4">
        {/* Left: Leave Game */}
        <GradientButton
          variant="red"
          size="sm"
          onClick={leaveGame}
        >
          Leave Game
        </GradientButton>

        {/* Center: Welcome */}
        <div className="text-center">
          <div className="text-white/70 text-base font-medium">Welcome</div>
          <div className="text-white font-bold text-2xl leading-tight">
            {currentPlayer.name}
          </div>
          <div className="text-white/60 text-sm font-mono tracking-wider">
            Game: {room?.code}
          </div>
        </div>

        {/* Right: Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <span className="text-white/70 text-sm">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white/70" />
            <span className="text-white/70 text-sm">{players.length}</span>
          </div>
        </div>
      </div>

      {/* Top Bar - Mobile */}
      <div className="md:hidden mb-6 space-y-4">
        {/* Header Section */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <GradientButton
              variant="red"
              size="sm"
              onClick={leaveGame}
            >
              Leave
            </GradientButton>
            
            <div className="text-center">
              <div className="text-white/70 text-sm font-medium">Welcome</div>
              <div className="text-white font-bold text-lg leading-tight break-words max-w-[150px]">
                {currentPlayer.name}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">{players.length}</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-white/60 text-xs font-mono tracking-wider">
              Game: {room?.code}
            </div>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3">
          <div className="flex items-center justify-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-white/70 text-sm">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Winner Announcement */}
      <WinnerAnnouncement />

      {/* Status Bar */}
      <div className="mb-6">
        <StatusBar 
          isGameActive={isGameActive}
          isAutoCalling={room?.config?.autoCall?.enabled ?? false}
          autoCallFrequency={room?.config?.callFrequency}
          isHostDisconnected={gameCancelled || hostDisconnected}
          isHostPaused={room?.config?.isPaused ?? false}
          roomStatus={room?.status}
          hasWinner={gameHasWinner}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* MYNGO Card - Main Area */}
        <div className="lg:col-span-3 flex justify-center">
          <div className="flex flex-col items-center w-full">
            <MyngoCard
              card={currentPlayer.card}
              markedNumbers={markedNumbers}
              calledNumbers={calledNumbers.map(c => c.number)}
              onMarkNumber={handleMarkNumber}
              canMark={!gameHasWinner}
              showWinButton={hasWon && !gameHasWinner}
              onWin={handleWin}
            />

            {/* Mobile: Show Numbers Button */}
            <div className="lg:hidden mt-6">
              <GradientButton
                variant="cyan"
                size="md"
                onClick={() => setShowMobileNumbers(true)}
              >
                View Called Numbers ({calledNumbers.length})
              </GradientButton>
            </div>
          </div>
        </div>

        {/* Called Numbers Panel - Desktop */}
        <div className="hidden lg:block">
          <CalledNumbersPanel
            calledNumbers={calledNumbers}
            playerCard={currentPlayer.card}
            markedNumbers={markedNumbers}
            className="h-full"
          />
        </div>
      </div>

      {/* Mobile: Called Numbers Bottom Sheet */}
      {showMobileNumbers && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50 lg:hidden">
          <div className="w-full bg-[#13131A] rounded-t-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Called Numbers</h3>
                <button
                  onClick={() => setShowMobileNumbers(false)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto">
              <CalledNumbersPanel
                calledNumbers={calledNumbers}
                playerCard={currentPlayer.card}
                markedNumbers={markedNumbers}
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Cancelled Modal */}
      {(gameCancelled || hostDisconnected) && <GameCancelledModal />}

      {/* Powered By Footer */}
      <div className="flex flex-col items-center gap-4 mt-16">
        <img 
          src="/poweredby.png" 
          alt="Powered by Bolt" 
          className="h-8 opacity-90 hover:opacity-100 transition-opacity duration-200"
        />
      </div>
    </div>
  );
}