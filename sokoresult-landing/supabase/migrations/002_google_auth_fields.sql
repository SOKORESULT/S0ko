-- ============================================================
-- SokoResult — Migration 002: Google Auth Fields
-- ============================================================

-- profiles: add email + auth_provider
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'phone'
    CHECK (auth_provider IN ('phone', 'google'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- login_attempts: add email + auth_method
ALTER TABLE login_attempts
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS auth_method TEXT
    CHECK (auth_method IN ('phone', 'google'));

-- news_stories: add category CHECK (was unconstrained before)
-- Safe: add constraint only if column has no invalid data
ALTER TABLE news_stories
  DROP CONSTRAINT IF EXISTS news_stories_category_check;

ALTER TABLE news_stories
  ADD CONSTRAINT news_stories_category_check
    CHECK (category IN ('politics', 'sports', 'entertainment', 'fashion'));
