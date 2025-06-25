// MYNGO Game Utilities - Core game logic and card generation
// Created: Card generation, win detection, and game calculations

import { MyngoCard, WinCheck, CalledNumber } from '../types/myngo';

// Generate a random MYNGO card with proper column ranges
export function generateMyngoCard(): MyngoCard {
  const card: MyngoCard = {
    M: [],
    Y: [],
    N: [],
    G: [],
    O: []
  };

  // M column: 1-15
  card.M = getRandomNumbers(1, 15, 5);
  
  // Y column: 16-30
  card.Y = getRandomNumbers(16, 30, 5);
  
  // N column: 31-45 (only 4 numbers, WILD in center)
  card.N = getRandomNumbers(31, 45, 4);
  
  // G column: 46-60
  card.G = getRandomNumbers(46, 60, 5);
  
  // O column: 61-75
  card.O = getRandomNumbers(61, 75, 5);

  return card;
}

// Get random numbers from a range without duplicates
function getRandomNumbers(min: number, max: number, count: number): number[] {
  const numbers: number[] = [];
  const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    numbers.push(available.splice(randomIndex, 1)[0]);
  }
  
  return numbers.sort((a, b) => a - b);
}

// Check if a card has a winning pattern
export function checkWin(card: MyngoCard, markedNumbers: number[]): WinCheck {
  // Reduced logging for bot checks to avoid spam
  const isVerbose = markedNumbers?.length <= 5; // Only log details for first few checks
  
  if (isVerbose) {
    console.log('🔍 checkWin called with:', {
      cardExists: !!card,
      markedCount: markedNumbers?.length || 0,
      markedNumbers: markedNumbers?.slice(0, 10) // Log first 10 for debugging
    });
  }
  
  if (!card || !markedNumbers || markedNumbers.length === 0) {
    if (isVerbose) console.log('🔍 checkWin early return - missing data');
    return { hasWin: false };
  }
  
  try {
    const cardArray = cardToArray(card);
    const marked = new Set(markedNumbers);
    
    if (isVerbose) {
      console.log('🔍 checkWin processing card array and marked set');
      console.log('🔍 Card array structure:', cardArray);
      console.log('🔍 Marked numbers set:', Array.from(marked));
    }
  
    // Check rows
    for (let row = 0; row < 5; row++) {
      if (checkLine(cardArray, marked, row, 'row')) {
        console.log('🏆 WIN DETECTED - Row:', row);
        if (isVerbose) {
          console.log('🏆 Winning row cells:', cardArray[row]);
          console.log('🏆 Marked status for row:', cardArray[row].map(cell => 
            cell === 'WILD' ? 'WILD' : marked.has(cell as number) ? 'MARKED' : 'UNMARKED'
          ));
        }
        return { hasWin: true, pattern: 'row', line: row };
      }
    }
  
    // Check columns
    for (let col = 0; col < 5; col++) {
      if (checkLine(cardArray, marked, col, 'column')) {
        console.log('🏆 WIN DETECTED - Column:', col);
        if (isVerbose) {
          const columnCells = cardArray.map(row => row[col]);
          console.log('🏆 Winning column cells:', columnCells);
          console.log('🏆 Marked status for column:', columnCells.map(cell => 
            cell === 'WILD' ? 'WILD' : marked.has(cell as number) ? 'MARKED' : 'UNMARKED'
          ));
        }
        return { hasWin: true, pattern: 'column', line: col };
      }
    }
  
    // Check diagonals
    if (checkDiagonal(cardArray, marked, 'main')) {
      console.log('🏆 WIN DETECTED - Main diagonal');
      if (isVerbose) {
        const diagonalCells = cardArray.map((row, i) => row[i]);
        console.log('🏆 Winning main diagonal cells:', diagonalCells);
        console.log('🏆 Marked status for main diagonal:', diagonalCells.map(cell => 
          cell === 'WILD' ? 'WILD' : marked.has(cell as number) ? 'MARKED' : 'UNMARKED'
        ));
      }
      return { hasWin: true, pattern: 'diagonal', line: 0 };
    }
  
    if (checkDiagonal(cardArray, marked, 'anti')) {
      console.log('🏆 WIN DETECTED - Anti diagonal');
      if (isVerbose) {
        const diagonalCells = cardArray.map((row, i) => row[4 - i]);
        console.log('🏆 Winning anti diagonal cells:', diagonalCells);
        console.log('🏆 Marked status for anti diagonal:', diagonalCells.map(cell => 
          cell === 'WILD' ? 'WILD' : marked.has(cell as number) ? 'MARKED' : 'UNMARKED'
        ));
      }
      return { hasWin: true, pattern: 'diagonal', line: 1 };
    }
    
    if (isVerbose) console.log('🔍 checkWin - No win detected');
    return { hasWin: false };
  } catch (error) {
    console.error('❌ Error in checkWin:', error);
    return { hasWin: false };
  }
}

