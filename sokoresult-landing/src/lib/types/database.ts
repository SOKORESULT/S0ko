export interface Profile {
  id: string;
  firebase_uid: string;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  auth_provider: "phone" | "google" | "email";
  kyc_tier: 0 | 1 | 2;
  kyc_status: "none" | "pending" | "approved" | "rejected" | "under_review";
  kyc_submitted_at: string | null;
  kyc_approved_at: string | null;
  smile_job_id: string | null;
  date_of_birth: string | null;
  is_over_18: boolean;
  is_admin: boolean;
  referral_code: string | null;
  referred_by: string | null;
  wallet_address: string | null;
  encrypted_private_key: string | null;
  oko_balance_cached: number;
  kes_balance: number;
  fee_preference: "kes" | "oko";
  created_at: string;
  updated_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  document_type: "national_id" | "passport" | "utility_bill" | null;
  document_url: string | null;
  smile_result_code: string | null;
  smile_result_text: string | null;
  verification_score: number | null;
  created_at: string;
}

export interface Market {
  id: string;
  slug: string;
  question: string;
  description: string | null;
  category: "politics" | "sports" | "entertainment" | "fashion" | null;
  status: "open" | "closed" | "resolved" | "disputed";
  yes_price: number;
  no_price: number;
  total_volume: number;
  total_trades: number;
  participant_count: number;
  resolution_deadline: string;
  resolved_at: string | null;
  outcome: "yes" | "no" | null;
  resolver_type: "auto" | "correspondent" | "admin" | null;
  creator_id: string | null;
  on_chain_market_id: string | null;
  keywords: string[] | null;
  resolution_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  market_id: string;
  side: "buy" | "sell" | null;
  outcome_token: "yes" | "no" | null;
  order_type: "limit" | "market" | null;
  price: number | null;
  quantity: number | null;
  remaining_quantity: number | null;
  status: "open" | "partial" | "filled" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  market_id: string;
  buyer_id: string | null;
  seller_id: string | null;
  buyer_order_id: string | null;
  seller_order_id: string | null;
  outcome_token: string | null;
  price: number | null;
  quantity: number | null;
  total_value: number | null;
  fee_amount: number;
  fee_token: string;
  settlement_batch_id: string | null;
  settled_on_chain: boolean;
  tx_hash: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  user_id: string;
  market_id: string;
  yes_shares: number;
  no_shares: number;
  avg_buy_price_yes: number | null;
  avg_buy_price_no: number | null;
  realized_pnl: number;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: "deposit" | "withdrawal" | "trade_buy" | "trade_sell" | "fee" | "airdrop" | "conversion";
  amount: number | null;
  currency: "kes" | "oko" | null;
  direction: "credit" | "debit" | null;
  reference_id: string | null;
  balance_after: number | null;
  description: string | null;
  created_at: string;
}

export interface NewsStory {
  id: string;
  title: string;
  body: string | null;
  source_name: string;
  source_type: "correspondent" | "wire" | "media" | "social" | "contributor" | null;
  source_url: string | null;
  image_url: string | null;
  category: string | null;
  urgency: number;
  verification_status: "pending" | "verified" | "disputed" | "retracted";
  verified_by: string | null;
  verified_at: string | null;
  entities: unknown[];
  linked_market_ids: string[];
  published_at: string | null;
  created_at: string;
}

export interface AirdropClaim {
  id: string;
  user_id: string | null;
  airdrop_type:
    | "welcome"
    | "first_trade"
    | "referral"
    | "engagement"
    | "streak"
    | "correspondent"
    | "community"
    | "liquidity"
    | null;
  amount: number | null;
  status: "pending" | "claimed" | "locked" | "expired";
  locked_until: string | null;
  tx_hash: string | null;
  created_at: string;
}

export interface LoginAttempt {
  id: string;
  phone: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  auth_method: "phone" | "google" | null;
  success: boolean;
  created_at: string;
}

// Supabase Database generic type for typed client
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      kyc_documents: { Row: KycDocument; Insert: Partial<KycDocument>; Update: Partial<KycDocument> };
      markets: { Row: Market; Insert: Partial<Market>; Update: Partial<Market> };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> };
      trades: { Row: Trade; Insert: Partial<Trade>; Update: Partial<Trade> };
      positions: { Row: Position; Insert: Partial<Position>; Update: Partial<Position> };
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> };
      news_stories: { Row: NewsStory; Insert: Partial<NewsStory>; Update: Partial<NewsStory> };
      airdrop_claims: { Row: AirdropClaim; Insert: Partial<AirdropClaim>; Update: Partial<AirdropClaim> };
      login_attempts: { Row: LoginAttempt; Insert: Partial<LoginAttempt>; Update: Partial<LoginAttempt> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
