# MYNGO - Features Implementation Guide

## Table of Contents
1. [Core Game Mechanics](#core-game-mechanics)
2. [Host Dashboard Functionality](#host-dashboard-functionality)
3. [Player Experience](#player-experience)
4. [Real-time Updates](#real-time-updates)
5. [Game State Management](#game-state-management)
6. [Winner Detection](#winner-detection)
7. [Demo Mode](#demo-mode)

## Core Game Mechanics

### Bingo Card Generation

#### Algorithm Overview
```typescript
export function generateMyngoCard(): MyngoCard {
  const card: MyngoCard = {
    M: getRandomNumbers(1, 15, 5),    // Column M: 1-15
    Y: getRandomNumbers(16, 30, 5),   // Column Y: 16-30
    N: getRandomNumbers(31, 45, 4),   // Column N: 31-45 (4 numbers + WILD)
    G: getRandomNumbers(46, 60, 5),   // Column G: 46-60
    O: getRandomNumbers(61, 75, 5)    // Column O: 61-75
  };
  return card;
}
```

#### Card Structure
- **5x5 Grid**: Traditional bingo layout
- **WILD Center**: Free space in the middle (N column, row 2)
- **Column Ranges**: Each letter has specific number ranges
- **Unique Numbers**: No duplicates within a card
- **Random Distribution**: Ensures fair gameplay

### Number Calling System

#### Manual Calling
```typescript
const callNextNumber = async () => {
  const availableNumbers = getAvailableNumbers(calledNumbers);
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  const number = availableNumbers[randomIndex];
  const letter = getLetterForNumber(number);
  
  await SupabaseService.callNumber(room.id, number, letter);
};
```

#### Automatic Calling
```typescript
// Auto-call timer with configurable frequency
useEffect(() => {
  if (!isAutoMode || isPaused || winnerPlayers.length > 0) return;

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
}, [isAutoMode, isPaused, autoInterval, winnerPlayers.length]);
```

### Game Timing Calculations

#### Optimal Call Frequency
```typescript
export function calculateCallFrequency(players: number, durationMinutes: number): number {
  // Step 1: Numbers needed for a winner (45 minus half the players)
  const numbersNeeded = 45 - (0.5 * players);
  
  // Step 2: Available time with 90% safety buffer
  const availableSeconds = durationMinutes * 60 * 0.90;
  
  // Step 3: Time between calls
  const secondsPerCall = Math.round(availableSeconds / numbersNeeded);
  
  return Math.max(10, Math.min(90, secondsPerCall)); // Clamp between 10-90 seconds
}
```

#### Calls Needed for Winner
```typescript
export function calculateCallsNeeded(players: number): number {
  // Formula: 50 - 10 * log10(n), rounded up
  const result = Math.ceil(50 - 10 * Math.log10(players));
  return Math.max(15, Math.min(75, result)); // Clamp between 15-75 calls
}
```

## Host Dashboard Functionality

### Game Control Interface

#### Auto/Manual Mode Toggle
```typescript
const toggleAutoMode = async () => {
  setIsAutoMode(!isAutoMode);
  if (!isAutoMode) {
    setCountdown(autoInterval);
  }
  
  // Update room config in Supabase
  const newConfig = {
    ...room.config,
    autoCall: { enabled: !isAutoMode }
  };
  await SupabaseService.updateRoomConfig(room.id, newConfig);
};
```

#### Game Settings Management
- **Room Open/Closed**: Control new player entry
- **Auto-call Frequency**: Adjustable timing (10-60 seconds)
- **Pause/Resume**: Temporary game suspension
- **Sound Toggle**: Audio feedback control

### Player Monitoring

#### Real-time Player List
```typescript
const PlayerList = ({ players, calledNumbers, onViewCard }) => {
  const getPlayerStatus = (player) => {
    if (player.is_winner === true) return 'winner';
    if (isCloseToWin(player.card, player.marked_numbers)) return 'close';
    return 'playing';
  };
  
  // Render players with status indicators
};
```

#### Player Card Inspection
- **View Any Player's Card**: Host can inspect individual cards
- **Progress Tracking**: See marked numbers and completion status
- **Winner Verification**: Confirm winning patterns

### Game Analytics

#### Live Statistics Display
- **Player Count**: Current and peak players
- **Numbers Called**: Progress tracking
- **Game Duration**: Real-time timer
- **Drop Rate**: Players who left during game

## Player Experience

### Interactive Bingo Card

#### Card Rendering
```typescript
const MyngoCard = ({ card, markedNumbers, calledNumbers, onMarkNumber }) => {
  const cardArray = convertCardToArray(card);
  const markedSet = new Set(markedNumbers);
  const calledSet = new Set(calledNumbers);
  
  return (
    <div className="grid grid-cols-5 gap-2">
      {cardArray.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <CardCell
            key={`${rowIndex}-${colIndex}`}
            value={cell}
            isMarked={cell === 'WILD' || markedSet.has(cell)}
            isCalled={cell === 'WILD' || calledSet.has(cell)}
            onClick={() => handleCellClick(cell)}
          />
        ))
      )}
    </div>
  );
};
```

#### Number Marking Logic
```typescript
const handleMarkNumber = useCallback((number: number) => {
  if (markedNumbers.includes(number)) return; // Already marked
  if (!calledNumbers.includes(number)) return; // Not called yet
  
  const newMarkedNumbers = [...markedNumbers, number];
  setMarkedNumbers(newMarkedNumbers);
  
  // Update in Supabase
  SupabaseService.updatePlayerMarkedNumbers(playerId, newMarkedNumbers);
}, [markedNumbers, calledNumbers, playerId]);
```

### Win Detection and Celebration

#### Pattern Recognition
```typescript
export function checkWin(card: MyngoCard, markedNumbers: number[]): WinCheck {
  const cardArray = cardToArray(card);
  const marked = new Set(markedNumbers);
  
  // Check rows
  for (let row = 0; row < 5; row++) {
    if (checkLine(cardArray, marked, row, 'row')) {
      return { hasWin: true, pattern: 'row', line: row };
    }
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    if (checkLine(cardArray, marked, col, 'column')) {
      return { hasWin: true, pattern: 'column', line: col };
    }
  }
  
  // Check diagonals
  if (checkDiagonal(cardArray, marked, 'main')) {
    return { hasWin: true, pattern: 'diagonal', line: 0 };
  }
  
  if (checkDiagonal(cardArray, marked, 'anti')) {
    return { hasWin: true, pattern: 'diagonal', line: 1 };
  }
  
  return { hasWin: false };
}
```

#### Winner Celebration
```typescript
const handleWin = useCallback(async () => {
  // Confetti animation
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });

  // Mark as winner in database
  await SupabaseService.markPlayerAsWinner(currentPlayer.id, room?.id);
}, [currentPlayer, room]);
```

## Real-time Updates

### Subscription Management

#### Room State Subscription
```typescript
const subscribeToRoom = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'rooms',
      filter: `id=eq.${roomId}`
    }, callback)
    .subscribe();
};
```

#### Player Updates
```typescript
const subscribeToPlayers = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`players-${roomId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `room_id=eq.${roomId}`
    }, callback)
    .subscribe();
};
```

### Event Handling

#### Real-time Event Processing
```typescript
// Handle different event types
if (payload.eventType === 'INSERT') {
  // New player joined
  setPlayers(prev => [...prev, payload.new]);
} else if (payload.eventType === 'UPDATE') {
  // Player updated (marked number, won, etc.)
  setPlayers(prev => prev.map(p => 
    p.id === payload.new.id ? payload.new : p
  ));
} else if (payload.eventType === 'DELETE') {
  // Player left
  setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
}
```

## Game State Management

### State Persistence

#### Game Completion Handling
```typescript
// When winner is declared, preserve game state
const markPlayerAsWinner = async (playerId: string, roomId: string) => {
  // Mark player as winner
  await supabase
    .from('players')
    .update({ is_winner: true })
    .eq('id', playerId);

  // Update room status to 'finished' for state persistence
  await supabase
    .from('rooms')
    .update({ status: 'finished' })
    .eq('id', roomId);
};
```

#### Session Management
```typescript
// Store player session for reconnection
sessionStorage.setItem(`myngo_player_${roomCode}`, playerId);

// Restore session on page refresh
const storedPlayerId = sessionStorage.getItem(`myngo_player_${roomCode}`);
if (storedPlayerId) {
  setPlayerId(storedPlayerId);
}
```

### Cleanup and Recovery

#### Automatic Cleanup
```typescript
// Browser navigation cleanup
useEffect(() => {
  const handleBeforeUnload = () => {
    if (navigator.sendBeacon && playerId) {
      const formData = new FormData();
      formData.append('action', 'remove_player');
      formData.append('playerId', playerId);
      navigator.sendBeacon('/cleanup', formData);
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [playerId]);
```

## Winner Detection

### Pattern Validation

#### Line Checking Algorithm
```typescript
function checkLine(
  cardArray: (number | 'WILD')[][],
  marked: Set<number>,
  index: number,
  type: 'row' | 'column'
): boolean {
  for (let i = 0; i < 5; i++) {
    const cell = type === 'row' ? cardArray[index][i] : cardArray[i][index];
    
    if (cell === 'WILD') continue; // WILD is always marked
    if (!marked.has(cell as number)) return false;
  }
  
  return true;
}
```

#### Diagonal Checking
```typescript
function checkDiagonal(
  cardArray: (number | 'WILD')[][],
  marked: Set<number>,
  type: 'main' | 'anti'
): boolean {
  for (let i = 0; i < 5; i++) {
    const cell = type === 'main' ? cardArray[i][i] : cardArray[i][4 - i];
    
    if (cell === 'WILD') continue;
    if (!marked.has(cell as number)) return false;
  }
  
  return true;
}
```

### Close-to-Win Detection

#### Near-Win Algorithm
```typescript
export function isCloseToWin(card: MyngoCard, markedNumbers: number[]): boolean {
  const cardArray = cardToArray(card);
  const marked = new Set(markedNumbers);
  
  // Check all possible winning lines
  const lines = [
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'row', index: i })),
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'column', index: i })),
    { type: 'diagonal', index: 0 },
    { type: 'diagonal', index: 1 }
  ];
  
  for (const line of lines) {
    let unmarkedCount = 0;
    // Count unmarked cells in this line
    // If exactly 1 unmarked, player is close to winning
    if (unmarkedCount === 1) return true;
  }
  
  return false;
}
```

## Demo Mode

### Bot Player Implementation

#### Automatic Bot Addition
```typescript
const addDemoBots = async (roomId: string) => {
  const botNames = ['MYNGO', 'LuckyCharm', 'MainPlay'];
  
  for (const botName of botNames) {
    const card = generateMyngoCard();
    
    await supabase
      .from('players')
      .insert({
        room_id: roomId,
        name: botName,
        card,
        marked_numbers: [],
        is_bot: true,
        is_winner: false
      });
  }
};
```

#### Bot Auto-Marking
```typescript
const autoBotMarkNumber = async (roomId: string, calledNumber: number) => {
  const bots = await getBotPlayers(roomId);
  
  for (const bot of bots) {
    if (bot.is_winner) continue; // Skip if already won
    
    const cardNumbers = getAllCardNumbers(bot.card);
    
    if (cardNumbers.includes(calledNumber)) {
      const newMarkedNumbers = [...bot.marked_numbers, calledNumber];
      
      await updateBotMarkedNumbers(bot.id, newMarkedNumbers);
      
      // Check if bot now has winning pattern
      await checkBotForWin(bot.id, bot.card, newMarkedNumbers, roomId);
    }
  }
};
```

This comprehensive feature implementation ensures a smooth, engaging, and technically robust bingo experience for both hosts and players.