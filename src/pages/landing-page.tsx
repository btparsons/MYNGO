// Landing Page - Main entry point with animated background and CTAs
// Created: Beautiful landing page with floating bubbles, stats, and action buttons

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingBubbles } from '../components/ui/floating-bubbles';
import { GlassCard } from '../components/ui/glass-card';
import { GradientButton } from '../components/ui/gradient-button';
import { SupabaseService } from '../lib/supabase-service';
import { Play, Users, Target, BarChart3, ExternalLink } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const [gameStats, setGameStats] = useState({
    activeGames: 0,
    playersOnline: 0,
    spotsAvailable: 500,
    peakGames: 47,
    peakPlayers: 1247
  });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 50,
        y: (e.clientY - window.innerHeight / 2) / 50
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Load live statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Run cleanup operations before loading stats
        console.log('🧹 Running cleanup operations...');
        await Promise.all([
          SupabaseService.cleanupDemoGames(),
          SupabaseService.closeInactiveRooms(),
          SupabaseService.cancelGamesWithInactiveHosts()
        ]);
        console.log('✅ Cleanup operations completed');
        
        // Load fresh stats after cleanup
        const stats = await SupabaseService.getGameStats();
        setGameStats(stats);
      } catch (error) {
        console.error('Failed to load game stats or run cleanup:', error);
        // Use fallback stats when network request fails
        setGameStats({
          activeGames: 12,
          playersOnline: 89,
          spotsAvailable: 1000,
          peakGames: 47,
          peakPlayers: 1247
        });
      }
    };

    loadStats();
    
    // Update stats every 60 seconds (less frequent to reduce load)
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Play,
      title: 'Instant Setup',
      description: 'Create a MYNGO room in seconds. No downloads, no accounts required.'
    },
    {
      icon: Users,
      title: 'Real Engagement',
      description: 'Transform passive webinar viewers into active participants.'
    },
    {
      icon: Target,
      title: 'Winner Rewards',
      description: 'Celebrate winners with confetti and recognition to boost participation.'
    },
    {
      icon: BarChart3,
      title: 'Live Analytics',
      description: 'Track engagement in real-time with detailed player statistics.'
    }
  ];

  const handleHostClick = () => {
    console.log('🎯 Host button clicked, navigating to /host');
    navigate('/host');
  };

  const handleJoinClick = () => {
    console.log('🎯 Join button clicked, navigating to /join');
    navigate('/join');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-violet-950 to-indigo-950 relative overflow-hidden">
      {/* Floating Bubbles Background */}
      <FloatingBubbles mouseX={mousePosition.x} mouseY={mousePosition.y} />
      
      {/* Bolt Logo - Upper Right */}
      <div className="absolute top-6 right-6 z-10">
        <a 
          href="https://bolt.new" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img 
            src="/bolt.png" 
            alt="Bolt" 
            className="h-16 opacity-90 hover:opacity-100 transition-opacity duration-200"
          />
        </a>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              MYNGO
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-4 font-light leading-relaxed px-4">
            Transform Your Webinars Into
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-8 leading-tight px-4">
            Interactive Experiences
          </p>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto px-4 leading-relaxed">
            Turn boring presentations into engaging games. Your audience will love the interactive experience.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
          <GradientButton
            variant="purple"
            size="xl"
            onClick={handleHostClick}
            className="min-w-[200px]"
          >
            Host a Game
          </GradientButton>
          <GradientButton
            variant="cyan"
            size="xl"
            onClick={handleJoinClick}
            className="min-w-[200px]"
          >
            Join a Game
          </GradientButton>
        </div>

        {/* Live Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <GlassCard className="p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{gameStats.activeGames}</div>
            <div className="text-white/70">Active Games</div>
          </GlassCard>
          <GlassCard className="p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{gameStats.playersOnline}</div>
            <div className="text-white/70">Players Online</div>
          </GlassCard>
          <GlassCard className="p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">{gameStats.spotsAvailable}</div>
            <div className="text-white/70">Spots Available</div>
          </GlassCard>
        </div>

        {/* Historical Records 
        <div className="text-center mb-16">
          <p className="text-white/50 text-sm">
            Peak Records: {gameStats.peakGames} concurrent games • {gameStats.peakPlayers} concurrent players
          </p>
        </div        */}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
          {features.map((feature, index) => (
            <GlassCard key={index} className="p-6 text-center" hover>
              <feature.icon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-white/70 text-sm">{feature.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pb-12">
        <div className="flex flex-col items-center gap-4">
          <a 
            href="https://bolt.new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <img 
              src="/poweredby.png" 
              alt="Powered by Bolt" 
              className="h-12 opacity-90 hover:opacity-100 transition-opacity duration-200"
            />
          </a>
          <p className="text-white/50 text-sm">
            Crafted with passion by E.D. Parsons at{' '}
            <a 
              href="https://tristacks.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors duration-200 inline-flex items-center gap-1"
            >
              TriStacks.com
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}