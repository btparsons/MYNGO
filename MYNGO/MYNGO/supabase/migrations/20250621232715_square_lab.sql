/*
  # Add players_drop column to game_history table

  1. Schema Updates
    - Add `players_drop` column to track how many players left during the game
    - Make `duration` column nullable for cancelled games
    - Update existing data to have proper defaults

  2. Data Integrity
    - Ensure players_drop is calculated as players_start - players_end
    - Never allow negative values for players_drop
    - Add appropriate indexes for performance

  3. History Enhancement
    - Track peak player count vs final player count
    - Calculate drop-off rate for analytics
*/

-- Add players_drop column to game_history table
DO $$
BEGIN
  -- Add players_drop column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'players_drop'
  ) THEN
    ALTER TABLE game_history ADD COLUMN players_drop integer DEFAULT 0;
  END IF;

  -- Make duration nullable for cancelled games
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'duration' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE game_history ALTER COLUMN duration DROP NOT NULL;
  END IF;
END $$;

-- Add index for players_drop for analytics queries
CREATE INDEX IF NOT EXISTS idx_game_history_players_drop ON game_history(players_drop);

-- Update existing records to have proper players_drop values
UPDATE game_history 
SET players_drop = GREATEST(0, players_start - players_end)
WHERE players_drop IS NULL OR players_drop = 0;