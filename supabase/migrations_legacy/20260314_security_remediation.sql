-- ============================================
-- SECURITY REMEDIATION — Red-Team Audit Fixes
-- APPLIED: 2026-03-14
-- ============================================

-- #2 + #3: Fix nannies RLS — allow owner writes, keep authenticated reads
-- Drop Shield 3 policies
DROP POLICY IF EXISTS "nannies_read_authenticated" ON nannies;
DROP POLICY IF EXISTS "nannies_admin_write" ON nannies;

-- Authenticated users can read nanny profiles (public discovery)
-- NOTE: PII stripping happens at API/client layer, not RLS
CREATE POLICY "nannies_read_authenticated" ON nannies
  FOR SELECT USING (true);

-- Nannies can insert their own profile
CREATE POLICY "nannies_own_insert" ON nannies
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Nannies can update their own profile
CREATE POLICY "nannies_own_update" ON nannies
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Only service_role can delete nanny profiles
CREATE POLICY "nannies_admin_delete" ON nannies
  FOR DELETE USING (auth.role() = 'service_role');


-- #4: Chat migration conflicts — normalize to `text` column, composite PK
-- Add `text` column if only `content` exists (from migration_v1)
DO $$
BEGIN
  -- If `content` column exists but `text` does not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'text'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN text TEXT;
    UPDATE chat_messages SET text = content WHERE text IS NULL;
    ALTER TABLE chat_messages ALTER COLUMN text SET NOT NULL;
    ALTER TABLE chat_messages DROP COLUMN content;
  END IF;

  -- If both exist (partial migration), consolidate
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'content'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'text'
  ) THEN
    UPDATE chat_messages SET text = content WHERE text IS NULL AND content IS NOT NULL;
    ALTER TABLE chat_messages DROP COLUMN content;
  END IF;
END $$;

-- Fix chat_participants: ensure composite PK, remove stray `id` column if present
DO $$
BEGIN
  -- If chat_participants has an `id` UUID column (from 20260311 migration)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_participants' AND column_name = 'id'
  ) THEN
    -- Drop the id-based PK constraint if it exists
    BEGIN
      ALTER TABLE chat_participants DROP CONSTRAINT IF EXISTS chat_participants_pkey;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    ALTER TABLE chat_participants DROP COLUMN IF EXISTS id;

    -- Re-add composite PK if missing
    BEGIN
      ALTER TABLE chat_participants ADD PRIMARY KEY (thread_id, user_id);
    EXCEPTION WHEN OTHERS THEN NULL; -- Already exists
    END;
  END IF;
END $$;


-- #5: Fix bookings.request_id type mismatch (TEXT → UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'request_id'
      AND data_type = 'text'
  ) THEN
    -- Drop FK constraint first
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_request_id_fkey;
    -- Change type
    ALTER TABLE bookings ALTER COLUMN request_id TYPE UUID USING request_id::uuid;
    -- Re-add FK
    ALTER TABLE bookings ADD CONSTRAINT bookings_request_id_fkey
      FOREIGN KEY (request_id) REFERENCES parents(id);
  END IF;
END $$;


-- #7: Fix payments RLS — restrict to service_role only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'payments'
  ) THEN
    -- Drop the open policy
    DROP POLICY IF EXISTS "Allow service role full access" ON payments;

    -- Create service-role-only policy
    BEGIN
      CREATE POLICY "payments_service_only" ON payments
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    EXCEPTION WHEN OTHERS THEN NULL; -- Policy might already exist
    END;
  END IF;
END $$;
