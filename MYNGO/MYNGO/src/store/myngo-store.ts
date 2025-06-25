// MYNGO Game Store - Zustand state management for real-time game state
// Created: Complete game state management with real-time updates

import { create } from 'zustand';
import { MyngoRoom, MyngoPlayer, CalledNumber, GameStats, RoomConfig } from '../types/myngo';

interface MyngoStore {
  // Current game state
  currentRoom: MyngoRoom | null;
  currentPlayer: MyngoPlayer | null;
  players: MyngoPlayer[];
  calledNumbers: CalledNumber[];
  gameStats: GameStats;
  
  // UI state
  isHost: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Game controls
  isAutoMode: boolean;
  autoInterval: number;
  isPaused: boolean;
  roomOpen: boolean;
  soundEnabled: boolean;
  
  // Actions
  setCurrentRoom: (room: MyngoRoom | null) => void;
  setCurrentPlayer: (player: MyngoPlayer | null) => void;
  setPlayers: (players: MyngoPlayer[]) => void;
  addPlayer: (player: MyngoPlayer) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<MyngoPlayer>) => void;
  setCalledNumbers: (numbers: CalledNumber[]) => void;
  addCalledNumber: (number: CalledNumber) => void;
  setGameStats: (stats: GameStats) => void;
  setIsHost: (isHost: boolean) => void;
  setIsConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAutoMode: (auto: boolean) => void;
  setAutoInterval: (interval: number) => void;
  setPaused: (paused: boolean) => void;
  setRoomOpen: (open: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initialGameStats: GameStats = {
  activeGames: 0,
  playersOnline: 0,
  spotsAvailable: 500,
  peakGames: 47,
  peakPlayers: 1247
};

export const useMyngoStore = create<MyngoStore>((set) => ({
  // Initial state
  currentRoom: null,
  currentPlayer: null,
  players: [],
  calledNumbers: [],
  gameStats: initialGameStats,
  
  isHost: false,
  isConnected: true,
  isLoading: false,
  error: null,
  
  isAutoMode: false,
  autoInterval: 20,
  isPaused: false,
  roomOpen: true,
  soundEnabled: true,
  
  // Actions
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setPlayers: (players) => set({ players }),
  addPlayer: (player) => set((state) => ({ 
    players: [...state.players, player] 
  })),
  removePlayer: (playerId) => set((state) => ({ 
    players: state.players.filter(p => p.id !== playerId) 
  })),
  updatePlayer: (playerId, updates) => set((state) => ({
    players: state.players.map(p => 
      p.id === playerId ? { ...p, ...updates } : p
    )
  })),
  setCalledNumbers: (numbers) => set({ calledNumbers: numbers }),
  addCalledNumber: (number) => set((state) => ({ 
    calledNumbers: [number, ...state.calledNumbers] 
  })),
  setGameStats: (stats) => set({ gameStats: stats }),
  setIsHost: (isHost) => set({ isHost }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setAutoMode: (auto) => set({ isAutoMode: auto }),
  setAutoInterval: (interval) => set({ autoInterval: interval }),
  setPaused: (paused) => set({ isPaused: paused }),
  setRoomOpen: (open) => set({ roomOpen: open }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  reset: () => set({
    currentRoom: null,
    currentPlayer: null,
    players: [],
    calledNumbers: [],
    isHost: false,
    isLoading: false,
    error: null,
    isAutoMode: false,
    autoInterval: 20,
    isPaused: false,
    roomOpen: true
  })
}));