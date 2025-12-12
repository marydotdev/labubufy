-- migrations/001_simplified_auth.sql
-- Simplified authentication and user management schema

-- Simplified users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User credits with better tracking
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 3 CHECK (balance >= 0),
  lifetime_purchased INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,
  subscription_tier TEXT,
  subscription_expires_at TIMESTAMPTZ,
  last_refill_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Function to ensure user exists (called from auth service)
CREATE OR REPLACE FUNCTION ensure_user_exists(
  auth_id UUID,
  email TEXT DEFAULT NULL,
  is_anonymous BOOLEAN DEFAULT true
) RETURNS JSON AS $$
DECLARE
  v_user users;
  v_credits user_credits;
BEGIN
  -- Insert or get user
  INSERT INTO users (auth_id, email, is_anonymous)
  VALUES (auth_id, email, is_anonymous)
  ON CONFLICT (auth_id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    is_anonymous = EXCLUDED.is_anonymous,
    updated_at = now()
  RETURNING * INTO v_user;

  -- Ensure credits exist
  INSERT INTO user_credits (user_id, balance)
  VALUES (v_user.id, 3)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO v_credits;

  -- Return combined data
  RETURN json_build_object(
    'id', v_user.id,
    'auth_id', v_user.auth_id,
    'email', v_user.email,
    'is_anonymous', v_user.is_anonymous,
    'credits', COALESCE(v_credits.balance, (SELECT balance FROM user_credits WHERE user_id = v_user.id))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own credits" ON user_credits;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can read own credits" ON user_credits
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