// Convert card object to 2D array for easier processing
function cardToArray(card: MyngoCard): (number | 'WILD')[][] {
  if (!card || !card.M || !card.Y || !card.N || !card.G || !card.O) {
    console.error('Invalid card structure:', card);
    throw new Error('Invalid card structure');
  }
  
  const array: (number | 'WILD')[][] = [];
  
  for (let row = 0; row < 5; row++) {
    array[row] = [];
    array[row][0] = card.M[row]; // M column
    array[row][1] = card.Y[row]; // Y column
    
    // N column - WILD in center (row 2)
    if (row === 2) {
      array[row][2] = 'WILD';
    } else {
      const nIndex = row < 2 ? row : row - 1;
      array[row][2] = card.N[nIndex];
    }
    
    array[row][3] = card.G[row]; // G column
    array[row][4] = card.O[row]; // O column
  }
  
  return array;
}

// Check if a line (row or column) is complete
function checkLine(
  cardArray: (number | 'WILD')[][],
  marked: Set<number>,
  index: number,
  type: 'row' | 'column'
): boolean {
  // Reduced logging for performance
  const isVerbose = false; // Set to true for debugging
  
  if (isVerbose) console.log(`🔍 Checking ${type} ${index}:`);
  
  for (let i = 0; i < 5; i++) {
    const cell = type === 'row' ? cardArray[index][i] : cardArray[i][index];
    if (isVerbose) console.log(`  Cell ${i}: ${cell} (${cell === 'WILD' ? 'WILD' : marked.has(cell as number) ? 'MARKED' : 'UNMARKED'})`);
    
    if (cell === 'WILD') continue;
    if (!marked.has(cell as number)) {
      if (isVerbose) console.log(`  ❌ ${type} ${index} incomplete - cell ${i} (${cell}) not marked`);
      return false;
    }
  }
  
  if (isVerbose) console.log(`  ✅ ${type} ${index} COMPLETE!`);
  return true;
}

// Check diagonal patterns
function checkDiagonal(
  cardArray: (number | 'WILD')[][],
  marked: Set<number>,
  type: 'main' | 'anti'
): boolean {
  // Reduced logging for performance
  const isVerbose = false; // Set to true for debugging
  
  if (isVerbose) console.log(`🔍 Checking ${type} diagonal:`);
  
  for (let i = 0; i < 5; i++) {
    const cell = type === 'main' ? cardArray[i][i] : cardArray[i][4 - i];
    if (isVerbose) console.log(`  Cell ${i}: ${cell} (${cell === 'WILD' ? 'WILD' : marked.has(cell as number) ? 'MARKED' : 'UNMARKED'})`);
    
    if (cell === 'WILD') continue;
    if (!marked.has(cell as number)) {
      if (isVerbose) console.log(`  ❌ ${type} diagonal incomplete - cell ${i} (${cell}) not marked`);
      return false;
    }
  }
  
  if (isVerbose) console.log(`  ✅ ${type} diagonal COMPLETE!`);
  return true;
}

// Calculate optimal call frequency based on players and duration
export function calculateCallFrequency(players: number, durationMinutes: number): number {
  console.log('🧮 Calculating call frequency for:', players, 'players,', durationMinutes, 'minutes');
  
  // Step 1: Numbers needed for a winner (45 minus half the players)
  const numbersNeeded = 45 - (0.5 * players);
  
  // Step 2: Available time with 90% safety buffer
  const availableSeconds = durationMinutes * 60 * 0.90;
  
  // Step 3: Time between calls
  const secondsPerCall = Math.round(availableSeconds / numbersNeeded);
  
  const result = Math.max(10, Math.min(90, secondsPerCall)); // Clamp between 10-90 seconds
  console.log('🧮 Call frequency result:', result, 'seconds');
  return result;
}

// Calculate calls needed for 99% chance of winner
export function calculateCallsNeeded(players: number): number {
  // Formula: 50 - 10 * log10(n), rounded up
  const result = Math.ceil(50 - 10 * Math.log10(players));
  return Math.max(15, Math.min(75, result)); // Clamp between 15-75 calls
}

// Calculate seconds between calls for optimal timing
export function calculateSecondsBetweenCalls(meetingMinutes: number, callsNeeded: number): number {
  const buffer = 0.85; // 85% buffer as specified
  const availableSeconds = meetingMinutes * 60 * buffer;
  const secondsPerCall = Math.round(availableSeconds / callsNeeded);
  return Math.max(5, Math.min(120, secondsPerCall)); // Clamp between 5-120 seconds
}

