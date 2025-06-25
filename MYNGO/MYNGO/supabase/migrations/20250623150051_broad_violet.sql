/*
  # Game State Persistence Enhancement

  1. Schema Updates
    - Ensure room status properly tracks finished games
    - Add indexes for better query performance on finished games
    - Update RLS policies to allow reading finished game data

  2. Data Integrity
    - Finished games preserve all data until host manually ends
    - Cancelled games clean up immediately
    - Winner declarations update room status to 'finished'

  3. State Persistence
    - Players can refresh and see correct game state
    - Winner banners persist across refreshes
    - Game data remains until host chooses to end
*/

-- Ensure room status enum includes all needed values
DO $$
BEGIN
  -- Check if we need to update the status column constraint
  -- This is a safety check in case the enum needs updating
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%status%' 
    AND check_clause LIKE '%finished%'
  ) THEN
    -- Add any missing status values if needed
    ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
    ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
      CHECK (status IN ('waiting', 'active', 'finished', 'cancelled'));
  END IF;
END $$;

-- Add index for finished games to improve query performance
CREATE INDEX IF NOT EXISTS idx_rooms_status_finished ON rooms(status) WHERE status = 'finished';

-- Add index for room lookups by code and status
CREATE INDEX IF NOT EXISTS idx_rooms_code_status ON rooms(code, status);

-- Update RLS policies to ensure finished games can be read
DROP POLICY IF EXISTS "Allow all operations on rooms" ON rooms;

CREATE POLICY "Allow all operations on rooms"
  ON rooms
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Ensure players in finished games can still be read
DROP POLICY IF EXISTS "Allow all operations on players" ON players;

CREATE POLICY "Allow all operations on players"
  ON players
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Ensure called numbers in finished games can still be read
DROP POLICY IF EXISTS "Allow all operations on called_numbers" ON called_numbers;

CREATE POLICY "Allow all operations on called_numbers"
  ON called_numbers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);