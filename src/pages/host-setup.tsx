// Host Setup Page - Three-step room creation process
// Updated: Improved layout, larger text, removed analytics, added auto-close policy

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/glass-card';
import { GradientButton } from '../components/ui/gradient-button';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { calculateCallFrequency, calculateCallsNeeded, calculateSecondsBetweenCalls, generateRoomCode } from '../utils/myngo-utils';
import { SupabaseService } from '../lib/supabase-service';
import { HelpCircle, Copy, Check, Sparkles, ArrowLeft, AlertTriangle, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameSettings {
  expectedPlayers: number;
  meetingDuration: number;
  demoMode: boolean;
}

export function HostSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [showSetupHelp, setShowSetupHelp] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const [settings, setSettings] = useState<GameSettings>({
    expectedPlayers: 25,
    meetingDuration: 30,
    demoMode: false
  });

  // Debug logging
  useEffect(() => {
    console.log('🏗️ HostSetup component mounted, step:', step);
    console.log('🏗️ Settings:', settings);
  }, []);

  useEffect(() => {
    console.log('🏗️ Step changed to:', step);
  }, [step]);
  
  const callFrequency = calculateCallFrequency(settings.expectedPlayers, settings.meetingDuration);
  const callsNeeded = calculateCallsNeeded(settings.expectedPlayers);
  const secondsBetweenCalls = calculateSecondsBetweenCalls(settings.meetingDuration, callsNeeded);

  const handleSliderChange = (field: keyof GameSettings, value: number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: keyof GameSettings, checked: boolean) => {
    setSettings(prev => ({ ...prev, [field]: checked }));
  };

  const createRoom = async () => {
    console.log('🏗️ Creating room with settings:', settings);
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('🏗️ Environment check:', {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      // Create room in Supabase
      const hostId = `host_${Date.now()}`;
      const roomConfig = {
        expectedPlayers: settings.expectedPlayers,
        meetingDuration: settings.meetingDuration,
        demoMode: settings.demoMode,
        autoCall: {
          enabled: true // Set to true as intended
        },
        isPaused: false,  // Initialize pause state
        autoClose: true,
        autoCloseMinutes: 120,
        callFrequency
      };

      console.log('🏗️ Creating room with autoCall.enabled = true:', roomConfig);
      
      // Test Supabase connection first
      console.log('🔍 Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('rooms')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Supabase connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      console.log('✅ Supabase connection test passed');
      
      const room = await SupabaseService.createRoom(hostId, roomConfig);
      console.log('🏗️ Room created successfully:', room);
      
      // Validate room creation
      if (!room || !room.id || !room.code) {
        console.error('❌ Invalid room data structure:', room);
        throw new Error('Invalid room data received from server');
      }
      
      setCreatedRoom(room);

      // Add demo bots if enabled
      if (settings.demoMode) {
        console.log('🏗️ Adding demo bots...');
        try {
          await SupabaseService.addDemoBots(room.id);
          console.log('✅ Demo bots added successfully');
        } catch (botError) {
          console.error('⚠️ Failed to add demo bots (non-critical):', botError);
          // Don't fail room creation if bot addition fails
        }
      }

      // Micro confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      
      setStep(3);
    } catch (error) {
      console.error('🏗️ Failed to create room:', error);
      console.error('🏗️ Error stack:', error.stack);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create room. Please try again.';
      if (error.message.includes('Database connection failed')) {
        errorMessage = 'Unable to connect to the database. Please check your internet connection and try again.';
      } else if (error.message.includes('Invalid room data')) {
        errorMessage = 'Room was created but data is incomplete. Please try again.';
      } else if (error.message.includes('Failed to create game history')) {
        errorMessage = 'Room created but failed to initialize game tracking. Please try again.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const copyRoomCode = async () => {
    if (!createdRoom) return;
    await navigator.clipboard.writeText(createdRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startDashboard = () => {
    if (!createdRoom) return;
    
    console.log('🏗️ Starting dashboard for room:', createdRoom.code);
    console.log('🏗️ Navigating to:', `/host/${createdRoom.code}`);
    console.log('🏗️ Room data:', createdRoom);
    
    setIsNavigating(true);
    
    // Store host session info
    sessionStorage.setItem(`myngo_host_${createdRoom.code}`, 'true');
    sessionStorage.setItem(`myngo_host_room_id`, createdRoom.id);
    sessionStorage.setItem(`myngo_host_data`, JSON.stringify(createdRoom));
    
    console.log('🏗️ Session storage set, navigating immediately');
    
    // Navigate immediately - no delay needed
    navigate(`/host/${createdRoom.code}`);
  };

  // Validate created room data
  useEffect(() => {
    if (createdRoom) {
      console.log('🏗️ Validating created room:', createdRoom);
      if (!createdRoom.id || !createdRoom.code) {
        console.error('🏗️ Invalid room data:', createdRoom);
        setError('Room creation incomplete. Please try again.');
        setCreatedRoom(null);
      }
    }
  }, [createdRoom]);

  const HelpDropdown = () => (
    <div className="absolute top-12 right-0 w-80 z-20">
      <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl">
        <h4 className="text-white font-semibold mb-3 text-lg">How Auto-Call Frequency is Calculated</h4>
        <div className="text-white/80 text-base space-y-2">
          <p><strong>Example:</strong> {settings.expectedPlayers} players, {settings.meetingDuration}-minute meeting</p>
          
          <div className="space-y-1">
            <p><strong>Step 1:</strong> Numbers needed for a winner</p>
            <p className="text-white/60">Formula: 45 minus (half the number of players)</p>
            <p className="text-white/60">Calculation: 45 - (0.5 × {settings.expectedPlayers}) = {45 - (0.5 * settings.expectedPlayers)} numbers needed</p>
          </div>
          
          <div className="space-y-1">
            <p><strong>Step 2:</strong> Available time with safety buffer</p>
            <p className="text-white/60">Formula: Meeting minutes × 60 × 90%</p>
            <p className="text-white/60">Calculation: {settings.meetingDuration} × 60 × 0.90 = {settings.meetingDuration * 60 * 0.90} seconds</p>
          </div>
          
          <div className="space-y-1">
            <p><strong>Step 3:</strong> Time between calls</p>
            <p className="text-white/60">Formula: Available seconds ÷ numbers needed</p>
            <p className="text-white/60">Calculation: {settings.meetingDuration * 60 * 0.90} ÷ {45 - (0.5 * settings.expectedPlayers)} = {callFrequency} seconds per call</p>
          </div>
          
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-2 mt-3">
            <p className="text-purple-300 font-semibold">Result: Call a number every {callFrequency} seconds for best results!</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SetupHelpDropdown = () => (
    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-80 z-20">
      <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold text-lg">Game Setup Tips</h4>
          <button
            onClick={() => setShowSetupHelp(false)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-white/80 text-base space-y-3 text-left">
          <div>
            <p className="text-cyan-300 font-semibold">• How many people are joining?</p>
            <p className="text-white/70">Enter the number of participants expected in your webinar. This helps calculate the best timing for the game.</p>
          </div>
          
          <div>
            <p className="text-cyan-300 font-semibold">• How long is your meeting?</p>
            <p className="text-white/70">Enter your presentation length in minutes. This determines how to space out the bingo number calls (includes extra time for welcome and questions).</p>
          </div>
          
          <div>
            <p className="text-cyan-300 font-semibold">• Automatic timing calculation</p>
            <p className="text-white/70">The system calculates how many numbers to call and when to call them, ensuring someone will likely win by the end of your presentation.</p>
          </div>
          
          <div>
            <p className="text-cyan-300 font-semibold">• Calling numbers yourself?</p>
            <p className="text-white/70">If you prefer to call numbers manually instead of using auto-play, follow the timing guide to keep the game moving and ensure there's a winner.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-900 via-fuchsia-800 to-cyan-900 p-6">
      <div className="container mx-auto max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${step >= num 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white/10 text-white/50'
                  }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Game Settings */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight px-4 mb-4">
                Game Settings
              </h1>
              <p className="text-white/70 px-4 leading-relaxed text-lg">
                Configure your MYNGO game for the perfect experience
              </p>
              
              {/* Tips Button */}
              <div className="mt-6 relative">
                <GradientButton
                  variant="cyan"
                  size="sm"
                  onClick={() => setShowSetupHelp(!showSetupHelp)}
                >
                  TIPS
                </GradientButton>
                {showSetupHelp && <SetupHelpDropdown />}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Settings Panel */}
              <GlassCard className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Expected Players */}
                  <div>
                    <label className="block text-white font-medium mb-3 text-lg">
                      How many people do you expect in your meeting? 
                    </label>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-white">{settings.expectedPlayers}</div>
                      <div className="text-white/60 text-base">players</div>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={settings.expectedPlayers}
                      onChange={(e) => handleSliderChange('expectedPlayers', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-white/50 text-base mt-1">
                      <span>10</span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* Meeting Duration */}
                  <div>
                    <label className="block text-white font-medium mb-3 text-lg">
                      How long will your meeting last?
                    </label>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-white">{settings.meetingDuration}</div>
                      <div className="text-white/60 text-base">minutes</div>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="90"
                      step="5"
                      value={settings.meetingDuration}
                      onChange={(e) => handleSliderChange('meetingDuration', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-white/50 text-base mt-1">
                      <span>15 min</span>
                      <span>90 min</span>
                    </div>
                  </div>

                  {/* Demo Mode */}
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <label className="text-white font-medium text-lg">Explore the Host Dashboard in Demo Mode</label>
                        <input
                          type="checkbox"
                          checked={settings.demoMode}
                          onChange={(e) => handleCheckboxChange('demoMode', e.target.checked)}
                          className="w-5 h-5 text-purple-500 rounded focus:ring-purple-500"
                        />
                      </div>
                      <p className="text-white/60 text-base">Three bot players will be added automatically. Call numbers to see their card stats update in real time. Click a player to view their full card. Cancel the game anytime when you're done exploring the experience.</p>
                    </div>
                  </div>

                </div>
              </GlassCard>

              {/* Calculation Cards */}
              <div className="space-y-6">
                {/* Card A: Calls Needed for 99% Chance */}
                <GlassCard className="p-6">
                  <h3 className="text-white font-semibold mb-4 text-lg">Calls Needed for Winner</h3>
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">
                        {callsNeeded}
                      </div>
                      <div className="text-green-300 text-base font-medium">
                        calls for 99% chance of winner
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Card B: Seconds Between Calls */}
                <GlassCard className="p-6">
                  <h3 className="text-white font-semibold mb-4 text-lg">Optimal Call Timing</h3>
                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">
                        {secondsBetweenCalls}s
                      </div>
                      <div className="text-blue-300 text-base font-medium">
                        between each call
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Auto-Close Policy Card */}
                <GlassCard className="p-6">
                  <h3 className="text-white font-semibold mb-4 text-lg">Auto-Close Policy</h3>
                  <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-white/80 text-base leading-relaxed">
                          All games automatically close after 2 hours of inactivity to keep the platform running smoothly.
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* Continue Button - moved up to be visible without scrolling */}
            <div className="flex justify-center mt-8">
              <GradientButton
                variant="purple"
                size="lg"
                onClick={() => setStep(2)}
              >
                Continue
              </GradientButton>
            </div>
          </div>
        )}

        {/* Step 2: Review Settings */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight px-4">
                Review Settings
              </h1>
              <p className="text-white/70 px-4 leading-relaxed text-lg">
                Double-check your game configuration
              </p>
            </div>

            <GlassCard className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-semibold mb-2 text-lg">Expected Players</h3>
                    <p className="text-white/70 text-base">{settings.expectedPlayers} players</p>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2 text-lg">Meeting Duration</h3>
                    <p className="text-white/70 text-base">{settings.meetingDuration} minutes</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-semibold mb-2 text-lg">Demo Mode</h3>
                    <p className="text-white/70 text-base">{settings.demoMode ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2 text-lg">Recommended Call Frequency</h3>
                  <p className="text-fuchsia-300 text-base">Call every {callFrequency} seconds for optimal gameplay</p>
                  <div className="mt-2 text-cyan-400 text-base">
                    🎯 Perfect timing for your audience size 🎯
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-red-400 hover:text-red-300 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex justify-between">
              <GradientButton
                variant="pink"
                size="lg"
                onClick={() => setStep(1)}
                className="border border-cyan-400/30 hover:border-cyan-400/50"
              >
                Back
              </GradientButton>
              <GradientButton
                variant="purple"
                size="lg"
                onClick={createRoom}
                disabled={isCreating || !!error}
                className="border border-cyan-400/30 hover:border-cyan-400/50"
              >
                {isCreating ? <LoadingSpinner size="sm" /> : 'Create Room'}
              </GradientButton>
            </div>
          </div>
        )}

        {/* Step 3: Room Created */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight px-4">
                Room Created! 🎉
              </h1>
              <p className="text-white/70 px-4 leading-relaxed text-lg">
                Share this code with your participants
              </p>
            </div>

            <GlassCard className="p-8 text-center">
              <div className="mb-6">
                <h2 className="text-white/70 text-lg mb-2">Room Code</h2>
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white font-mono tracking-wider mb-4 break-all">
                  {createdRoom?.code}
                </div>
                <GradientButton
                  variant="pink"
                  size="md"
                  onClick={copyRoomCode}
                  className="min-w-[120px] border border-cyan-400/30 hover:border-cyan-400/50"
                >
                  {copied ? 'Copied!' : 'Copy Code'}
                </GradientButton>
              </div>

              <div className="border-t border-white/10 pt-6">
                {/* Error Display for Step 3 */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-red-300 text-sm">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-red-400 hover:text-red-300 text-xs underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                
                <GradientButton
                  variant="purple"
                  size="xl"
                  onClick={startDashboard}
                  disabled={!createdRoom || isNavigating}
                  className="border border-cyan-400/30 hover:border-cyan-400/50"
                >
                  {isNavigating ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Loading Dashboard...</span>
                    </div>
                  ) : (
                    'Start Dashboard'
                  )}
                </GradientButton>
              </div>
            </GlassCard>
          </div>
        )}

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