// Generate room code (6 characters, no ambiguous letters)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

// Get letter for a number
export function getLetterForNumber(num: number): 'M' | 'Y' | 'N' | 'G' | 'O' {
  if (num >= 1 && num <= 15) return 'M';
  if (num >= 16 && num <= 30) return 'Y';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  throw new Error(`Invalid MYNGO number: ${num}`);
}

// Format called number display
export function formatCalledNumber(number: CalledNumber): string {
  return `${number.letter}-${number.number}`;
}

// Check if player is close to winning (1 number away)
export function isCloseToWin(card: MyngoCard, markedNumbers: number[]): boolean {
  if (!card || !markedNumbers || markedNumbers.length === 0) {
    return false;
  }
  
  try {
    const cardArray = cardToArray(card);
    const marked = new Set(markedNumbers);
    
    // Check each possible winning line
    const lines = [
      // Rows
      ...Array.from({ length: 5 }, (_, i) => ({ type: 'row' as const, index: i })),
      // Columns
      ...Array.from({ length: 5 }, (_, i) => ({ type: 'column' as const, index: i })),
      // Diagonals
      { type: 'diagonal' as const, index: 0 }, // main diagonal
      { type: 'diagonal' as const, index: 1 }  // anti diagonal
    ];
    
    for (const line of lines) {
      let unmarkedCount = 0;
      
      if (line.type === 'row') {
        for (let col = 0; col < 5; col++) {
          const cell = cardArray[line.index][col];
          if (cell !== 'WILD' && !marked.has(cell as number)) {
            unmarkedCount++;
          }
        }
      } else if (line.type === 'column') {
        for (let row = 0; row < 5; row++) {
          const cell = cardArray[row][line.index];
          if (cell !== 'WILD' && !marked.has(cell as number)) {
            unmarkedCount++;
          }
        }
      } else if (line.type === 'diagonal') {
        for (let i = 0; i < 5; i++) {
          const cell = line.index === 0 ? cardArray[i][i] : cardArray[i][4 - i];
          if (cell !== 'WILD' && !marked.has(cell as number)) {
            unmarkedCount++;
          }
        }
      }
      
      if (unmarkedCount === 1) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in isCloseToWin:', error);
    return false;
  }
}

// Legacy function for backward compatibility - remove after refactor
export function isCloseToWinLegacy(card: MyngoCard, markedNumbers: number[]): boolean {
  if (!card || !markedNumbers || markedNumbers.length === 0) return false;
  
  const cardArray = cardToArray(card);
  const marked = new Set(markedNumbers);
  
  // Check each possible winning line
  const lines = [
    // Rows
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'row' as const, index: i })),
    // Columns
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'column' as const, index: i })),
    // Diagonals
    { type: 'diagonal' as const, index: 0 }, // main diagonal
    { type: 'diagonal' as const, index: 1 }  // anti diagonal
  ];
  
  for (const line of lines) {
    let unmarkedCount = 0;
    
    if (line.type === 'row') {
      for (let col = 0; col < 5; col++) {
        const cell = cardArray[line.index][col];
        if (cell !== 'WILD' && !marked.has(cell as number)) {
          unmarkedCount++;
        }
      }
    } else if (line.type === 'column') {
      for (let row = 0; row < 5; row++) {
        const cell = cardArray[row][line.index];
        if (cell !== 'WILD' && !marked.has(cell as number)) {
          unmarkedCount++;
        }
      }
    } else if (line.type === 'diagonal') {
      for (let i = 0; i < 5; i++) {
        const cell = line.index === 0 ? cardArray[i][i] : cardArray[i][4 - i];
        if (cell !== 'WILD' && !marked.has(cell as number)) {
          unmarkedCount++;
        }
      }
    }
    
    if (unmarkedCount === 1) {
      return true;
    }
  }
  
  return false;
}

// Get random MYNGO call for floating bubbles
export function getRandomMyngoCall(): string {
  const ranges = [
    { letter: 'M', min: 1, max: 15 },
    { letter: 'Y', min: 16, max: 30 },
    { letter: 'N', min: 31, max: 45 },
    { letter: 'G', min: 46, max: 60 },
    { letter: 'O', min: 61, max: 75 }
  ];
  
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const number = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  return `${range.letter}-${number}`;
}

// Get available numbers that haven't been called yet
export function getAvailableNumbers(calledNumbers: CalledNumber[]): number[] {
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  const calledSet = new Set(calledNumbers.map(call => call.number));
  return allNumbers.filter(num => !calledSet.has(num));
}