// Join Game Page - Player entry point with room code validation
// Updated: Auto-focus room code input for better user experience

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/glass-card';
import { GradientButton } from '../components/ui/gradient-button';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { SupabaseService } from '../lib/supabase-service';
import { Users, Sparkles, ArrowLeft } from 'lucide-react';

export function JoinGame() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [suggestedNicknames, setSuggestedNicknames] = useState<string[]>([]);
  const roomCodeInputRef = useRef<HTMLInputElement>(null);

  // Generate random unique nicknames on component mount
  useEffect(() => {
    const allNicknames = [
      'QuickPlayer', 'LuckyWinner', 'GameMaster', 'NumberHunter', 'MyngoChamp',
      'FastMarker', 'WinnerTaker', 'CardShark', 'NumberNinja', 'GameHero',
      'BingoStar', 'NumberCrush', 'WildCard', 'LuckyShot', 'GameChanger',
      'NumberWiz', 'CardMaster', 'WinStreak', 'LuckyDraw', 'GameAce',
      'NumberPro', 'CardKing', 'WinMachine', 'LuckyBreak', 'GameLegend',
      'NumberBoss', 'CardQueen', 'WinForce', 'LuckyStrike', 'GameRuler',
      'NumberGuru', 'CardWizard', 'WinPower', 'LuckyCharm', 'GameElite',
      'NumberSage', 'CardGenius', 'WinMagic', 'LuckySpirit', 'GameTitan'
    ];
    
    // Shuffle and pick 6 unique names
    const shuffled = [...allNicknames].sort(() => Math.random() - 0.5);
    setSuggestedNicknames(shuffled.slice(0, 6));
  }, []);

  // Auto-focus the room code input when component mounts
  useEffect(() => {
    if (roomCodeInputRef.current) {
      roomCodeInputRef.current.focus();
    }
  }, []);

  const isValidRoomCode = (code: string) => {
    return code.length === 6 && /^[A-Z0-9]+$/.test(code);
  };

  const handleRoomCodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (upperValue.length <= 6) {
      setRoomCode(upperValue);
      setError('');
    }
  };

  const handleNicknameChange = (value: string) => {
    if (value.length <= 20) {
      setNickname(value);
    }
  };

  const selectSuggestedNickname = (name: string) => {
    setNickname(name);
  };

  const joinGame = async () => {
    if (!isValidRoomCode(roomCode)) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      console.log('🚪 Attempting to join room:', roomCode, 'as:', nickname.trim());
      
      // Join room via Supabase
      const player = await SupabaseService.joinRoom(roomCode, nickname.trim());
      console.log('✅ Successfully joined room, player:', player);
      
      // Store player ID in session storage for this tab
      sessionStorage.setItem(`myngo_player_${roomCode}`, player.id);
      console.log('💾 Stored player ID in session storage:', player.id);
      
      // Small delay to ensure session storage is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to game
      console.log('🚀 Navigating to game page:', `/play/${roomCode}`);
      navigate(`/play/${roomCode}`);
    } catch (err) {
      console.error('Failed to join game:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join game. Please try again.';
      console.error('❌ Join game error:', errorMessage);
      
      // Check for specific duplicate name error
      if (errorMessage.includes('nickname is already taken')) {
        setError('This nickname is already taken in this room. Please choose a different one.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-cyan-800 to-purple-900 p-6">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
        </div>

        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight px-4">
              Join a MYNGO Game
            </h1>
            <p className="text-white/70 px-4 leading-relaxed">
              Enter the room code shared by your host
            </p>
          </div>

          <GlassCard className="p-8 space-y-6">
            {/* Room Code Input */}
            <div>
              <label className="block text-white font-medium mb-3">
                Room Code
              </label>
              <input
                ref={roomCodeInputRef}
                type="text"
                value={roomCode}
                onChange={(e) => handleRoomCodeChange(e.target.value)}
                placeholder="Enter 6-character code"
                className={`
                  w-full px-4 py-3 bg-white/10 border rounded-lg text-white text-center text-2xl font-mono tracking-widest
                  focus:outline-none focus:ring-2 transition-all duration-200
                  ${isValidRoomCode(roomCode) 
                    ? 'border-green-500/50 focus:ring-green-500/50 bg-green-500/10' 
                    : 'border-white/20 focus:ring-purple-500/50'
                  }
                `}
                maxLength={6}
                autoFocus
              />
              {roomCode && (
                <div className="mt-2 text-center">
                  {isValidRoomCode(roomCode) ? (
                    <span className="text-green-400 text-sm">✓ Valid format</span>
                  ) : (
                    <span className="text-yellow-400 text-sm">Enter 6 characters</span>
                  )}
                </div>
              )}
            </div>

            {/* Nickname Input */}
            <div>
              <label className="block text-white font-medium mb-3">
                Choose Your Nickname ({nickname.length}/20)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                placeholder="Enter your nickname"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                         transition-all duration-200"
                maxLength={20}
              />
            </div>

            {/* Suggested Nicknames */}
            <div>
              <label className="block text-white/70 font-medium mb-3 text-sm">
                Or pick a suggestion:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {suggestedNicknames.map((name) => (
                  <button
                    key={name}
                    onClick={() => selectSuggestedNickname(name)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm
                             hover:bg-white/10 hover:border-white/20 transition-all duration-200
                             hover:scale-105 active:scale-95"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Join Button */}
            <GradientButton
              variant="cyan"
              size="xl"
              onClick={joinGame}
              disabled={!isValidRoomCode(roomCode) || !nickname.trim() || isJoining}
              className="w-full"
            >
              {isJoining ? (
                <div className="flex items-center gap-3">
                  <LoadingSpinner size="sm" />
                  <span>Generating your card...</span>
                </div>
              ) : (
                'Join Game'
              )}
            </GradientButton>
          </GlassCard>

          {/* Info Card */}
          <GlassCard className="p-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold mb-2">What happens next?</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li className="leading-relaxed">• We'll generate your unique MYNGO card</li>
                  <li className="leading-relaxed">• You'll join the game room with other players</li>
                  <li className="leading-relaxed">• Mark numbers as they're called by the host</li>
                  <li className="leading-relaxed">• First to complete a horizontal, vertical, or diagonal row wins!</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Powered By Footer */}
        <div className="flex flex-col items-center gap-4 mt-16">
          <img 
            src="/poweredby.png" 
            alt="Powered by Bolt" 
            className="h-8 opacity-90 hover:opacity-100 transition-opacity duration-200"
          />
        </div>
      </div>
    </div>
  );
}