// MYNGO Game Types - Core type definitions for the MYNGO real-time webinar game
// Created: Complete type system for rooms, players, cards, and game state

export interface MyngoRoom {
  id: string;
  code: string;
  host_id: string;
  config: RoomConfig;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface RoomConfig {
  expectedPlayers: number;
  meetingDuration: number;
  demoMode: boolean;
  autoCall?: {
    enabled: boolean;
  };
  autoClose: boolean;
  autoCloseMinutes: number;
  callFrequency: number;
  roomClosed?: boolean;
  maxPlayersEver?: number;
  isPaused?: boolean;
}

export interface MyngoPlayer {
  id: string;
  room_id: string;
  name: string;
  card: MyngoCard;
  marked_numbers: number[];
  is_bot: boolean;
  is_winner: boolean;
  joined_at: string;
}

export interface MyngoCard {
  M: number[];
  Y: number[];
  N: number[];
  G: number[];
  O: number[];
}

export interface CalledNumber {
  id: string;
  room_id: string;
  number: number;
  letter: 'M' | 'Y' | 'N' | 'G' | 'O';
  called_at: string;
}

export interface GameHistory {
  id: string;
  game_number: number;
  players_start: number;
  players_end: number | null;
  players_drop?: number;
  winner_name?: string;
  duration?: number;
  ending_status: string;
  balls_called_count?: number;
  is_demo_game?: boolean;
  room_code?: string;
  created_at: string;
}

export interface GameStats {
  activeGames: number;
  playersOnline: number;
  spotsAvailable: number;
  peakGames: number;
  peakPlayers: number;
}

export type WinPattern = 'row' | 'column' | 'diagonal';

export interface WinCheck {
  hasWin: boolean;
  pattern?: WinPattern;
  line?: number;
}