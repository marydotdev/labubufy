-- migrations/003_daily_free_credits.sql
-- Add daily free credits tracking to prevent abuse

-- Add last_free_credits_at column to users table to track when free credits were last given
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_free_credits_at TIMESTAMPTZ;

-- Create immutable function to convert timestamptz to date in UTC
-- This is needed for generated columns which must be immutable
CREATE OR REPLACE FUNCTION to_utc_date(ts TIMESTAMPTZ) RETURNS DATE AS $$
  SELECT (ts AT TIME ZONE 'UTC')::date;
$$ LANGUAGE SQL IMMUTABLE;

-- Create table to track daily free credit claims by IP/browser fingerprint
CREATE TABLE IF NOT EXISTS daily_free_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET,
  browser_fingerprint TEXT,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  claimed_date DATE GENERATED ALWAYS AS (to_utc_date(claimed_at)) STORED,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient lookups using the generated date column
CREATE INDEX IF NOT EXISTS idx_daily_free_credits_ip_date
ON daily_free_credits(ip_address, claimed_date);

CREATE INDEX IF NOT EXISTS idx_daily_free_credits_fingerprint_date
ON daily_free_credits(browser_fingerprint, claimed_date);

CREATE INDEX IF NOT EXISTS idx_daily_free_credits_user_date
ON daily_free_credits(user_id, claimed_date);

-- Function to check if free credits can be claimed today
CREATE OR REPLACE FUNCTION can_claim_free_credits_today(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_browser_fingerprint TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_claim_date DATE;
  v_today DATE := CURRENT_DATE;
  v_has_ip_claim BOOLEAN := false;
  v_has_fingerprint_claim BOOLEAN := false;
BEGIN
  -- Check if user has claimed today
  SELECT DATE(last_free_credits_at) INTO v_last_claim_date
  FROM users
  WHERE id = p_user_id;

  IF v_last_claim_date = v_today THEN
    RETURN false;
  END IF;

  -- For anonymous users, also check IP and browser fingerprint
  -- This prevents abuse by creating multiple accounts
  IF p_ip_address IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM daily_free_credits
      WHERE ip_address = p_ip_address
      AND claimed_date = v_today
    ) INTO v_has_ip_claim;

    IF v_has_ip_claim THEN
      RETURN false;
    END IF;
  END IF;

  IF p_browser_fingerprint IS NOT NULL AND p_browser_fingerprint != '' THEN
    SELECT EXISTS(
      SELECT 1 FROM daily_free_credits
      WHERE browser_fingerprint = p_browser_fingerprint
      AND claimed_date = v_today
    ) INTO v_has_fingerprint_claim;

    IF v_has_fingerprint_claim THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old function first to avoid signature conflicts
-- We need to drop all possible overloads - use CASCADE to handle dependencies
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all overloads of ensure_user_exists
  FOR r IN
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE proname = 'ensure_user_exists'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s.%s(%s) CASCADE',
      'public', r.proname, r.args);
  END LOOP;
END $$;

-- Updated ensure_user_exists function with daily free credits logic
-- This function works with both schema variants:
-- 1. Credits in users table (newer schema)
-- 2. Credits in user_credits table (older schema)
CREATE OR REPLACE FUNCTION ensure_user_exists(
  auth_id UUID,
  email TEXT DEFAULT NULL,
  is_anonymous BOOLEAN DEFAULT true,
  ip_address INET DEFAULT NULL,
  browser_fingerprint TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user users;
  v_credits INTEGER;
  v_can_claim BOOLEAN;
  v_existing_credits INTEGER;
  v_user_credits_exists BOOLEAN;
  v_balance INTEGER;
  v_has_auth_id BOOLEAN;
  v_has_auth_user_id BOOLEAN;
  v_auth_id_value UUID;
BEGIN
  -- Check which auth ID column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_id'
  ) INTO v_has_auth_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_user_id'
  ) INTO v_has_auth_user_id;

  -- Insert or get user using the correct column name
  IF v_has_auth_id THEN
    INSERT INTO users (auth_id, email, is_anonymous)
    VALUES (auth_id, email, is_anonymous)
    ON CONFLICT (auth_id)
    DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      is_anonymous = EXCLUDED.is_anonymous,
      updated_at = now()
    RETURNING * INTO v_user;
  ELSIF v_has_auth_user_id THEN
    INSERT INTO users (auth_user_id, email, is_anonymous)
    VALUES (auth_id, email, is_anonymous)
    ON CONFLICT (auth_user_id)
    DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      is_anonymous = EXCLUDED.is_anonymous,
      updated_at = now()
    RETURNING * INTO v_user;
  ELSE
    RAISE EXCEPTION 'Neither auth_id nor auth_user_id column found in users table';
  END IF;

  -- Check if users table has credits column (newer schema)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'credits'
  ) INTO v_user_credits_exists;

  -- Get existing credits based on schema
  IF v_user_credits_exists THEN
    -- Newer schema: credits in users table
    SELECT COALESCE(credits, 0) INTO v_existing_credits
    FROM users
    WHERE id = v_user.id;
  ELSE
    -- Older schema: credits in user_credits table
    SELECT COALESCE(balance, 0) INTO v_balance
    FROM user_credits
    WHERE user_id = v_user.id;
    v_existing_credits := COALESCE(v_balance, 0);

    -- If no credits record exists, create one
    IF v_balance IS NULL THEN
      INSERT INTO user_credits (user_id, balance)
      VALUES (v_user.id, 0)
      ON CONFLICT (user_id) DO NOTHING;
      v_existing_credits := 0;
    END IF;
  END IF;

  -- Check if user can claim free credits today
  v_can_claim := can_claim_free_credits_today(
    v_user.id,
    ip_address,
    browser_fingerprint
  );

  -- If user can claim free credits today and has 0 credits, give them 3
  -- Also check if last_free_credits_at is NULL or from a different day
  IF v_can_claim AND v_existing_credits = 0 THEN
    IF v_user_credits_exists THEN
      -- Update credits in users table
      UPDATE users
      SET
        credits = 3,
        last_free_credits_at = now(),
        updated_at = now()
      WHERE id = v_user.id
      RETURNING credits INTO v_credits;
    ELSE
      -- Update credits in user_credits table
      UPDATE user_credits
      SET
        balance = 3,
        updated_at = now()
      WHERE user_id = v_user.id
      RETURNING balance INTO v_credits;

      -- Update last_free_credits_at in users table
      UPDATE users
      SET last_free_credits_at = now()
      WHERE id = v_user.id;
    END IF;

    -- Record the claim in daily_free_credits table
    INSERT INTO daily_free_credits (ip_address, browser_fingerprint, user_id)
    VALUES (ip_address, browser_fingerprint, v_user.id);
  ELSE
    -- Use existing credits
    v_credits := v_existing_credits;
  END IF;

  -- Return combined data (return auth_user_id for compatibility with code expectations)
  -- Get the actual auth ID value - use the parameter value since we just inserted/updated with it
  v_auth_id_value := auth_id;

  RETURN json_build_object(
    'id', v_user.id,
    'auth_user_id', v_auth_id_value,  -- Code expects auth_user_id
    'auth_id', v_auth_id_value,        -- Also include auth_id for compatibility
    'email', v_user.email,
    'is_anonymous', v_user.is_anonymous,
    'credits', v_credits,
    'total_purchased', COALESCE((SELECT total_purchased FROM users WHERE id = v_user.id), 0),
    'total_spent', COALESCE((SELECT total_spent FROM users WHERE id = v_user.id), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

