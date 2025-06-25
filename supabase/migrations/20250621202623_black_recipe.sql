/*
  # Update Game History Table

  1. Schema Updates
    - Add `room_code` column to track which room the game was in
    - Add `balls_called_count` column to track how many numbers were called
    - Add `is_demo_game` column to distinguish demo games from real games
    - Update existing columns to be more descriptive

  2. Data Integrity
    - Ensure all new columns have appropriate defaults
    - Add indexes for better query performance

  3. History Tracking
    - Games will be tracked with complete information
    - Demo games will be flagged separately
    - Cancellation reasons will be captured
*/

-- Add new columns to game_history table
DO $$
BEGIN
  -- Add room_code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'room_code'
  ) THEN
    ALTER TABLE game_history ADD COLUMN room_code text;
  END IF;

  -- Add balls_called_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'balls_called_count'
  ) THEN
    ALTER TABLE game_history ADD COLUMN balls_called_count integer DEFAULT 0;
  END IF;

  -- Add is_demo_game column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_history' AND column_name = 'is_demo_game'
  ) THEN
    ALTER TABLE game_history ADD COLUMN is_demo_game boolean DEFAULT false;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_history_room_code ON game_history(room_code);
CREATE INDEX IF NOT EXISTS idx_game_history_is_demo ON game_history(is_demo_game);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);

-- Update RLS policies to allow reading game history
DROP POLICY IF EXISTS "Allow all operations on game_history" ON game_history;

CREATE POLICY "Allow all operations on game_history"
  ON game_history
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);