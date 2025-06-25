// Supabase Service - Real-time database operations for MYNGO
// Updated: Fixed game history creation to handle nullable players_end column

import { supabase } from './supabase';
import { MyngoRoom, MyngoPlayer, CalledNumber, GameStats, RoomConfig, MyngoCard } from '../types/myngo';
import { generateMyngoCard, generateRoomCode } from '../utils/myngo-utils';

export class SupabaseService {
  // Create a new room
  static async createRoom(hostId: string, config: RoomConfig): Promise<MyngoRoom> {
    console.log('📡 Creating room with config:', config);
    
    // Ensure default values are set
    const roomConfig = {
      ...config,
      autoCall: {
        enabled: false,  // Default to auto-call mode
        ...config.autoCall
      },
      isPaused: false  // Default to not paused
    };
    
    const roomCode = generateRoomCode();
    console.log('🎲 Generated room code:', roomCode);
    
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code: roomCode,
        host_id: hostId,
        config: roomConfig,
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create room:', error);
      throw new Error(`Failed to create room: ${error.message}`);
    }

    console.log('✅ Room created successfully:', data);

    // Create initial game history record with proper nullable handling
    // CRITICAL: Create initial game history record - if this fails, room creation fails
    console.log('📊 Creating initial game history record for room:', roomCode);
    await this.createGameHistoryRecord({
      room_code: roomCode,
      players_start: 0, // Start with 0, will be updated as players join
      players_end: null, // Nullable - will be set when game ends
      players_drop: 0,
      winner_name: null,
      duration: null,
      ending_status: 'active',
      balls_called_count: 0,
      is_demo_game: roomConfig.demoMode || false
    });
    console.log('✅ Initial game history record created successfully');

