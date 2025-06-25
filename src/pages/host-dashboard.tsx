// Host Dashboard - Complete game control interface with real-time management
// Updated: Removed all console.log statements for production readiness

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/glass-card';
import { GradientButton } from '../components/ui/gradient-button';
import { StatusBar } from '../components/ui/status-bar';
import { PlayerList } from '../components/myngo/player-list';
import { MyngoCard } from '../components/myngo/myngo-card';
import { CalledNumbersPanel } from '../components/myngo/called-numbers-panel';
import { useMyngoRoom } from '../hooks/use-myngo-room';
import { SupabaseService } from '../lib/supabase-service';
import { getLetterForNumber, formatCalledNumber, isCloseToWin, checkWin, getAvailableNumbers } from '../utils/myngo-utils';
import { 
  Users, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw,
  X,
  Copy,
  Check,
  Settings,
  Crown,
  AlertTriangle,
  Eye,
  ArrowLeft,
  Zap,
  Clock,
  Trophy,
  BarChart3
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function HostDashboard() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  // ALL HOOKS MUST BE DECLARED FIRST - BEFORE ANY CONDITIONAL LOGIC OR RETURNS
  
  // State hooks
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoInterval, setAutoInterval] = useState(20);
  const [isPaused, setIsPaused] = useState(false);
  const [roomOpen, setRoomOpen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hostPresenceChannel, setHostPresenceChannel] = useState<any>(null);

  // Ref hooks
  const isUpdatingConfigRef = useRef(false);
  const lastConfigUpdateRef = useRef<string>('');
  const roomOpenInitializedRef = useRef(false);
  const autoModeInitializedRef = useRef(false);

  // Custom hook - this must be called before any conditional returns
  const { room, players, calledNumbers, loading, error, isConnected, hostDisconnected, isGameActive, setPlayers, setCalledNumbers } = useMyngoRoom(roomCode!);

  // Computed values - memoized and declared early to prevent ReferenceError
  const nearWinPlayers = useMemo(() => {
    return players.filter(player => {
      try {
        if (!player.card || !player.marked_numbers) return false;
        return isCloseToWin(player.card, player.marked_numbers);
      } catch (error) {
        return false;
      }
    });
  }, [players]);

  // Only show winners who have actually pressed their MYNGO button - memoized
  const winnerPlayers = useMemo(() => {
    return players.filter(player => player.is_winner === true);
  }, [players]);

  // Helper functions that use state
  const availableNumbers = getAvailableNumbers(calledNumbers);

  // All useEffect hooks
  
  // Verify host session
  useEffect(() => {
    if (!roomCode) {
      setInitializationError('No room code provided');
      return;
    }
  }, [roomCode]);

  // Enhanced room state monitoring
  useEffect(() => {
    if (error && !loading) {
      setInitializationError(error);
    } else if (room && room.code === roomCode && !loading) {
      setInitializationError(null);
    }
  }, [room?.code, loading, error, roomCode]);

  // Monitor player changes
  useEffect(() => {
    const humanPlayers = players.filter(p => !p.is_bot);
    const botPlayers = players.filter(p => p.is_bot);
  }, [players]);

  // Monitor called numbers changes
  useEffect(() => {
    // Silent monitoring
  }, [calledNumbers]);

  // Force refresh data periodically
  useEffect(() => {
    if (!room?.id) return;

    const performRefresh = async () => {
      try {
        // Clean up stale players first
        await SupabaseService.cleanupStalePlayersInRoom(room.id);
        
        // Then get fresh data
        const [freshPlayers, freshNumbers] = await Promise.all([
          SupabaseService.getPlayersInRoom(room.id),
          SupabaseService.getCalledNumbers(room.id)
        ]);
        
        // Update players if data changed
        const playersChanged = JSON.stringify(freshPlayers.map(p => ({ id: p.id, name: p.name, marked: p.marked_numbers?.length }))) !== 
                              JSON.stringify(players.map(p => ({ id: p.id, name: p.name, marked: p.marked_numbers?.length })));
        
        if (playersChanged) {
          setPlayers(freshPlayers);
        }
        
        // Update called numbers if data changed
        const numbersChanged = freshNumbers.length !== calledNumbers.length ||
                              (freshNumbers.length > 0 && calledNumbers.length > 0 && 
                               freshNumbers[0].id !== calledNumbers[0].id);
        
        if (numbersChanged) {
          setCalledNumbers(freshNumbers);
        }
      } catch (error) {
        // Silent error handling
      }
    };

    // Set up periodic refresh every 15 seconds
    const refreshInterval = setInterval(performRefresh, 15000);

    return () => clearInterval(refreshInterval);
  }, [room?.id]); // Only depend on room.id

  // Set up host presence tracking
  useEffect(() => {
    if (!room?.id || !room.host_id || hostPresenceChannel) return;
    
    const setupHostPresence = async () => {
      try {
        const channel = await SupabaseService.trackPlayerPresence(
          room.id,
          room.host_id,
          'Host'
        );
        setHostPresenceChannel(channel);
      } catch (error) {
        // Silent error handling
      }
    };
    
    setupHostPresence();
    
    return () => {
      // Cleanup will be handled in the beforeunload effect
    };
  }, [room?.id, room?.host_id]);

  // Set up host presence heartbeat
  useEffect(() => {
    if (!room?.id) return;

    // Update host activity every 15 seconds (more frequent to prevent false timeouts)
    const heartbeatInterval = setInterval(async () => {
      try {
        await SupabaseService.updateHostActivity(room.id);
      } catch (error) {
        // Silent error handling
      }
    }, 15000); // Every 15 seconds instead of 30

    // Also update on user activity (mouse move, key press, etc.)
    const updateOnActivity = () => {
      SupabaseService.updateHostActivity(room.id).catch(() => {});
    };

    // Throttle activity updates to avoid too many requests
    let activityTimeout: NodeJS.Timeout;
    const throttledActivityUpdate = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(updateOnActivity, 2000); // Update at most every 2 seconds (more responsive)
    };

    window.addEventListener('mousemove', throttledActivityUpdate);
    window.addEventListener('keydown', throttledActivityUpdate);
    window.addEventListener('click', throttledActivityUpdate);

    // Send initial heartbeat immediately
    updateOnActivity();
    return () => {
      clearInterval(heartbeatInterval);
      clearTimeout(activityTimeout);
      window.removeEventListener('mousemove', throttledActivityUpdate);
      window.removeEventListener('keydown', throttledActivityUpdate);
      window.removeEventListener('click', throttledActivityUpdate);
    };
  }, [room?.id]);

  // Handle host cleanup when leaving
  useEffect(() => {
    if (!room?.id) return;

    const handleBeforeUnload = () => {
      // Clean up host presence first
      if (hostPresenceChannel && room?.host_id) {
        SupabaseService.untrackPlayerPresence(hostPresenceChannel, room.host_id);
      }
      
      try {
        // Use sendBeacon for more reliable cleanup on page unload
        if (navigator.sendBeacon) {
          const formData = new FormData();
          formData.append('action', 'cancel_game');
          formData.append('roomId', room.id);
          navigator.sendBeacon('/cleanup', formData);
        }
        
        // Also try direct cancellation (may not complete before page unloads)
        SupabaseService.updateRoomStatus(room.id, 'cancelled').catch(() => {});
      } catch (error) {
        // Silent error handling
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't immediately cancel, let the heartbeat timeout handle it
        // This gives the host a chance to come back (e.g., switching tabs)
      } else {
        SupabaseService.updateHostActivity(room.id).catch(() => {});
      }
    };

    // Also clean up presence when component unmounts
    const cleanup = () => {
      if (hostPresenceChannel && room?.host_id) {
        SupabaseService.untrackPlayerPresence(hostPresenceChannel, room.host_id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [room?.id, hostPresenceChannel, room?.host_id]);

  // Initialize roomOpen state from room config when room loads - ONLY ONCE
  useEffect(() => {
    if (room?.config && !roomOpenInitializedRef.current) {
      const shouldBeOpen = !room.config.roomClosed;
      
      // Only update if different from current state to prevent loops
      if (roomOpen !== shouldBeOpen) {
        setRoomOpen(shouldBeOpen);
      }
      
      // Initialize auto-call settings from room config
      if (room.config.autoCall?.enabled !== undefined) {
        if (isAutoMode !== room.config.autoCall.enabled) {
          setIsAutoMode(room.config.autoCall.enabled);
        }
      }
      
      if (room.config.isPaused !== undefined) {
        if (isPaused !== room.config.isPaused) {
          setIsPaused(room.config.isPaused);
        }
      }
      
      if (room.config.callFrequency !== undefined) {
        if (autoInterval !== room.config.callFrequency) {
          setAutoInterval(room.config.callFrequency);
        }
      }
      
      roomOpenInitializedRef.current = true;
    }
  }, [room?.config, roomOpen, isAutoMode, isPaused, autoInterval]);

  // Continuously sync local states with room config changes
  useEffect(() => {
    if (!room?.config || !roomOpenInitializedRef.current) return;
    
    // Sync roomOpen state
    const shouldBeOpen = !room.config.roomClosed;
    if (roomOpen !== shouldBeOpen) {
      setRoomOpen(shouldBeOpen);
    }
    
    // Sync auto mode state
    if (room.config.autoCall?.enabled !== undefined && isAutoMode !== room.config.autoCall.enabled) {
      setIsAutoMode(room.config.autoCall.enabled);
    }
    
    // Sync pause state
    if (room.config.isPaused !== undefined && isPaused !== room.config.isPaused) {
      setIsPaused(room.config.isPaused);
    }
    
    // Sync call frequency
    if (room.config.callFrequency !== undefined && autoInterval !== room.config.callFrequency) {
      setAutoInterval(room.config.callFrequency);
    }
  }, [room?.config?.roomClosed, room?.config?.autoCall?.enabled, room?.config?.isPaused, room?.config?.callFrequency, roomOpen, isAutoMode, isPaused, autoInterval]);

  // Update room config when roomOpen changes - PREVENT LOOPS
  useEffect(() => {
    if (!room?.id || !room.config || !roomOpenInitializedRef.current) return;
    
    const configKey = `${room.id}-${roomOpen}`;
    
    // Prevent duplicate updates
    if (isUpdatingConfigRef.current || lastConfigUpdateRef.current === configKey) {
      return;
    }
    
    // Only update if the config actually changed
    const configChanged = room.config.roomClosed !== !roomOpen;
    
    if (configChanged) {
      const newConfig = {
        ...room.config,
        roomClosed: !roomOpen
      };
      
      isUpdatingConfigRef.current = true;
      lastConfigUpdateRef.current = configKey;
      
      // Update room config in Supabase
      SupabaseService.updateRoomConfig(room.id, newConfig)
        .then(() => {
          // Silent success
        })
        .catch(() => {
          // Silent error handling
        })
        .finally(() => {
          // Reset the flag after a short delay
          setTimeout(() => {
            isUpdatingConfigRef.current = false;
          }, 2000);
        });
    }
  }, [roomOpen, room?.id, room?.config?.roomClosed]);

  // Auto-call timer
  useEffect(() => {
    if (!isAutoMode || isPaused || winnerPlayers.length > 0 || availableNumbers.length === 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          callNextNumber();
          return autoInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoMode, isPaused, autoInterval, winnerPlayers.length, availableNumbers.length]);

  // Initialize countdown when auto mode starts
  useEffect(() => {
    if (isAutoMode && !isPaused && winnerPlayers.length === 0) {
      setCountdown(autoInterval);
    }
  }, [isAutoMode, isPaused, autoInterval, winnerPlayers.length]);

  // Enhanced logging for winner detection
  useEffect(() => {
    // Silent monitoring
  }, [players.length, winnerPlayers.length]); // Fixed dependencies

  // NOW ALL CONDITIONAL LOGIC AND EARLY RETURNS CAN HAPPEN AFTER ALL HOOKS

  const callNextNumber = async () => {
    if (availableNumbers.length === 0) return;
    if (!room) return;

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const number = availableNumbers[randomIndex];
    const letter = getLetterForNumber(number);

    try {
      // Call number via Supabase
      await SupabaseService.callNumber(room.id, number, letter);
      
      // Auto-mark for bots in demo mode
      if (room.config?.demoMode) {
        setTimeout(() => {
          SupabaseService.autoBotMarkNumber(room.id, number, true).catch(() => {});
        }, 500); // Reduced delay for demo mode responsiveness
      }
    } catch (error) {
      // Silent error handling
    }

    // Reset countdown for auto mode
    if (isAutoMode) {
      setCountdown(autoInterval);
    }
  };

  const toggleAutoMode = async () => {
    setIsAutoMode(!isAutoMode);
    if (!isAutoMode) {
      setCountdown(autoInterval);
    }
    
    // Update room config in Supabase
    if (room?.id) {
      const newConfig = {
        ...room.config,
        autoCall: {
          ...room.config.autoCall,
          enabled: !isAutoMode
        }
      };
      
      try {
        await SupabaseService.updateRoomConfig(room.id, newConfig);
      } catch (error) {
        console.error('Failed to update auto mode in room config:', error);
      }
    }
  };

  const togglePause = async () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      setCountdown(autoInterval);
    }
    
    // Update room config in Supabase
    if (room?.id) {
      const newConfig = {
        ...room.config,
        isPaused: !isPaused
      };
      
      try {
        await SupabaseService.updateRoomConfig(room.id, newConfig);
      } catch (error) {
        console.error('Failed to update pause status in room config:', error);
      }
    }
  };

  const copyRoomCode = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancelGame = (reason: string) => {
    if (!room) return;
    
    // Update room status in Supabase with reason - this will handle history and cleanup
    SupabaseService.updateRoomStatus(room.id, 'cancelled', reason);
    
    navigate('/');
  };

  const handleViewCard = (player: any) => {
    setViewingPlayer(player);
  };

  const closeCardView = () => {
    setViewingPlayer(null);
  };

  // Manual refresh function for the host
  const handleManualRefresh = async () => {
    if (!room?.id || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      
      // Clean up stale players
      await SupabaseService.cleanupStalePlayersInRoom(room.id);
      
      // Get fresh data
      const [freshPlayers, freshNumbers] = await Promise.all([
        SupabaseService.getPlayersInRoom(room.id),
        SupabaseService.getCalledNumbers(room.id)
      ]);
      
      setPlayers(freshPlayers);
      setCalledNumbers(freshNumbers);
      
      // Show success feedback
      setTimeout(() => setIsRefreshing(false), 1000);
    } catch (error) {
      setIsRefreshing(false);
    }
  };

  // Show loading state with more details
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-900 via-fuchsia-800 to-cyan-900 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-6"></div>
          <h2 className="text-white text-xl font-semibold mb-4">Loading Dashboard</h2>
          <div className="space-y-2 text-white/70 text-sm">
            <div>Room: {roomCode || 'Unknown'}</div>
            <div>Connecting to game room...</div>
            <div className="text-xs text-white/50 mt-4">
              This should only take a few seconds
            </div>
          </div>
          
          {/* Fallback button after 10 seconds */}
          <div className="mt-6">
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Taking too long? Click to refresh
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Show error state with more helpful information
  if (initializationError || error || (!room && !loading)) {
    const displayError = initializationError || error || 'Room not found';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-900 via-fuchsia-800 to-cyan-900 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-400" />
          </div>
          
          <h2 className="text-white text-xl font-semibold mb-4">Dashboard Error</h2>
          
          <div className="space-y-3 mb-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-300 text-sm">{displayError}</p>
            </div>
            
            <div className="text-white/60 text-sm">
              <div>Room Code: {roomCode || 'Unknown'}</div>
              <div className="text-xs text-white/40 mt-2">
                Error occurred while loading the dashboard
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <GradientButton 
              variant="purple"
              size="md"
              onClick={() => {
                window.location.reload();
              }}
              className="w-full"
            >
              Retry Dashboard
            </GradientButton>
            
            <GradientButton 
              variant="red"
              size="sm"
              onClick={() => {
                // Clear session storage
                if (roomCode) {
                  sessionStorage.removeItem(`myngo_host_${roomCode}`);
                  sessionStorage.removeItem(`myngo_host_room_id`);
                  sessionStorage.removeItem(`myngo_host_data`);
                }
                navigate('/');
              }}
              className="w-full"
            >
              Back to Home
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Final check - if we don't have a room but we're not loading and no error, something's wrong
  if (!room && !loading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-900 via-fuchsia-800 to-cyan-900 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md w-full mx-4">
          <div className="text-white">
            <h2 className="text-xl font-semibold mb-4">Loading Issue</h2>
            <p className="text-white/70 mb-6">
              The dashboard is having trouble loading. This might be a temporary connection issue.
            </p>
            <GradientButton onClick={() => window.location.reload()}>
              Refresh Page
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  const CancelModal = () => (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          setShowCancelModal(false);
        }
      }}
    >
      <GlassCard className="p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-xl">Cancel Game</h3>
          <button
            onClick={() => setShowCancelModal(false)}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-white/70 mb-6">Why are you ending the game early?</p>
        
        <div className="space-y-3 mb-6">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancelGame('Time Constraints');
            }}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-left 
                       hover:bg-white/20 hover:border-white/30 
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/20
                       active:bg-white/30 active:scale-[0.98]
                       transition-all duration-150 ease-out cursor-pointer"
          >
            <div className="font-semibold">Time Constraints</div>
            <div className="text-white/60 text-sm">Meeting ran over time</div>
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancelGame('Technical Issues');
            }}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-left 
                       hover:bg-white/20 hover:border-white/30 
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/20
                       active:bg-white/30 active:scale-[0.98]
                       transition-all duration-150 ease-out cursor-pointer"
          >
            <div className="font-semibold">Technical Issues</div>
            <div className="text-white/60 text-sm">Connection or system problems</div>
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancelGame('Testing/Demo');
            }}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-left 
                       hover:bg-white/20 hover:border-white/30 
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/20
                       active:bg-white/30 active:scale-[0.98]
                       transition-all duration-150 ease-out cursor-pointer"
          >
            <div className="font-semibold">Testing/Demo</div>
            <div className="text-white/60 text-sm">This was just a test run</div>
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancelGame('Other Reason');
            }}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-left 
                       hover:bg-white/20 hover:border-white/30 
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/20
                       active:bg-white/30 active:scale-[0.98]
                       transition-all duration-150 ease-out cursor-pointer"
          >
            <div className="font-semibold">Other Reason</div>
            <div className="text-white/60 text-sm">General cancellation</div>
          </button>
        </div>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCancelModal(false);
          }}
          className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-lg 
                     hover:bg-white/20 hover:border-white/30 
                     focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/20
                     active:bg-white/30 active:scale-[0.98]
                     transition-all duration-150 ease-out cursor-pointer font-medium"
        >
          Keep Playing
        </button>
      </GlassCard>
    </div>
  );

  // Player card view modal
  const PlayerCardModal = () => (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          closeCardView();
        }
      }}
    >
      <GlassCard className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-xl">
            {viewingPlayer?.name}'s Card
          </h3>
          <button
            onClick={closeCardView}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <MyngoCard
            card={viewingPlayer?.card}
            markedNumbers={viewingPlayer?.marked_numbers || []}
            calledNumbers={calledNumbers.map(c => c.number)}
            onMarkNumber={() => {}} // Read-only for host
            canMark={false}
          />
          
          <div className="mt-4 text-center">
            <div className="text-white/70 text-sm">
              Progress: {viewingPlayer?.marked_numbers?.length || 0}/24 marked
            </div>
            {viewingPlayer?.is_winner && (
              <div className="text-green-400 font-bold mt-2">
                🏆 WINNER! 🏆
                <div className="text-white/50 text-xs mt-1">
                  {new Date(calledNumbers[0].called_at).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* All Called Numbers - Compact List */}
            {calledNumbers.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-40 overflow-y-auto mt-4">
                <div className="text-white/70 text-sm mb-2">All Called Numbers ({calledNumbers.length})</div>
                <div className="grid grid-cols-6 gap-1 text-xs">
                  {calledNumbers.map((number, index) => (
                    <div
                      key={number.id}
                      className={`rounded px-2 py-1 text-center font-mono ${
                        index === 0 
                          ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50' 
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {formatCalledNumber(number)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-900 via-fuchsia-800 to-cyan-900 p-4">
      {/* Top Bar - Desktop */}
      <div className="hidden md:flex items-center justify-between mb-6 bg-black/30 backdrop-blur-sm rounded-xl p-4">
      

        {/* Center: Room Code */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-white/70 text-sm">Room Code</div>
            <button
              onClick={copyRoomCode}
              className="text-3xl font-bold text-white font-mono tracking-wider hover:text-purple-300 transition-colors"
            >
              {room.code}
            </button>
            {copied && (
              <div className="text-green-400 text-xs mt-1">Copied!</div>
            )}
          </div>
        </div>

        {/* Right: Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white/70" />
            <span className="text-white font-semibold">
              {players.length} players
            </span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Top Bar - Mobile */}
      <div className="md:hidden mb-6 space-y-4">
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <GradientButton
              variant="red"
              size="sm"
              onClick={() => navigate('/')}
            >
              Exit
            </GradientButton>
            
            <div className="text-center">
              <div className="text-white/70 text-sm">Room</div>
              <button
                onClick={copyRoomCode}
                className="text-xl font-bold text-white font-mono tracking-wider hover:text-purple-300 transition-colors"
              >
                {room.code}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-white text-sm">{players.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Winner Announcement */}
      {winnerPlayers.length > 0 && (
        <div className="mb-6">
          <GlassCard className="p-6 bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-500/50">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">
                🎉 The Winner is {winnerPlayers[0].name} 🎉
              </h2>
              <div className="text-white/70 text-xl font-mono tracking-wider mt-4 mb-6">
                Room: {room?.code}
              </div>
              
              {/* Game Statistics */}
              <div className="bg-white/10 border border-white/20 rounded-lg p-4 mb-6">
                <h3 className="text-white font-semibold mb-3 text-center">Game Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-white/70">Players</div>
                    <div className="text-white font-bold text-xl">{room?.config?.maxPlayersEver || players.length}</div>
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
                  <div className="text-center">
                    <div className="text-white/70">Players Dropped</div>
                    <div className="text-white font-bold text-xl">
                      {Math.max(0, (room?.config?.maxPlayersEver || players.length) - players.length)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
              
                <GradientButton
                  variant="green"
                  size="lg"
                  onClick={async () => {
                    try {
                      if (room?.id) {
                        await SupabaseService.endGame(room.id, winnerPlayers[0].name);
                      }
                      navigate('/');
                    } catch (error) {
                      navigate('/');
                    }
                  }}
                >
                  End Game & Return Home
                </GradientButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Near Win Alert */}
      {nearWinPlayers.length > 0 && winnerPlayers.length === 0 && (
        <div className="mb-6">
          <GlassCard className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <div>
                <h3 className="text-white font-semibold">Players Close to Winning!</h3>
                <p className="text-white/70 text-sm">
                  {nearWinPlayers.map(p => p.name).join(', ')} {nearWinPlayers.length === 1 ? 'is' : 'are'} one number away from MYNGO
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Status Bar */}
      <div className="mb-6">
        <StatusBar 
          isGameActive={isGameActive}
          isAutoCalling={room?.config?.autoCall?.enabled ?? false}
          autoCallFrequency={room?.config?.callFrequency}
          isHostDisconnected={hostDisconnected}
          isHostPaused={room?.config?.isPaused ?? false}
          roomStatus={room?.status}
          hasWinner={winnerPlayers.length > 0}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[calc(100vh-16rem)]">
        {/* Left Column - Game Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Number Calling Controls */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white font-semibold">Number Calling</h3>
            </div>

            {/* Auto Mode Controls */}
            <div className="space-y-4">
              {/* Manual Call Button - moved above Auto Mode */}
              <GradientButton
                variant="purple"
                size="lg"
                onClick={callNextNumber}
                disabled={availableNumbers.length === 0}
                className="w-full"
              >
                Call Next Number
              </GradientButton>

              {/* Latest Called Number - moved under Call Number button */}
              {calledNumbers.length > 0 && (
                <div className="mb-4">
                  <div className="text-white/70 text-sm mb-2 text-center">Latest Call</div>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-3 text-center">
                    <div className="text-white font-bold text-xl">
                      {formatCalledNumber(calledNumbers[0])}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-white/60 text-sm">
                {availableNumbers.length} numbers remaining
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 my-4"></div>

              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Auto Mode</span>
                <button
                  onClick={toggleAutoMode}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isAutoMode ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    isAutoMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {isAutoMode && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">
                      Interval: {autoInterval}s
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={autoInterval}
                      onChange={async (e) => {
                        const newInterval = parseInt(e.target.value);
                        setAutoInterval(newInterval);
                        
                        // Update room config in Supabase
                        if (room?.id) {
                          const newConfig = {
                            ...room.config,
                            callFrequency: newInterval
                          };
                          
                          try {
                            await SupabaseService.updateRoomConfig(room.id, newConfig);
                          } catch (error) {
                            console.error('Failed to update call frequency in room config:', error);
                          }
                        }
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <GradientButton
                      variant={isPaused ? "green" : "yellow"}
                      size="sm"
                      onClick={togglePause}
                      className="flex-1"
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </GradientButton>
                  </div>

                  {!isPaused && (
                    <div className="text-center">
                      <div className="text-white/70 text-sm">Next call in</div>
                      <div className="text-white font-bold text-xl">{countdown}s</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Game Settings */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-semibold">Game Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Room Open</span>
                <button
                  onClick={() => setRoomOpen(!roomOpen)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    roomOpen ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    roomOpen ? 'translate-x-0.5' : 'translate-x-6'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Sound</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    soundEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    soundEnabled ? 'translate-x-0.5' : 'translate-x-6'
                  }`} />
                </button>
              </div>

              <GradientButton
                variant="red"
                size="md"
                onClick={() => setShowCancelModal(true)}
                disabled={false}
                className="w-full"
              >
                Cancel Game
              </GradientButton>

              {/* Manual Refresh Button */}
              <GradientButton
                variant="cyan"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="w-full"
              >
                {isRefreshing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Refreshing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    <span>Refresh Players</span>
                  </div>
                )}
              </GradientButton>
            </div>
          </GlassCard>
        </div>

        {/* Center Column - Players */}
        <div className="lg:col-span-2 lg:min-h-0">
          <PlayerList
            players={players}
            calledNumbers={calledNumbers.map(c => c.number)}
            onViewCard={handleViewCard}
            className="h-full"
          />
        </div>

        {/* Right Column - Called Numbers */}
        <div className="lg:col-span-1 lg:min-h-0">
          <CalledNumbersPanel
            calledNumbers={calledNumbers}
            className="h-full"
          />
        </div>
      </div>

      {/* Modals */}
      {showCancelModal && <CancelModal />}
      {viewingPlayer && <PlayerCardModal />}

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