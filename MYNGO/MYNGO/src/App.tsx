import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/landing-page';
import { HostSetup } from './pages/host-setup';
import { JoinGame } from './pages/join-game';
import { HostDashboard } from './pages/host-dashboard';
import { PlayerGame } from './pages/player-game';

function App() {
  console.log('🚀 App component rendering');
  
  return (
    <Router>
      <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/host" element={<HostSetup />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/host/:roomCode" element={<HostDashboard />} />
        <Route path="/play/:roomCode" element={<PlayerGame />} />
      </Routes>
      </div>
    </Router>
  );
}

export default App;