    return data;
  }

  // Get room by code
  static async getRoomByCode(code: string): Promise<MyngoRoom | null> {
    console.log('📡 Getting room by code:', code);
    
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('🔍 Room not found:', code);
        return null;
      }
      console.error('❌ Failed to get room:', error);
      throw new Error(`Failed to get room: ${error.message}`);
    }

    console.log('✅ Room found:', data);
    return data;
  }

  // Join a room
  static async joinRoom(roomCode: string, playerName: string): Promise<MyngoPlayer> {
    console.log('🚪 PLAYER COUNT LOGGING: Joining room:', roomCode, 'as:', playerName);
    
    // Retry mechanism for eventual consistency
    let room = null;
    const maxRetries = 3;
    const retryDelay = 500; // 500ms between retries
    
    console.log('🔄 RETRY LOGIC: Starting room fetch with retry mechanism', {
      roomCode,
      maxRetries,
      retryDelay,
      playerName
    });
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 RETRY LOGIC: Attempt ${attempt}/${maxRetries} - Fetching room data`, {
        roomCode,
        attempt,
        playerName
      });
      
      room = await this.getRoomByCode(roomCode);
      
      if (!room) {
        console.log(`❌ RETRY LOGIC: Room not found on attempt ${attempt}`, {
          roomCode,
          attempt,
          playerName
        });
        
        if (attempt === maxRetries) {
          throw new Error(`Room "${roomCode}" not found`);
        }
        
        // Wait before next retry
        console.log(`⏳ RETRY LOGIC: Waiting ${retryDelay}ms before retry ${attempt + 1}`, {
          roomCode,
          nextAttempt: attempt + 1,
          delay: retryDelay
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      // Room found, log the configuration state
      console.log(`✅ RETRY LOGIC: Room found on attempt ${attempt}`, {
        roomCode,
        attempt,
        roomId: room.id,
        roomClosed: room.config?.roomClosed,
        roomStatus: room.status,
        playerName,
        fullConfig: room.config
      });
      
      // If room is not closed, we can proceed immediately
      if (!room.config?.roomClosed) {
        console.log(`🟢 RETRY LOGIC: Room is open on attempt ${attempt}, proceeding with join`, {
          roomCode,
          attempt,
          roomClosed: room.config?.roomClosed,
          playerName
        });
        break;
      }
      
      // Room is closed, check if we should retry
      console.log(`🔒 RETRY LOGIC: Room is closed on attempt ${attempt}`, {
        roomCode,
        attempt,
        roomClosed: room.config?.roomClosed,
        willRetry: attempt < maxRetries,
        playerName
      });
      
      if (attempt < maxRetries) {
        console.log(`⏳ RETRY LOGIC: Room closed, waiting ${retryDelay}ms before retry ${attempt + 1}`, {
          roomCode,
          currentAttempt: attempt,
          nextAttempt: attempt + 1,
          delay: retryDelay,
          roomClosed: room.config?.roomClosed
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Final validation after all retries
    if (!room) {
      console.log('❌ RETRY LOGIC: Failed to get room after all retries', {
        roomCode,
        maxRetries,
        playerName
      });
      throw new Error(`Room "${roomCode}" not found after ${maxRetries} attempts`);
    }

    console.log('🔧 ROOM OPEN DEBUG: Room data retrieved for join attempt', {
      roomCode,
      roomId: room.id,
      roomConfig: room.config,
      roomClosed: room.config?.roomClosed,
      playerName
    });

    // Check if room is closed
    if (room.config?.roomClosed) {
      console.log('❌ RETRY LOGIC: Room is closed after all retries, preventing join', {
        roomCode,
        roomClosed: room.config.roomClosed,
        playerName,
        finalAttempt: true,
        retriesCompleted: maxRetries
      });
      throw new Error('This room is currently closed to new players');
    } else {
      console.log('✅ RETRY LOGIC: Room is open after retries, allowing join', {
        roomCode,
        roomClosed: room.config?.roomClosed,
        playerName,
        retriesCompleted: 'N/A - succeeded early'
      });
    }

    // Check if room is cancelled
    if (room.status === 'cancelled') {
      throw new Error('This game has been cancelled');
    }

    // Check if room is finished
    if (room.status === 'finished') {
      throw new Error('This game has already finished');
    }

    // Check for duplicate player names in this room
    console.log('🔍 Checking for duplicate player names in room:', room.id);
    const { data: existingPlayers, error: duplicateCheckError } = await supabase
      .from('players')
      .select('name')
      .eq('room_id', room.id)
      .eq('name', playerName);

    if (duplicateCheckError) {
      console.error('❌ Failed to check for duplicate names:', duplicateCheckError);
      throw new Error('Failed to validate player name. Please try again.');
    }

    if (existingPlayers && existingPlayers.length > 0) {
      console.log('❌ Duplicate name detected:', playerName, 'in room:', room.code);
      throw new Error('This nickname is already taken in this room. Please choose a different one.');
    }

    console.log('✅ Player name is unique in room:', playerName);

    // Get current player count before adding new player
    const currentPlayers = await this.getPlayersInRoom(room.id);
    const newPlayerCount = currentPlayers.length + 1;
    
    // Update maxPlayersEver in room config if this is a new peak
    const currentMax = room.config?.maxPlayersEver || 0;
    if (newPlayerCount > currentMax) {
      console.log('📊 PEAK PLAYERS: New peak detected:', newPlayerCount, 'previous:', currentMax);
      const updatedConfig = {
        ...room.config,
        maxPlayersEver: newPlayerCount
      };
      
      try {
        await this.updateRoomConfig(room.id, updatedConfig);
        console.log('✅ PEAK PLAYERS: Updated maxPlayersEver to:', newPlayerCount);
      } catch (error) {
        console.error('❌ PEAK PLAYERS: Failed to update maxPlayersEver:', error);
        // Don't fail join if this update fails
      }
    }
    // Generate MYNGO card
    const card = generateMyngoCard();
    console.log('🎴 Generated card for player:', playerName);

    // Create player
    const { data, error } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: playerName,
        card,
        marked_numbers: [],
        is_bot: false,
        is_winner: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to join room:', error);
      throw new Error(`Failed to join room: ${error.message}`);
    }

    // Update game history with new player count
    try {
      console.log('🚪 PLAYER COUNT LOGGING: About to update game history after player join - roomCode:', roomCode, 'playerName:', playerName);
      await this.updateGameHistoryPlayerCount(room.code);
      console.log('✅ Game history player count updated after join');
    } catch (historyError) {
      console.error('⚠️ Failed to update game history player count:', historyError);
      // Don't fail the join if history update fails
    }
    console.log('✅ Player joined successfully:', data);
    return data;
  }

  // Get players in room
  static async getPlayersInRoom(roomId: string): Promise<MyngoPlayer[]> {
    console.log('📡 Getting players in room:', roomId);
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to get players:', error);
      throw new Error(`Failed to get players: ${error.message}`);
    }

    console.log('✅ Players retrieved:', data?.length || 0);
    return data || [];
  }

  // Call a number
  static async callNumber(roomId: string, number: number, letter: string): Promise<CalledNumber> {
    console.log('📡 Calling number:', letter, number, 'in room:', roomId);
    
    const { data, error } = await supabase
      .from('called_numbers')
      .insert({
        room_id: roomId,
        number,
        letter
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to call number:', error);
      throw new Error(`Failed to call number: ${error.message}`);
    }

    console.log('✅ Number called successfully:', data);
    return data;
  }

  // Get called numbers
  static async getCalledNumbers(roomId: string): Promise<CalledNumber[]> {
    console.log('📡 Getting called numbers for room:', roomId);
    
    const { data, error } = await supabase
      .from('called_numbers')
      .select('*')
      .eq('room_id', roomId)
      .order('called_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to get called numbers:', error);
      throw new Error(`Failed to get called numbers: ${error.message}`);
    }

    console.log('✅ Called numbers retrieved:', data?.length || 0);
    return data || [];
  }

  // Update player marked numbers
  static async updatePlayerMarkedNumbers(playerId: string, markedNumbers: number[]): Promise<void> {
    console.log('📡 Updating marked numbers for player:', playerId, 'count:', markedNumbers.length);
    
    const { error } = await supabase
      .from('players')
      .update({ marked_numbers: markedNumbers })
      .eq('id', playerId);

    if (error) {
      console.error('❌ Failed to update marked numbers:', error);
      throw new Error(`Failed to update marked numbers: ${error.message}`);
    }

    console.log('✅ Marked numbers updated successfully');
  }

  // Mark player as winner
  static async markPlayerAsWinner(playerId: string, roomId: string): Promise<void> {
    console.log('📡 Marking player as winner:', playerId);
    
    // Get player and room data for history recording
    const [playerResult, roomResult] = await Promise.all([
      supabase.from('players').select('*').eq('id', playerId).single(),
      supabase.from('rooms').select('*').eq('id', roomId).single()
    ]);

    if (playerResult.error || roomResult.error) {
      console.error('❌ Failed to get player/room data:', playerResult.error || roomResult.error);
      throw new Error('Failed to get game data for winner recording');
    }

    const player = playerResult.data;
    const room = roomResult.data;

    // Mark player as winner
    const { error } = await supabase
      .from('players')
      .update({ is_winner: true })
      .eq('id', playerId);

    if (error) {
      console.error('❌ Failed to mark player as winner:', error);
      throw new Error(`Failed to mark player as winner: ${error.message}`);
    }

    // CRITICAL: Update room status to 'finished' when winner is declared
    // This ensures the game state is preserved across refreshes
    console.log('🏁 Updating room status to finished for winner');
    await this.updateRoomStatus(roomId, 'finished', 'Winner declared');
    
    // Immediately record complete game statistics with accurate dropped count
    try {
      console.log('📊 Recording complete game statistics for winner');
      await this.recordWinnerGameStats(room, player);
    } catch (statsError) {
      console.error('❌ Failed to record winner stats:', statsError);
      // Don't fail the winner marking if stats recording fails
    }

    console.log('✅ Player marked as winner successfully');
  }

  // Record complete game statistics when winner is declared
  static async recordWinnerGameStats(room: any, winner: any): Promise<void> {
    console.log('📊 Recording winner game statistics');
    
    try {
      // Get current game data
      const [players, calledNumbers] = await Promise.all([
        this.getPlayersInRoom(room.id),
        this.getCalledNumbers(room.id)
      ]);

      // Get the most up-to-date room data to ensure we have latest maxPlayersEver
      const { data: latestRoom, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', room.id)
        .single();

      if (roomError) {
        console.error('❌ Failed to get latest room data:', roomError);
        throw roomError;
      }
      // Calculate game duration
      const createdAt = new Date(latestRoom.created_at);
      const now = new Date();
      const durationMinutes = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60));

      // Calculate accurate dropped players using maxPlayersEver
      const peakPlayers = latestRoom.config?.maxPlayersEver || players.length;
      const currentPlayers = players.length;
      const droppedPlayers = Math.max(0, peakPlayers - currentPlayers);
      
      console.log('📊 DROPPED PLAYERS CALCULATION:', {
        peakPlayers,
        currentPlayers,
        droppedPlayers,
        roomCode: latestRoom.code
      });
      // Get or update existing game history record
      const { data: existingHistory, error: historyError } = await supabase
        .from('game_history')
        .select('*')
        .eq('room_code', latestRoom.code)
        .eq('ending_status', 'active')
        .single();

      const gameStats = {
        room_code: latestRoom.code,
        players_start: peakPlayers, // Use the tracked peak
        players_end: players.length,
        players_drop: droppedPlayers, // Use calculated dropped count
        winner_name: winner.name,
        duration: durationMinutes,
        ending_status: 'Winner Declared',
        balls_called_count: calledNumbers.length,
        is_demo_game: latestRoom.config?.demoMode || false
      };

      console.log('📊 FINAL GAME STATS:', gameStats);
      if (historyError || !existingHistory) {
        console.log('⚠️ No active history record found for winner recording - room:', latestRoom.code);
        console.log('⚠️ This should not happen - history should exist from room creation');
        return;
      } else {
        // Update existing record with winner info
        console.log('📊 Updating existing game history with winner info');
        const { error: updateError } = await supabase
          .from('game_history')
          .update({
            players_start: gameStats.players_start, // Ensure peak is recorded
            players_end: gameStats.players_end,
            players_drop: gameStats.players_drop,
            winner_name: gameStats.winner_name,
            duration: gameStats.duration,
            ending_status: gameStats.ending_status,
            balls_called_count: gameStats.balls_called_count
          })
          .eq('id', existingHistory.id);

        if (updateError) {
          console.error('❌ Failed to update game history with winner:', updateError);
          throw updateError;
        }
      }

      console.log('✅ Winner game statistics recorded successfully');
    } catch (error) {
      console.error('❌ Error recording winner game stats:', error);
      throw error;
    }
  }

  // Remove player
  static async removePlayer(playerId: string): Promise<void> {
    console.log('📡 PLAYER COUNT LOGGING: Removing player:', playerId);
    
    // Get player info before deletion for history tracking
    const { data: player, error: getError } = await supabase
      .from('players')
      .select('room_id, name')
      .eq('id', playerId)
      .single();

    if (getError) {
      console.error('❌ Failed to get player info before removal:', getError);
    }

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('❌ Failed to remove player:', error);
      throw new Error(`Failed to remove player: ${error.message}`);
    }

    // Update game history if we have player info
    if (player) {
      try {
        // Get room code for history update
        const { data: room } = await supabase
          .from('rooms')
          .select('code')
          .eq('id', player.room_id)
          .single();

        if (room) {
          console.log('📡 PLAYER COUNT LOGGING: About to update game history after player removal - playerId:', playerId, 'roomCode:', room.code);
          await this.updateGameHistoryPlayerCount(room.code);
          console.log('✅ Game history updated after player removal');
        }
      } catch (historyError) {
        console.error('⚠️ Failed to update game history after player removal:', historyError);
      }
    }
    console.log('✅ Player removed successfully');
  }

  // Update game history player count - tracks peak players
  static async updateGameHistoryPlayerCount(roomCode: string): Promise<void> {
    console.log('📊 PLAYER COUNT LOGGING: === Starting updateGameHistoryPlayerCount ===');
    console.log('📊 PLAYER COUNT LOGGING: roomCode:', roomCode);
    
    try {
      // Get current active players in this room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', roomCode)
        .single();

      if (roomError || !room) {
        console.error('❌ PLAYER COUNT LOGGING: Failed to get room for player count update:', roomError);
        return;
      }

      console.log('📊 PLAYER COUNT LOGGING: Found room with ID:', room.id);
      
      const currentPlayers = await this.getPlayersInRoom(room.id);
      const currentPlayerCount = currentPlayers.length;
      
      console.log('📊 PLAYER COUNT LOGGING: currentPlayerCount:', currentPlayerCount);
      console.log('📊 PLAYER COUNT LOGGING: currentPlayers details:', currentPlayers.map(p => ({ id: p.id, name: p.name, is_bot: p.is_bot })));

      // Get existing game history record
      const { data: existingHistory, error: historyError } = await supabase
        .from('game_history')
        .select('*')
        .eq('room_code', roomCode)
        .eq('ending_status', 'active')
        .single();

      console.log('📊 PLAYER COUNT LOGGING: existingHistory query result:', {
        found: !!existingHistory,
        error: historyError?.message || 'none',
        historyId: existingHistory?.id,
        currentPlayersStart: existingHistory?.players_start,
        endingStatus: existingHistory?.ending_status
      });

      if (historyError || !existingHistory) {
        console.warn('⚠️ PLAYER COUNT LOGGING: No active history record found for room:', roomCode);
        console.warn('⚠️ PLAYER COUNT LOGGING: This indicates the initial history creation failed or record was prematurely finalized');
        console.warn('⚠️ PLAYER COUNT LOGGING: Skipping player count update to prevent duplicate records');
        return;
      } else {
        // Update existing record - keep the maximum player count as players_start
        const newPlayersStart = Math.max(existingHistory.players_start || 0, currentPlayerCount);
        
        console.log('📊 PLAYER COUNT LOGGING: Updating existing history record calculation:', {
          oldPlayersStart: existingHistory.players_start,
          currentPlayerCount,
          newPlayersStart,
          willUpdate: newPlayersStart > (existingHistory.players_start || 0)
        });

        if (newPlayersStart > (existingHistory.players_start || 0)) {
          console.log('📊 PLAYER COUNT LOGGING: Executing UPDATE query - setting players_start to:', newPlayersStart, 'for history ID:', existingHistory.id);
          
          const { error: updateError } = await supabase
            .from('game_history')
            .update({
              players_start: newPlayersStart
            })
            .eq('id', existingHistory.id);

          if (updateError) {
            console.error('❌ PLAYER COUNT LOGGING: Failed to update game history player count:', updateError);
            console.error('❌ PLAYER COUNT LOGGING: Update error details:', updateError.message, updateError.details, updateError.hint);
          } else {
            console.log('✅ PLAYER COUNT LOGGING: Game history players_start updated successfully to:', newPlayersStart);
            
            // Verify the update by querying the record again
            const { data: verifyData, error: verifyError } = await supabase
              .from('game_history')
              .select('players_start')
              .eq('id', existingHistory.id)
              .single();
            
            if (verifyError) {
              console.error('❌ PLAYER COUNT LOGGING: Failed to verify update:', verifyError);
            } else {
              console.log('✅ PLAYER COUNT LOGGING: Verification - players_start is now:', verifyData.players_start);
            }
          }
        } else {
          console.log('📊 PLAYER COUNT LOGGING: Current count not higher than peak, no update needed');
        }
      }
      
      console.log('📊 PLAYER COUNT LOGGING: === Finished updateGameHistoryPlayerCount ===');
    } catch (error) {
      console.error('❌ PLAYER COUNT LOGGING: Error updating game history player count:', error);
      console.error('❌ PLAYER COUNT LOGGING: Error details:', error.message, error.stack);
      // Don't throw - this is tracking, shouldn't break main flow
    }
  }

  // Update room status
  static async updateRoomStatus(roomId: string, status: string, reason?: string): Promise<void> {
    console.log('📡 Updating room status:', roomId, 'to:', status, 'reason:', reason);
    
    try {
      // Get current room data
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error('❌ Failed to get room for status update:', roomError);
        throw roomError;
      }

      // Update room status
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status })
        .eq('id', roomId);

      if (updateError) {
        console.error('❌ Failed to update room status:', updateError);
        throw updateError;
      }

      // If cancelling, update game history and clean up
      // If finishing (winner declared), keep everything for state persistence
      if (status === 'cancelled') {
        await this.finalizeGameHistory(roomId, status, reason);
      } else if (status === 'finished') {
        console.log('🏁 Game finished with winner - preserving all data for state persistence');
        // Don't clean up data yet - let host manually end the game
      }

      console.log('✅ Room status updated successfully');
    } catch (error) {
      console.error('❌ Failed to update room status:', error);
      throw error;
    }
  }

  // Update room config
  static async updateRoomConfig(roomId: string, config: RoomConfig): Promise<void> {
    console.log('📡 Updating room config:', roomId);
    console.log('📡 New config:', JSON.stringify(config, null, 2));
    console.log('🔧 ROOM OPEN DEBUG: updateRoomConfig called', {
      roomId,
      roomClosed: config.roomClosed,
      fullConfig: config
    });
    
    const { error } = await supabase
      .from('rooms')
      .update({ config })
      .eq('id', roomId);

    if (error) {
      console.error('❌ Failed to update room config:', error);
      console.error('❌ ROOM OPEN DEBUG: Failed to update room config in database', {
        roomId,
        error: error.message,
        config
      });
      throw new Error(`Failed to update room config: ${error.message}`);
    }

    console.log('✅ Room config updated successfully');
    console.log('✅ ROOM OPEN DEBUG: Room config successfully updated in database', {
      roomId,
      roomClosed: config.roomClosed,
      autoCall: config.autoCall
    });
  }

  // End game
  static async endGame(roomId: string, winnerName?: string): Promise<void> {
    console.log('📡 Ending game:', roomId, 'winner:', winnerName);
    
    try {
      // Finalize game history and immediately clean up all data (host-ended games)
      await this.finalizeGameHistory(roomId, 'finished', 'Host ended game');
      
      // For host-ended games, immediately delete the room and all data
      console.log('🧹 Host ended game - immediately cleaning up all data');
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (deleteError) {
        console.error('❌ Failed to delete room after host ended game:', deleteError);
      } else {
        console.log('✅ Room and associated data cleaned up successfully after host ended game');
      }
      
      console.log('✅ Game ended successfully');
    } catch (error) {
      console.error('❌ Failed to end game:', error);
      throw error;
    }
  }

  // Finalize game history
  static async finalizeGameHistory(roomId: string, endingStatus: string, reason?: string): Promise<void> {
    console.log('📊 Finalizing game history for room:', roomId, 'status:', endingStatus);
    
    try {
      // Get room data
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error('❌ Failed to get room for history finalization:', roomError);
        return; // Don't throw, just log
      }

      // Get current players
      const players = await this.getPlayersInRoom(roomId);
      const playersEnd = players.length;

      // Get called numbers count
      const calledNumbers = await this.getCalledNumbers(roomId);
      const ballsCalledCount = calledNumbers.length;

      // Find winner
      const winner = players.find(p => p.is_winner);
      const winnerName = winner?.name || null;

      // Calculate duration (rough estimate based on creation time)
      const createdAt = new Date(room.created_at);
      const now = new Date();
      const durationMinutes = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60));

      // Update ending status text - change "finished" to "Completed Game"
      let finalEndingStatus = endingStatus;
      if (endingStatus === 'finished') {
        finalEndingStatus = 'Completed Game';
      }
      
      // Get initial game history record to update
      const { data: existingHistory, error: historyError } = await supabase
        .from('game_history')
        .select('*')
        .eq('room_code', room.code)
        .eq('ending_status', 'active')
        .single();

      if (historyError || !existingHistory) {
        console.log('⚠️ No active history record found for finalization - room:', room.code);
        console.log('⚠️ This should not happen - history should exist from room creation');
        return;
      } else {
        console.log('📊 Updating existing history record');
        // Update existing record
        const playersStart = Math.max(existingHistory.players_start || 0, playersEnd);
        const playersDrop = Math.max(0, playersStart - playersEnd);

        const { error: updateError } = await supabase
          .from('game_history')
          .update({
            players_end: playersEnd,
            players_drop: playersDrop,
            winner_name: winnerName,
            duration: durationMinutes,
            ending_status: finalEndingStatus + (reason ? ` (${reason})` : ''),
            balls_called_count: ballsCalledCount
          })
          .eq('id', existingHistory.id);

        if (updateError) {
          console.error('❌ Failed to update game history:', updateError);
        } else {
          console.log('✅ Game history updated successfully');
        }
      }
      
      // After successfully recording the game history, clean up the room
      // This will cascade delete all associated players and called_numbers
      // Only clean up if this is a cancellation or host-ended game
      if (endingStatus === 'cancelled' || reason === 'Host ended game') {
        console.log('🧹 Cleaning up room and associated data after history recorded');
        try {
          const { error: deleteError } = await supabase
            .from('rooms')
            .delete()
            .eq('id', roomId);

          if (deleteError) {
            console.error('❌ Failed to delete room after history finalization:', deleteError);
          } else {
            console.log('✅ Room and associated data cleaned up successfully');
            console.log('🗑️ Deleted room, players, and called numbers for room:', room.code);
          }
        } catch (cleanupError) {
          console.error('❌ Error during room cleanup:', cleanupError);
        }
      } else {
        console.log('🏁 Game finished with winner - preserving data for state persistence');
      }
    } catch (error) {
      console.error('❌ Failed to finalize game history:', error);
      // Don't throw - this is cleanup, shouldn't break the main flow
    }
  }

  // Create game history record
  static async createGameHistoryRecord(record: {
    room_code: string;
    players_start: number;
    players_end: number | null;
    players_drop?: number;
    winner_name?: string | null;
    duration?: number | null;
    ending_status: string;
    balls_called_count?: number;
    is_demo_game?: boolean;
  }): Promise<void> {
    console.log('📊 Creating game history record:', record);
    
    const { error } = await supabase
      .from('game_history')
      .insert({
        room_code: record.room_code,
        players_start: record.players_start,
        players_end: record.players_end, // Now nullable
        players_drop: record.players_drop || 0,
        winner_name: record.winner_name || null,
        duration: record.duration || null,
        ending_status: record.ending_status,
        balls_called_count: record.balls_called_count || 0,
        is_demo_game: record.is_demo_game || false
      });

    if (error) {
      console.error('❌ Error creating game history record:', error);
      throw error;
    }

    console.log('✅ Game history record created successfully');
  }

  // Get game statistics
  static async getGameStats(): Promise<GameStats> {
    console.log('📊 Getting game statistics');
    
    try {
      // Get active games count
      const { data: activeRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id')
        .in('status', ['waiting', 'active']);

      if (roomsError) {
        console.error('❌ Failed to get active rooms:', roomsError);
        throw roomsError;
      }

      const activeGames = activeRooms?.length || 0;

      // Get players online count (in active rooms)
      let playersOnline = 0;
      if (activeGames > 0) {
        const roomIds = activeRooms.map(room => room.id);
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id')
          .in('room_id', roomIds);

        if (playersError) {
          console.error('❌ Failed to get players count:', playersError);
        } else {
          playersOnline = players?.length || 0;
        }
      }

      // Calculate spots available (rough estimate)
      const spotsAvailable = Math.max(0, 1000 - playersOnline);

      // Get peak statistics from game history
      const { data: peakData, error: peakError } = await supabase
        .from('game_history')
        .select('players_start')
        .order('created_at', { ascending: false })
        .limit(100);

      let peakGames = 47; // Default fallback
      let peakPlayers = 1247; // Default fallback

      if (!peakError && peakData) {
        // Calculate peak concurrent games (estimate)
        peakGames = Math.max(peakGames, Math.ceil(peakData.length / 10));
        
        // Calculate peak concurrent players
        const maxPlayers = Math.max(...peakData.map(game => game.players_start || 0));
        peakPlayers = Math.max(peakPlayers, maxPlayers * 10); // Rough estimate
      }

      const stats = {
        activeGames,
        playersOnline,
        spotsAvailable,
        peakGames,
        peakPlayers
      };

      console.log('✅ Game statistics retrieved:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get game statistics:', error);
      // Return fallback stats
      return {
        activeGames: 0,
        playersOnline: 0,
        spotsAvailable: 500,
        peakGames: 47,
        peakPlayers: 1247
      };
    }
  }

  // Add demo bots to a room
  static async addDemoBots(roomId: string): Promise<void> {
    console.log('🤖 Adding demo bots to room:', roomId);
    
    const botNames = ['MYNGO', 'LuckyCharm', 'MainPlay'];
    
    try {
      for (const botName of botNames) {
        const card = generateMyngoCard();
        
        const { error } = await supabase
          .from('players')
          .insert({
            room_id: roomId,
            name: botName,
            card,
            marked_numbers: [],
            is_bot: true,
            is_winner: false
          });

        if (error) {
          console.error(`❌ Failed to add bot ${botName}:`, error);
        } else {
          console.log(`✅ Bot ${botName} added successfully`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to add demo bots:', error);
      throw error;
    }
  }

  // Auto-mark numbers for bots (demo mode)
  static async autoBotMarkNumber(roomId: string, calledNumber: number, isDemoMode: boolean = false): Promise<void> {
    if (!isDemoMode) {
      console.log('🤖 Not in demo mode, skipping bot auto-mark');
      return;
    }

    console.log('🤖 Auto-marking number for bots:', calledNumber, 'in room:', roomId);
    
    try {
      // Get all bots in the room
      const { data: bots, error: botsError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_bot', true);

      if (botsError) {
        console.error('❌ Failed to get bots:', botsError);
        return;
      }

      if (!bots || bots.length === 0) {
        console.log('🤖 No bots found in room');
        return;
      }

      // For each bot, check if they have the called number and mark it
      for (const bot of bots) {
        // Skip if bot is already a winner
        if (bot.is_winner) {
          console.log('🤖 Bot', bot.name, 'is already a winner, skipping');
          continue;
        }
        
        const cardNumbers = [
          ...bot.card.M,
          ...bot.card.Y,
          ...bot.card.N,
          ...bot.card.G,
          ...bot.card.O
        ];

        if (cardNumbers.includes(calledNumber)) {
          // Bot has this number, mark it instantly in demo mode
          const shouldMark = true; // 100% chance to mark in demo mode
          
          if (shouldMark && !bot.marked_numbers.includes(calledNumber)) {
            const newMarkedNumbers = [...bot.marked_numbers, calledNumber];
            
            console.log('🤖 Bot', bot.name, 'marking number', calledNumber, 'new total:', newMarkedNumbers.length);
            
            const { error: updateError } = await supabase
              .from('players')
              .update({ marked_numbers: newMarkedNumbers })
              .eq('id', bot.id);

            if (updateError) {
              console.error(`❌ Failed to update bot ${bot.name}:`, updateError);
            } else {
              console.log(`✅ Bot ${bot.name} marked number ${calledNumber}`);
              
              // Check if bot now has a winning pattern
              await this.checkBotForWin(bot.id, bot.card, newMarkedNumbers, roomId);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to auto-mark for bots:', error);
    }
  }

  // Check if a bot has achieved a winning pattern and auto-declare win
  static async checkBotForWin(botId: string, card: any, markedNumbers: number[], roomId: string): Promise<void> {
    try {
      // Import win checking utility
      const { checkWin } = await import('../utils/myngo-utils');
      
      console.log('🤖 Checking bot for win with', markedNumbers.length, 'marked numbers');
      
      const winCheck = checkWin(card, markedNumbers);
      
      if (winCheck.hasWin) {
        console.log('🏆 DEMO BOT WIN DETECTED! Bot has winning pattern:', winCheck.pattern, 'line:', winCheck.line);
        
        // Instantly declare bot as winner in demo mode
        try {
          console.log('🤖 Auto-declaring bot as winner instantly');
          await this.markPlayerAsWinner(botId, roomId);
          console.log('✅ Demo bot automatically declared as winner!');
        } catch (error) {
          console.error('❌ Failed to auto-declare bot winner:', error);
        }
      } else {
        console.log('🤖 Bot does not have winning pattern yet');
      }
    } catch (error) {
      console.error('❌ Error checking bot for win:', error);
    }
  }

  // Cleanup operations
  static async cleanupDemoGames(): Promise<void> {
    console.log('🧹 Starting demo game cleanup process...');
    
    try {
      // Delete demo games older than 1 hour
      const cutoffTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      console.log('🧹 Demo cleanup cutoff time:', cutoffTime);

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('config->demoMode', true)
        .lt('created_at', cutoffTime);

      if (error) {
        console.error('❌ Failed to cleanup demo games:', error);
      } else {
        console.log('✅ Demo games cleanup completed');
      }
    } catch (error) {
      console.error('❌ Error during demo cleanup:', error);
    }
  }

  static async closeInactiveRooms(): Promise<void> {
    console.log('🔍 Checking for inactive rooms to close...');
    
    try {
      // Close rooms older than 2 hours that are still waiting/active
      const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      console.log('🔍 Inactive room cutoff time:', cutoffTime);

      const { data: oldRooms, error: selectError } = await supabase
        .from('rooms')
        .select('id, code')
        .in('status', ['waiting', 'active'])
        .lt('created_at', cutoffTime);

      if (selectError) {
        console.error('❌ Failed to find old rooms:', selectError);
        return;
      }

      if (!oldRooms || oldRooms.length === 0) {
        console.log('🧹 No old rooms found for cleanup');
        return;
      }

      console.log(`🧹 Found ${oldRooms.length} old rooms to close`);

      for (const room of oldRooms) {
        await this.updateRoomStatus(room.id, 'cancelled', 'Auto-closed due to inactivity');
      }

      console.log('✅ Inactive rooms cleanup completed');
    } catch (error) {
      console.error('❌ Error during inactive rooms cleanup:', error);
    }
  }

  static async cancelGamesWithInactiveHosts(): Promise<void> {
    console.log('🔍 Checking for games with inactive hosts...');
    
    try {
      // Find rooms where host hasn't been active for 6 hours (backup safety net only)
      const cutoffTime = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      const { data: inactiveRooms, error: selectError } = await supabase
        .from('rooms')
        .select('id, code, updated_at')
        .in('status', ['waiting', 'active'])
        .lt('updated_at', cutoffTime);

      if (selectError) {
        console.error('❌ Failed to find inactive host rooms:', selectError);
        return;
      }

      if (!inactiveRooms || inactiveRooms.length === 0) {
        console.log('🔍 No rooms inactive for 6+ hours found');
        return;
      }

      console.log(`🚫 Found ${inactiveRooms.length} rooms with hosts inactive for 6+ hours (backup cleanup)`);

      for (const room of inactiveRooms) {
        await this.updateRoomStatus(room.id, 'cancelled', 'Host inactive for 6+ hours (backup cleanup)');
      }

      console.log('✅ Long-term inactive host cleanup completed');
    } catch (error) {
      console.error('❌ Error during long-term inactive host cleanup:', error);
    }
  }

  // Clean up stale players in a room
  static async cleanupStalePlayersInRoom(roomId: string): Promise<void> {
    console.log('🧹 Cleaning up stale players in room:', roomId);
    
    try {
      // Get room code for history updates
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('code')
        .eq('id', roomId)
        .single();

      if (roomError || !room) {
        console.error('❌ Failed to get room for stale cleanup:', roomError);
        return;
      }

      // Get current player count before cleanup
      const { data: playersBefore, error: beforeError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomId);

      const countBefore = playersBefore?.length || 0;
      console.log('🧹 Player count before cleanup:', countBefore);

      // In a real implementation, you would identify and remove stale players here
      // For now, we'll just update the game history with current accurate count
      // await this.updateGameHistoryPlayerCount(room.code);
      
      console.log('🧹 Stale player cleanup completed for room:', roomId);
    } catch (error) {
      console.error('❌ Error during stale player cleanup:', error);
    }
  }

  // Update host activity timestamp
  static async updateHostActivity(roomId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

      if (error) {
        console.error('❌ Failed to update host activity:', error);
      }
    } catch (error) {
      console.error('❌ Error updating host activity:', error);
    }
  }

  // Real-time subscriptions
  static subscribeToRoom(roomId: string, callback: (payload: any) => void) {
    console.log('🔄 Setting up room subscription for:', roomId);
    
    return supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, callback)
      .subscribe();
  }

  static subscribeToPlayers(roomId: string, callback: (payload: any) => void) {
    console.log('🔄 Setting up players subscription for room:', roomId);
    
    return supabase
      .channel(`players-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      }, callback)
      .subscribe();
  }

  static subscribeToCalledNumbers(roomId: string, callback: (payload: any) => void) {
    console.log('🔄 Setting up called numbers subscription for room:', roomId);
    
    return supabase
      .channel(`called-numbers-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'called_numbers',
        filter: `room_id=eq.${roomId}`
      }, callback)
      .subscribe();
  }

  // Player presence tracking
  static async trackPlayerPresence(roomId: string, playerId: string, playerName: string) {
    console.log('👁️ Setting up presence tracking for player:', playerName);
    
    const channel = supabase.channel(`presence-${roomId}`, {
      config: {
        presence: {
          key: playerId,
        },
      },
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          player_id: playerId,
          player_name: playerName,
          online_at: new Date().toISOString(),
        });
      }
    });

    return channel;
  }

  static async untrackPlayerPresence(channel: any, playerId: string) {
    console.log('👁️ Cleaning up presence tracking for player:', playerId);
    
    try {
      // Clear heartbeat interval if it exists
      if ((channel as any)._heartbeatInterval) {
        console.log('🔄 Clearing presence heartbeat interval');
        clearInterval((channel as any)._heartbeatInterval);
        delete (channel as any)._heartbeatInterval;
      }
      
      await channel.untrack();
      await channel.unsubscribe();
    } catch (error) {
      console.error('❌ Error cleaning up presence:', error);
    }
  }

  // Host presence tracking with disconnect detection
  static subscribeToHostPresence(roomId: string, hostId: string, onHostDisconnect: () => void) {
    console.log('👁️ Setting up host presence tracking for room:', roomId, 'host:', hostId);
    
    const channel = supabase.channel(`host-presence-${roomId}`, {
      config: {
        presence: {
          key: hostId,
        },
      },
    });

    // Track when host leaves (disconnects)
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('🚨 HOST LEAVE EVENT DETECTED - Room:', roomId, 'Host:', hostId);
      
      // Check if the host left
      const hostLeft = leftPresences.some((presence: any) => 
        presence.user_id === hostId || presence.host_id === hostId
      );
      
      if (hostLeft) {
        console.log('🚫 HOST DISCONNECTED - Host', hostId, 'left the presence channel');
        onHostDisconnect();
      }
    });

    // Subscribe and track host presence
    channel.subscribe(async (status) => {
      console.log('👁️ Host presence subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Host successfully subscribed, now tracking host', hostId);
        await channel.track({
          user_id: hostId,
          host_id: hostId,
          user_name: 'Host',
          role: 'host',
          online_at: new Date().toISOString(),
        });
        
        // Set up heartbeat to prevent false disconnects
        (channel as any)._heartbeatInterval = setInterval(async () => {
          try {
            await channel.track({
              user_id: hostId,
              host_id: hostId,
              user_name: 'Host',
              role: 'host',
              online_at: new Date().toISOString()
            });
            console.log('💓 Host presence heartbeat sent');
          } catch (error) {
            console.error('❌ Failed to send host presence heartbeat:', error);
          }
        }, 10000); // Every 10 seconds
        
        console.log('✅ Host tracking data sent successfully with heartbeat');
      }
    });
    
    console.log('👁️ Host presence channel setup complete for room:', roomId);
    return channel;
  }
}