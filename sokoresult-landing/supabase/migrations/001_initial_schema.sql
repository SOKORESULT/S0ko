-- ============================================================
-- SokoResult — Initial Schema
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Unique 8-char uppercase alphanumeric referral code generator
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT := '';
  i     INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid          TEXT UNIQUE NOT NULL,
  phone                 TEXT UNIQUE,
  display_name          TEXT,
  avatar_url            TEXT,
  kyc_tier              INT DEFAULT 0 CHECK (kyc_tier IN (0, 1, 2)),
  kyc_status            TEXT DEFAULT 'none' CHECK (kyc_status IN ('none','pending','approved','rejected','under_review')),
  kyc_submitted_at      TIMESTAMPTZ,
  kyc_approved_at       TIMESTAMPTZ,
  smile_job_id          TEXT,
  date_of_birth         DATE,
  is_over_18            BOOLEAN DEFAULT FALSE,
  referral_code         TEXT UNIQUE,
  referred_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  wallet_address        TEXT,
  encrypted_private_key TEXT,
  oko_balance_cached    BIGINT DEFAULT 0,
  kes_balance           BIGINT DEFAULT 0,
  fee_preference        TEXT DEFAULT 'kes' CHECK (fee_preference IN ('kes','oko')),
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- kyc_documents
CREATE TABLE IF NOT EXISTS kyc_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type       TEXT CHECK (document_type IN ('national_id','passport','utility_bill')),
  document_url        TEXT,
  smile_result_code   TEXT,
  smile_result_text   TEXT,
  verification_score  FLOAT,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- markets
CREATE TABLE IF NOT EXISTS markets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  question            TEXT NOT NULL,
  description         TEXT,
  category            TEXT CHECK (category IN ('politics','sports','entertainment','fashion')),
  status              TEXT DEFAULT 'open' CHECK (status IN ('open','closed','resolved','disputed')),
  yes_price           INT DEFAULT 50 CHECK (yes_price BETWEEN 0 AND 100),
  no_price            INT DEFAULT 50 CHECK (no_price BETWEEN 0 AND 100),
  total_volume        BIGINT DEFAULT 0,
  total_trades        INT DEFAULT 0,
  participant_count   INT DEFAULT 0,
  resolution_deadline TIMESTAMPTZ NOT NULL,
  resolved_at         TIMESTAMPTZ,
  outcome             TEXT CHECK (outcome IN ('yes','no')),
  resolver_type       TEXT CHECK (resolver_type IN ('auto','correspondent','admin')),
  creator_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  on_chain_market_id  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  market_id          UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side               TEXT CHECK (side IN ('buy','sell')),
  outcome_token      TEXT CHECK (outcome_token IN ('yes','no')),
  order_type         TEXT CHECK (order_type IN ('limit','market')),
  price              INT CHECK (price BETWEEN 0 AND 100),
  quantity           INT CHECK (quantity > 0),
  remaining_quantity INT CHECK (remaining_quantity >= 0),
  status             TEXT DEFAULT 'open' CHECK (status IN ('open','partial','filled','cancelled')),
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- trades
CREATE TABLE IF NOT EXISTS trades (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id            UUID REFERENCES markets(id) ON DELETE SET NULL,
  buyer_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  seller_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
  seller_order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  outcome_token        TEXT,
  price                INT,
  quantity             INT,
  total_value          BIGINT,
  fee_amount           BIGINT DEFAULT 0,
  fee_token            TEXT DEFAULT 'kes',
  settlement_batch_id  TEXT,
  settled_on_chain     BOOLEAN DEFAULT FALSE,
  tx_hash              TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- positions
CREATE TABLE IF NOT EXISTS positions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  market_id          UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  yes_shares         INT DEFAULT 0,
  no_shares          INT DEFAULT 0,
  avg_buy_price_yes  INT,
  avg_buy_price_no   INT,
  realized_pnl       BIGINT DEFAULT 0,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, market_id)
);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT CHECK (type IN ('deposit','withdrawal','trade_buy','trade_sell','fee','airdrop','conversion')),
  amount        BIGINT,
  currency      TEXT CHECK (currency IN ('kes','oko')),
  direction     TEXT CHECK (direction IN ('credit','debit')),
  reference_id  TEXT,
  balance_after BIGINT,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- news_stories
CREATE TABLE IF NOT EXISTS news_stories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  body                TEXT,
  source_name         TEXT NOT NULL,
  source_type         TEXT CHECK (source_type IN ('correspondent','wire','media','social','contributor')),
  source_url          TEXT,
  image_url           TEXT,
  category            TEXT,
  urgency             INT DEFAULT 1 CHECK (urgency BETWEEN 1 AND 5),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','disputed','retracted')),
  verified_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at         TIMESTAMPTZ,
  entities            JSONB DEFAULT '[]',
  linked_market_ids   UUID[] DEFAULT '{}',
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- airdrop_claims
CREATE TABLE IF NOT EXISTS airdrop_claims (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  airdrop_type TEXT CHECK (airdrop_type IN ('welcome','first_trade','referral','engagement','streak','correspondent','community','liquidity')),
  amount       BIGINT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','claimed','locked','expired')),
  locked_until TIMESTAMPTZ,
  tx_hash      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- login_attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid    ON profiles(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_phone           ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code   ON profiles(referral_code);

CREATE INDEX IF NOT EXISTS idx_markets_category_status  ON markets(category, status);
CREATE INDEX IF NOT EXISTS idx_markets_slug             ON markets(slug);

CREATE INDEX IF NOT EXISTS idx_orders_user_market_status ON orders(user_id, market_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_market_status_price ON orders(market_id, status, price);

CREATE INDEX IF NOT EXISTS idx_trades_market_created    ON trades(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_created     ON trades(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_seller_created    ON trades(seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_positions_user_market    ON positions(user_id, market_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_cat_status_pub      ON news_stories(category, verification_status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published_at        ON news_stories(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_phone_created      ON login_attempts(phone, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_markets_updated_at
  BEFORE UPDATE ON markets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
