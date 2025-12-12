-- migrations/002_add_credits_function.sql
-- Function to add credits to a user account
-- This function is used by the payment success handler

CREATE OR REPLACE FUNCTION add_credits(
  user_id UUID,
  amount INTEGER,
  transaction_type TEXT DEFAULT 'purchase',
  stripe_session_id TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_credits user_credits;
BEGIN
  -- Get current credits
  SELECT * INTO v_credits
  FROM user_credits
  WHERE user_credits.user_id = add_credits.user_id;

  -- If credits don't exist, create them
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, balance, lifetime_purchased)
    VALUES (add_credits.user_id, amount, amount)
    RETURNING * INTO v_credits;
  ELSE
    -- Update credits
    UPDATE user_credits
    SET
      balance = v_credits.balance + amount,
      lifetime_purchased = v_credits.lifetime_purchased + amount,
      updated_at = now()
    WHERE user_credits.user_id = add_credits.user_id
    RETURNING * INTO v_credits;
  END IF;

  -- Return updated credits
  RETURN json_build_object(
    'user_id', v_credits.user_id,
    'balance', v_credits.balance,
    'lifetime_purchased', v_credits.lifetime_purchased,
    'lifetime_spent', v_credits.lifetime_spent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

