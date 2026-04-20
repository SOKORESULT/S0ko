-- ============================================================
-- SokoResult — Migration 003: Add 'email' to auth provider checks
-- ============================================================

-- Drop and re-add auth_provider constraint to include 'email'
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_auth_provider_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_auth_provider_check
    CHECK (auth_provider IN ('phone', 'google', 'email'));

-- Drop and re-add auth_method constraint to include 'email'
ALTER TABLE login_attempts
  DROP CONSTRAINT IF EXISTS login_attempts_auth_method_check;

ALTER TABLE login_attempts
  ADD CONSTRAINT login_attempts_auth_method_check
    CHECK (auth_method IN ('phone', 'google', 'email'));
