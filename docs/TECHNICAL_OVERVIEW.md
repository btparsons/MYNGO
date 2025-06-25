# MYNGO - Technical Architecture Overview

## Table of Contents
1. [Application Structure](#application-structure)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Real-time Features](#real-time-features)
5. [Component Hierarchy](#component-hierarchy)
6. [Data Flow](#data-flow)
7. [State Management](#state-management)

## Application Structure

### File Organization
```
src/
├── components/           # Reusable UI and game components
│   ├── myngo/           # Game-specific components
│   │   ├── myngo-card.tsx
│   │   ├── player-list.tsx
│   │   └── called-numbers-panel.tsx
│   └── ui/              # Generic UI components
│       ├── glass-card.tsx
│       ├── gradient-button.tsx
│       ├── loading-spinner.tsx
│       ├── status-bar.tsx
│       └── floating-bubbles.tsx
├── hooks/               # Custom React hooks
│   └── use-myngo-room.ts
├── lib/                 # External service integrations
│   ├── supabase.ts
│   └── supabase-service.ts
├── pages/               # Route components
│   ├── landing-page.tsx
│   ├── host-setup.tsx
│   ├── host-dashboard.tsx
│   ├── join-game.tsx
│   └── player-game.tsx
├── store/               # State management
│   └── myngo-store.ts
├── types/               # TypeScript definitions
│   └── myngo.ts
└── utils/               # Game logic and utilities
    └── myngo-utils.ts
```

## Technology Stack

### Frontend
- **React 18.3.1**: Component-based UI with hooks
- **TypeScript 5.5.3**: Type safety and developer experience
- **Vite 5.4.2**: Fast build tool and development server
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **React Router DOM 6.20.1**: Client-side routing
- **Zustand 4.4.7**: Lightweight state management

### Backend & Database
- **Supabase**: Backend-as-a-Service platform
  - PostgreSQL database with real-time subscriptions
  - Row Level Security (RLS) for data protection
  - WebSocket connections for real-time updates

### Additional Libraries
- **Lucide React 0.344.0**: Icon library
- **Canvas Confetti 1.9.2**: Winner celebration effects

## Database Schema

### Tables Overview

#### `rooms`
```sql
CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_id text NOT NULL,
  config jsonb NOT NULL,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `players`
```sql
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  card jsonb NOT NULL,
  marked_numbers integer[] DEFAULT '{}',
  is_bot boolean DEFAULT false,
  is_winner boolean DEFAULT false,
  joined_at timestamptz DEFAULT now()
);
```

#### `called_numbers`
```sql
CREATE TABLE called_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  number integer NOT NULL,
  letter text NOT NULL,
  called_at timestamptz DEFAULT now()
);
```

#### `game_history`
```sql
CREATE TABLE game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_number integer DEFAULT nextval('game_history_game_number_seq'),
  players_start integer NOT NULL,
  players_end integer,
  players_drop integer DEFAULT 0,
  winner_name text,
  duration integer,
  ending_status text NOT NULL,
  room_code text,
  balls_called_count integer DEFAULT 0,
  is_demo_game boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Relationships
```
rooms (1) ──── (many) players
rooms (1) ──── (many) called_numbers
rooms (1) ──── (many) game_history (via room_code)
```

### Indexes for Performance
```sql
-- Room lookups
CREATE INDEX idx_rooms_code_status ON rooms(code, status);
CREATE INDEX idx_rooms_status_finished ON rooms(status) WHERE status = 'finished';

-- Game history analytics
CREATE INDEX idx_game_history_created_at ON game_history(created_at);
CREATE INDEX idx_game_history_is_demo ON game_history(is_demo_game);
CREATE INDEX idx_game_history_room_code ON game_history(room_code);
CREATE INDEX idx_game_history_players_drop ON game_history(players_drop);
```

## Real-time Features

### Supabase Real-time Implementation

#### Connection Management
```typescript
// Real-time subscriptions for live updates
const roomSubscription = supabase
  .channel(`room-${roomId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'rooms',
    filter: `id=eq.${roomId}`
  }, handleRoomUpdate)
  .subscribe();
```

#### Event Types Handled
1. **Room Updates**: Status changes, config updates
2. **Player Events**: Join, leave, mark numbers, win
3. **Number Calls**: Real-time number announcements
4. **Presence Tracking**: Host/player connection status

### Real-time Data Flow
```
Host Action → Supabase → Real-time Event → All Clients → UI Update
```

## Component Hierarchy

### Page Components
```
App
├── LandingPage
├── HostSetup
├── HostDashboard
│   ├── StatusBar
│   ├── PlayerList
│   ├── CalledNumbersPanel
│   └── GameControls
├── JoinGame
└── PlayerGame
    ├── StatusBar
    ├── MyngoCard
    └── CalledNumbersPanel (mobile modal)
```

### Shared Components
```
UI Components
├── GlassCard (glassmorphism container)
├── GradientButton (styled buttons)
├── LoadingSpinner (loading states)
├── StatusBar (game status display)
└── FloatingBubbles (animated background)

Game Components
├── MyngoCard (interactive bingo card)
├── PlayerList (real-time player display)
└── CalledNumbersPanel (number history)
```

## Data Flow

### Host Dashboard Flow
```
1. Host creates room → Supabase stores room config
2. Players join → Real-time player list updates
3. Host calls number → Supabase broadcasts to all players
4. Players mark cards → Real-time progress updates
5. Winner detected → Game completion flow
```

### Player Game Flow
```
1. Player joins with room code → Generates unique card
2. Real-time subscription → Receives number calls
3. Interactive card marking → Updates sent to Supabase
4. Win detection → Automatic celebration and notification
```

### Real-time Synchronization
```
Database Change → Supabase Real-time → WebSocket → Client Update → React Re-render
```

## State Management

### Custom Hooks
- **`useMyngoRoom`**: Manages room state, players, and real-time subscriptions
- Handles connection management, error states, and cleanup

### Zustand Store (Optional)
- Lightweight state management for complex UI state
- Complements React's built-in state management

### Local State Patterns
```typescript
// Component-level state for UI interactions
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Real-time data from custom hook
const { room, players, calledNumbers, loading } = useMyngoRoom(roomCode);
```

## Performance Optimizations

### React Optimizations
- **Memoization**: `useMemo` for expensive calculations
- **Callback Optimization**: `useCallback` for event handlers
- **Component Splitting**: Prevent unnecessary re-renders

### Database Optimizations
- **Indexes**: Strategic indexing for common queries
- **RLS Policies**: Efficient row-level security
- **Connection Pooling**: Supabase handles connection management

### Real-time Optimizations
- **Subscription Management**: Proper cleanup to prevent memory leaks
- **Event Batching**: Efficient handling of rapid updates
- **Presence Tracking**: Lightweight heartbeat system

This architecture provides a scalable, maintainable foundation for real-time multiplayer gaming with excellent developer experience and user performance.