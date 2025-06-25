/*
  # Fix players_end column constraint

  1. Schema Fix
    - Make `players_end` column nullable since we don't know the final count when starting a game
    - Update existing records to have proper defaults
    - Ensure data integrity is maintained

  2. Data Integrity
    - Set default value for players_end when creating initial records
    - Update existing records that might have constraint issues
*/

-- Make players_end nullable since we don't know the end count when starting a game
ALTER TABLE game_history ALTER COLUMN players_end DROP NOT NULL;

-- Update any existing records that might have issues
UPDATE game_history 
SET players_end = players_start 
WHERE players_end IS NULL;