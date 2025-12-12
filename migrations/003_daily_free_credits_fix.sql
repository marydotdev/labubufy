-- Fix for bug where credits reset to 3 when reaching 0
-- The issue: can_claim_free_credits_today wasn't checking daily_free_credits table for user_id
-- Also: IP/fingerprint checks need to happen FIRST for anonymous users to prevent abuse
-- when signing out and creating a new anonymous session

-- Updated function to check if free credits can be claimed today
CREATE OR REPLACE FUNCTION can_claim_free_credits_today(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_browser_fingerprint TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_claim_date DATE;
  v_today DATE := CURRENT_DATE;
  v_has_user_claim BOOLEAN := false;
  v_has_ip_or_fingerprint_claim BOOLEAN := false;
BEGIN
  -- CRITICAL: Check IP address FIRST (most reliable, works across incognito)
  -- IP address is the primary defense against abuse since it doesn't change
  -- between normal and incognito sessions
  IF p_ip_address IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM daily_free_credits
      WHERE claimed_date = v_today
      AND ip_address = p_ip_address
    ) INTO v_has_ip_or_fingerprint_claim;

    IF v_has_ip_or_fingerprint_claim THEN
      RETURN false;
    END IF;
  END IF;

  -- Secondary check: Browser fingerprint (less reliable, can differ in incognito)
  -- Only check if IP address wasn't available
  IF p_ip_address IS NULL AND p_browser_fingerprint IS NOT NULL AND p_browser_fingerprint != '' THEN
    SELECT EXISTS(
      SELECT 1 FROM daily_free_credits
      WHERE claimed_date = v_today
      AND browser_fingerprint = p_browser_fingerprint
    ) INTO v_has_ip_or_fingerprint_claim;

    IF v_has_ip_or_fingerprint_claim THEN
      RETURN false;
    END IF;
  END IF;

  -- Fallback: If both IP and fingerprint are NULL, check for any NULL/NULL combination
  -- This prevents multiple claims when tracking info isn't available
  IF p_ip_address IS NULL AND (p_browser_fingerprint IS NULL OR p_browser_fingerprint = '') THEN
    SELECT EXISTS(
      SELECT 1 FROM daily_free_credits
      WHERE claimed_date = v_today
      AND ip_address IS NULL
      AND (browser_fingerprint IS NULL OR browser_fingerprint = '')
    ) INTO v_has_ip_or_fingerprint_claim;

    IF v_has_ip_or_fingerprint_claim THEN
      RETURN false;
    END IF;
  END IF;

  -- Then check if this specific user has claimed today in daily_free_credits table
  -- This is the most reliable check since it's set when credits are actually given
  SELECT EXISTS(
    SELECT 1 FROM daily_free_credits
    WHERE user_id = p_user_id
    AND claimed_date = v_today
  ) INTO v_has_user_claim;

  IF v_has_user_claim THEN
    RETURN false;
  END IF;

  -- Also check last_free_credits_at as a backup check
  SELECT DATE(last_free_credits_at) INTO v_last_claim_date
  FROM users
  WHERE id = p_user_id;

  IF v_last_claim_date = v_today THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
