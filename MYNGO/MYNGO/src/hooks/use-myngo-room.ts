// MYNGO Room Hook - Real-time room state management with proper subscriptions
// Updated: Added active game status calculation and improved subscription cleanup

import { useEffect, useState, useRef, useMemo } from 'react';
import { SupabaseService } from '../lib/supabase-service';
import { MyngoRoom, MyngoPlayer, CalledNumber } from '../types/myngo';
import { supabase } from '../lib/supabase';

export function useMyngoRoom(roomCode: string) {
  const [room, setRoom] = useState<MyngoRoom | null>(null);
  const [players, setPlayers] = useState<MyngoPlayer[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<CalledNumber[]>([]);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [gameFinished, setGameFinished] = useState(false);
  
  // Use refs to track subscription state and prevent duplicates
  const subscriptionsRef = useRef<{
    room?: any;
    players?: any;
    numbers?: any;
    hostPresence?: any;
  }>({});
  const pageVisibleRef = useRef(true);
  const hostGracePeriodTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if we're currently initializing to prevent race conditions
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  // Calculate active game status
  const isGameActive = useMemo(() => {
    console.log('🎮 HOOK: Calculating isGameActive with:', {
      roomStatus: room?.status,
      hostDisconnected,
      roomConfigPaused: room?.config?.isPaused,
      autoCallEnabled: room?.config?.autoCall?.enabled,
      calledNumbersCount: calledNumbers.length,
      roomUpdatedAt: room?.updated_at
    });
    
    // If game is finished or cancelled, it's not active
    if (room?.status === 'finished' || room?.status === 'cancelled') {
      console.log('🎮 HOOK: Game not active - status is:', room.status);
      return false;
    }
    
    if (hostDisconnected) return false;
    if (room?.config?.isPaused) return false;
    
    // If auto-call is enabled and not paused, game is active
    if (room?.config?.autoCall?.enabled && !room?.config?.isPaused) {
      console.log('🎮 HOOK: Game active - auto-call enabled');
      return true;
    }
    
    // Check for recent manual calls (last 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const hasRecentCalls = calledNumbers.some(num => 
      new Date(num.called_at).getTime() > tenMinutesAgo
    );
    if (hasRecentCalls) {
      console.log('🎮 HOOK: Game active - recent manual calls');
      return true;
    }
    
    // Check database heartbeat (last 60 seconds)
    const sixtySecondsAgo = Date.now() - (60 * 1000);
    const hasRecentHeartbeat = room?.updated_at && 
      new Date(room.updated_at).getTime() > sixtySecondsAgo;
    if (hasRecentHeartbeat) {
      console.log('🎮 HOOK: Game active - recent heartbeat');
      return true;
    }
    
    console.log('🎮 HOOK: Game not active');
    return false;
  }, [room, calledNumbers, hostDisconnected]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Set up page visibility tracking for cleanup
    const handleVisibilityChange = () => {
      pageVisibleRef.current = !document.hidden;
      console.log('👁️ Page visibility changed:', pageVisibleRef.current ? 'visible' : 'hidden');
    };
    
    const handleBeforeUnload = () => {
      console.log('🚪 Page unloading - player may be leaving via browser navigation');
      pageVisibleRef.current = false;
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    console.log(`🚀 useMyngoRoom hook initialized for room: ${roomCode}`);
    
    if (!roomCode) {
      setLoading(false);
      setError('No room code provided');
      return;
    }

    // Prevent multiple simultaneous initializations
    if (initializingRef.current) {
      console.log('🔄 Already initializing, skipping duplicate initialization');
      return;
    }

    const initializeRoom = async () => {
      try {
        initializingRef.current = true;
        console.log(`🔍 Initializing room: ${roomCode}`);
        setLoading(true);
        setError(null);
        setIsConnected(false); // Start as disconnected until we successfully connect

        // Clean up any existing subscriptions FIRST
        console.log('🧹 Cleaning up any existing subscriptions before initialization');
        Object.values(subscriptionsRef.current).forEach(sub => {
          if (sub && typeof sub.unsubscribe === 'function') {
            try {
              console.log('🧹 Unsubscribing existing subscription');
              sub.unsubscribe();
            } catch (error) {
              console.error('❌ Error cleaning up existing subscription:', error);
            }
          }
        });
        subscriptionsRef.current = {};

        // Get room data
        console.log(`📡 Fetching room data for: ${roomCode}`);
        const roomData = await SupabaseService.getRoomByCode(roomCode);
        if (!roomData) {
          console.error(`❌ Room not found: ${roomCode}`);
          setError(`Room "${roomCode}" not found. Please check the room code and try again.`);
          setLoading(false);
          setIsConnected(false);
          return;
        }

        // Check if component is still mounted
        if (!mountedRef.current) {
          console.log('🚫 Component unmounted during initialization, aborting');
          return;
        }

        // Validate room data
        if (!roomData.id || !roomData.code) {
          console.error(`❌ Invalid room data:`, roomData);
          setError('Invalid room data received. Please try again.');
          setLoading(false);
          setIsConnected(false);
          return;
        }

        console.log(`✅ Room found:`, roomData);
        setRoom(roomData);

        // Get initial data
        console.log(`📡 Fetching initial data for room: ${roomData.id}`);
        const [playersData, numbersData] = await Promise.all([
          SupabaseService.getPlayersInRoom(roomData.id),
          SupabaseService.getCalledNumbers(roomData.id)
        ]);

        // Check if component is still mounted
        if (!mountedRef.current) {
          console.log('🚫 Component unmounted during data fetch, aborting');
          return;
        }

        console.log(`👥 Initial players:`, playersData);
        console.log(`🎱 Initial called numbers:`, numbersData);
        setPlayers(playersData);
        setCalledNumbers(numbersData);

        // Set up real-time subscriptions with proper error handling
        console.log(`🔄 Setting up real-time subscriptions for room: ${roomData.id}`);
        
        try {
          // Room subscription
          console.log('🏠 Setting up room subscription');
          subscriptionsRef.current.room = SupabaseService.subscribeToRoom(roomData.id, (payload) => {
            if (!mountedRef.current) return;
            
            console.log('🏠 Room update in hook:', payload);
            if (payload.eventType === 'UPDATE') {
              console.log('🏠 Room status updated to:', payload.new.status);
              console.log('🏠 Room config updated:', payload.new.config);
              
              // Track if game is finished to preserve state
              if (payload.new.status === 'finished') {
                console.log('🏁 Game finished - preserving state for persistence');
                setGameFinished(true);
              }
              
              // If room was cancelled, log the reason
              if (payload.new.status === 'cancelled') {
                console.log('🚫 URGENT: Room cancelled - players should see cancellation modal IMMEDIATELY');
                console.log('🚫 Room cancellation payload:', payload.new);
                
                // Force immediate UI update for cancellation
                setRoom(payload.new);
                
                // Additional logging for debugging
                console.log('🚫 Room cancellation detected - UI should update now');
                console.log('🚫 New room status:', payload.new.status);
                
                return; // Early return to ensure immediate processing
              }
              
              // Log config changes for debugging
              if (payload.new.config) {
                console.log('🏠 Room config change detected:', {
                  autoCallEnabled: payload.new.config.autoCall?.enabled,
                  isPaused: payload.new.config.isPaused,
                  callFrequency: payload.new.config.callFrequency
                });
              }
              
              setRoom(payload.new);
            }
          });

          if (!mountedRef.current) return;

          // Players subscription
          console.log('👥 Setting up players subscription');
          subscriptionsRef.current.players = SupabaseService.subscribeToPlayers(roomData.id, (payload) => {
            if (!mountedRef.current) return;
            
            console.log('👥 Players update in hook:', payload);
            console.log('👥 Players update - Event Type:', payload.eventType);
            console.log('👥 Players update - New Data:', payload.new?.name || 'N/A', 'Marked:', payload.new?.marked_numbers?.length || 0);
            console.log('👥 Players update - Old Data:', payload.old?.name || 'N/A');
            
            if (payload.eventType === 'INSERT') {
              console.log('➕ Adding new player:', payload.new);
              setPlayers(prev => {
                // Check if player already exists to prevent duplicates
                const exists = prev.find(p => p.id === payload.new.id);
                if (exists) {
                  console.log('➕ Player already exists, skipping duplicate');
                  return prev;
                }
                console.log('➕ Adding new player to state');
                return [...prev, payload.new];
              });
              console.log('➕ Players state after INSERT should be updated');
            } else if (payload.eventType === 'UPDATE') {
              console.log('🔄 Updating player:', payload.new);
              console.log('🔄 Player ID being updated:', payload.new.id);
              console.log('🔄 Player marked numbers updated:', payload.new.marked_numbers?.length || 0);
              setPlayers(prev => {
                const updated = prev.map(p => 
                  p.id === payload.new.id ? payload.new : p
                );
                console.log('🔄 Player updated in state, new marked count for', payload.new.name, ':', payload.new.marked_numbers?.length || 0);
                return updated;
              });
              console.log('🔄 Players state after UPDATE should be updated');
            } else if (payload.eventType === 'DELETE') {
              console.log('➖ Removing player:', payload.old);
              console.log('➖ Player ID being removed:', payload.old.id);
              setPlayers(prev => {
                const beforeCount = prev.length;
                const filtered = prev.filter(p => p.id !== payload.old.id);
                const afterCount = filtered.length;
                console.log(`➖ Players count: ${beforeCount} -> ${afterCount}`);
                console.log('➖ Removed player from state');
                return filtered;
              });
              console.log('➖ Players state after DELETE should be updated');
            }
          });

          if (!mountedRef.current) return;

          // Called numbers subscription
          console.log('🎱 Setting up called numbers subscription');
          subscriptionsRef.current.numbers = SupabaseService.subscribeToCalledNumbers(roomData.id, (payload) => {
            if (!mountedRef.current) return;
            
            console.log('🎱 Called numbers update in hook:', payload);
            console.log('🎱 Called numbers - Event Type:', payload.eventType);
            console.log('🎱 Called numbers - New Data:', payload.new);
            
            if (payload.eventType === 'INSERT') {
              console.log('🎯 New number called:', payload.new);
              console.log('🎯 Number details - Letter:', payload.new.letter, 'Number:', payload.new.number);
              setCalledNumbers(prev => [payload.new, ...prev]);
              console.log('🎯 Called numbers state after INSERT should be updated');
            }
          });

          if (!mountedRef.current) return;

          console.log('✅ HOOK: All subscriptions set up successfully');
          
          // Set up host presence tracking if we have room and host info
          if (roomData.host_id) {
            console.log('👁️ HOOK: Host presence tracking disabled for MVP demo');
            // Host presence tracking disabled for MVP demo
            // try {
            //   subscriptionsRef.current.hostPresence = SupabaseService.subscribeToHostPresence(
            //     roomData.id,
            //     roomData.host_id,
            //     () => {
            //       console.log('🚫 HOOK: Host presence leave event detected, starting grace period');
            //       if (mountedRef.current) {
            //         setHostDisconnected(true);
            //         // Grace period logic disabled for MVP
            //       }
            //     }
            //   );
            //   console.log('✅ HOOK: Host presence tracking set up successfully');
            // } catch (presenceError) {
            //   console.error('❌ HOOK: Failed to set up host presence tracking:', presenceError);
            // }
          }
          
          setIsConnected(true);
          setLoading(false);
        } catch (subscriptionError) {
          console.error('❌ HOOK: Failed to set up subscriptions:', subscriptionError);
          setError('Failed to set up real-time connections. Please refresh the page.');
          setIsConnected(false);
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Failed to initialize room:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room. Please check your internet connection and try again.';
        console.error('❌ Detailed error:', errorMessage);
        setError(errorMessage);
        setIsConnected(false);
        setLoading(false);
      } finally {
        initializingRef.current = false;
      }
    };

    initializeRoom();

    // Cleanup subscriptions
    return () => {
      console.log('🧹 HOOK: Cleaning up subscriptions');
      initializingRef.current = false;
      setIsConnected(false);
      
      // Clear grace period timeout
      if (hostGracePeriodTimeoutRef.current) {
        clearTimeout(hostGracePeriodTimeoutRef.current);
        hostGracePeriodTimeoutRef.current = null;
      }
      
      if (subscriptionsRef.current.room) {
        console.log('🏠 HOOK: Unsubscribing from room updates');
        try {
          subscriptionsRef.current.room.unsubscribe();
        } catch (error) {
          console.error('❌ HOOK: Error unsubscribing from room:', error);
        }
      }
      if (subscriptionsRef.current.players) {
        console.log('👥 HOOK: Unsubscribing from players updates');
        try {
          subscriptionsRef.current.players.unsubscribe();
        } catch (error) {
          console.error('❌ HOOK: Error unsubscribing from players:', error);
        }
      }
      if (subscriptionsRef.current.numbers) {
        console.log('🎱 HOOK: Unsubscribing from numbers updates');
        try {
          subscriptionsRef.current.numbers.unsubscribe();
        } catch (error) {
          console.error('❌ HOOK: Error unsubscribing from numbers:', error);
        }
      }
      if (subscriptionsRef.current.hostPresence) {
        console.log('👁️ HOOK: Unsubscribing from host presence updates');
        try {
          SupabaseService.untrackPlayerPresence(subscriptionsRef.current.hostPresence, room?.host_id || 'unknown');
        } catch (error) {
          console.error('❌ HOOK: Error unsubscribing from host presence:', error);
        }
      }
      
      subscriptionsRef.current = {};
    };
  }, [roomCode]);
  
  // Handle page visibility changes for host presence re-tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && room?.id && room?.host_id) {
        console.log('👁️ HOOK: Page visible again, updating host activity and re-tracking presence');
        
        // Reset host disconnected state since host is back
        setHostDisconnected(false);
        
        // Clear any existing grace period timeout
        if (hostGracePeriodTimeoutRef.current) {
          clearTimeout(hostGracePeriodTimeoutRef.current);
          hostGracePeriodTimeoutRef.current = null;
        }
        
        // Update host activity in database
        SupabaseService.updateHostActivity(room.id).catch(error => {
          console.error('❌ HOOK: Failed to update host activity on visibility change:', error);
        });
        
        // Re-track presence if channel exists
        if (subscriptionsRef.current.hostPresence) {
          subscriptionsRef.current.hostPresence.track({
            user_id: room.host_id,
            host_id: room.host_id,
            user_name: 'Host',
            role: 'host',
            online_at: new Date().toISOString()
          }).catch(error => {
            console.error('❌ HOOK: Failed to re-track host presence:', error);
          });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [room?.id, room?.host_id]);
  
  return { 
    room, 
    players, 
    calledNumbers, 
    hostDisconnected,
    isGameActive,
    gameFinished,
    loading, 
    error, 
    isConnected,
    setPlayers,
    setCalledNumbers
  };
}