// ─── Mock Data — SokoResult Frontend Build ─────────────────────────────────
// All data is static. No API calls. Backend wiring comes later.

import type { Market } from "@/lib/types/database";

// ─── User ─────────────────────────────────────────────────────────────────────

export const MOCK_USER = {
  uid: "user_001",
  displayName: "Kodzilla",
  email: "kodzilla@gmail.com",
  photoURL: null as string | null,
  phone: "+254712345678",
  kycTier: 1 as 0 | 1 | 2,
  kycStatus: "approved",
  kesBalance: 1_245_000, // KES 12,450.00 in cents
  okoBalance: 250,
  referralCode: "KODZ2026",
  referralCount: 7,
  isAdmin: true,
  authProvider: "google" as "google" | "email" | "phone",
};

// ─── Price history generator ──────────────────────────────────────────────────

export interface PricePoint {
  day: number;
  date: string;
  yes: number;
  no: number;
  timestamp: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
}

function generatePriceHistory(endPrice: number, days = 30): PricePoint[] {
  const data: PricePoint[] = [];
  let price = Math.max(5, Math.min(95, endPrice - 15 + Math.random() * 30));
  for (let i = 0; i < days; i++) {
    price += (endPrice - price) * 0.05 + (Math.random() - 0.48) * 4;
    price = Math.max(2, Math.min(98, price));
    const rounded = Math.round(price);
    const ts = new Date(Date.now() - (days - i) * 86_400_000).toISOString();
    data.push({
      day: i,
      date: ts,
      timestamp: ts,
      yes: rounded,
      no: 100 - rounded,
      yesPrice: rounded,
      noPrice: 100 - rounded,
      volume: Math.floor(Math.random() * 50_000 + 5_000),
    });
  }
  // Pin last to current
  data[data.length - 1].yes = endPrice;
  data[data.length - 1].yesPrice = endPrice;
  data[data.length - 1].no = 100 - endPrice;
  data[data.length - 1].noPrice = 100 - endPrice;
  return data;
}

// ─── Markets ──────────────────────────────────────────────────────────────────

export interface MockMarket extends Market {
  priceHistory: PricePoint[];
  trending: boolean;
}

export const MOCK_MARKETS: MockMarket[] = [
  {
    id: "mkt_001", slug: "ruto-2027",
    question: "Will William Ruto win the 2027 Presidential Election?",
    description: "Resolves YES if Ruto is declared winner by IEBC after the August 2027 elections. Resolves NO if any other candidate wins or if the election is postponed beyond 2027.",
    category: "politics", status: "open", yes_price: 62, no_price: 38,
    total_volume: 4_200_000, total_trades: 8_472, participant_count: 2_841,
    resolution_deadline: "2027-08-15T00:00:00.000Z",
    trending: true, resolved_at: null, outcome: null,
    resolver_type: "correspondent", creator_id: null,
    on_chain_market_id: null, keywords: ["ruto", "election", "2027"],
    resolution_source: "IEBC official announcement",
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(62, 30),
  },
  {
    id: "mkt_002", slug: "gachagua-impeachment",
    question: "Will Gachagua's impeachment be upheld by courts?",
    description: "Resolves YES if Kenyan courts uphold the parliamentary impeachment of Rigathi Gachagua. Resolves NO if courts overturn the impeachment.",
    category: "politics", status: "open", yes_price: 71, no_price: 29,
    total_volume: 3_100_000, total_trades: 5_231, participant_count: 1_892,
    resolution_deadline: "2026-12-31T00:00:00.000Z",
    trending: true, resolved_at: null, outcome: null,
    resolver_type: "correspondent", creator_id: null,
    on_chain_market_id: null, keywords: ["gachagua", "impeachment"],
    resolution_source: "Court of Appeal ruling",
    created_at: "2026-01-15T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(71, 30),
  },
  {
    id: "mkt_003", slug: "harambee-stars-afcon",
    question: "Will Harambee Stars qualify for AFCON 2027?",
    description: "Resolves YES if Kenya qualifies for the Africa Cup of Nations 2027 through the qualification rounds.",
    category: "sports", status: "open", yes_price: 34, no_price: 66,
    total_volume: 1_800_000, total_trades: 3_201, participant_count: 1_203,
    resolution_deadline: "2026-12-31T00:00:00.000Z",
    trending: false, resolved_at: null, outcome: null,
    resolver_type: "auto", creator_id: null,
    on_chain_market_id: null, keywords: ["harambee stars", "afcon"],
    resolution_source: "CAF official results",
    created_at: "2026-01-20T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(34, 30),
  },
  {
    id: "mkt_004", slug: "gor-mahia-kpl-2026",
    question: "Will Gor Mahia win the KPL 2026 season?",
    description: "Resolves YES based on official Kenya Premier League standings at the end of the 2026 season.",
    category: "sports", status: "open", yes_price: 35, no_price: 65,
    total_volume: 950_000, total_trades: 1_876, participant_count: 723,
    resolution_deadline: "2026-11-30T00:00:00.000Z",
    trending: false, resolved_at: null, outcome: null,
    resolver_type: "auto", creator_id: null,
    on_chain_market_id: null, keywords: ["gor mahia", "kpl"],
    resolution_source: "KPL official standings",
    created_at: "2026-02-01T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(35, 30),
  },
  {
    id: "mkt_005", slug: "genz-protests-2026",
    question: "Will there be major Gen-Z protests in Kenya in 2026?",
    description: "Resolves YES if protests with 10,000+ participants occur in Nairobi in 2026, as reported by at least 3 verified media outlets.",
    category: "politics", status: "open", yes_price: 58, no_price: 42,
    total_volume: 2_700_000, total_trades: 4_512, participant_count: 1_654,
    resolution_deadline: "2026-12-31T00:00:00.000Z",
    trending: true, resolved_at: null, outcome: null,
    resolver_type: "correspondent", creator_id: null,
    on_chain_market_id: null, keywords: ["genz", "protests", "demonstrations"],
    resolution_source: "Verified media reports",
    created_at: "2026-01-10T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(58, 30),
  },
  {
    id: "mkt_006", slug: "shilling-usd-160",
    question: "Will KES/USD exchange rate exceed 160 by end of 2026?",
    description: "Resolves YES based on the Central Bank of Kenya official rate on December 31, 2026.",
    category: "politics", status: "open", yes_price: 42, no_price: 58,
    total_volume: 1_500_000, total_trades: 2_890, participant_count: 890,
    resolution_deadline: "2026-12-31T00:00:00.000Z",
    trending: false, resolved_at: null, outcome: null,
    resolver_type: "auto", creator_id: null,
    on_chain_market_id: null, keywords: ["shilling", "usd", "exchange rate"],
    resolution_source: "CBK official rate",
    created_at: "2026-02-10T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(42, 30),
  },
  {
    id: "mkt_007", slug: "nollywood-oscar-2028",
    question: "Will a Nollywood film win an Oscar by 2028?",
    description: "Resolves YES if any Nigerian-produced film wins an Academy Award in any category before the end of 2028.",
    category: "entertainment", status: "open", yes_price: 18, no_price: 82,
    total_volume: 890_000, total_trades: 1_567, participant_count: 967,
    resolution_deadline: "2028-03-31T00:00:00.000Z",
    trending: false, resolved_at: null, outcome: null,
    resolver_type: "correspondent", creator_id: null,
    on_chain_market_id: null, keywords: ["nollywood", "oscar", "academy award"],
    resolution_source: "Academy Awards official",
    created_at: "2026-03-01T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(18, 30),
  },
  {
    id: "mkt_008", slug: "lagos-fashion-week-viewers",
    question: "Will Lagos Fashion Week surpass 1M global viewers?",
    description: "Resolves YES if the official Lagos Fashion Week livestream exceeds 1 million unique viewers in the 2026 edition.",
    category: "fashion", status: "open", yes_price: 71, no_price: 29,
    total_volume: 2_100_000, total_trades: 4_102, participant_count: 1_567,
    resolution_deadline: "2026-10-31T00:00:00.000Z",
    trending: true, resolved_at: null, outcome: null,
    resolver_type: "correspondent", creator_id: null,
    on_chain_market_id: null, keywords: ["lagos fashion week", "fashion"],
    resolution_source: "LFW official viewership report",
    created_at: "2026-02-20T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(71, 30),
  },
  {
    id: "mkt_009", slug: "kipchoge-retires-2026",
    question: "Will Eliud Kipchoge announce retirement in 2026?",
    description: "Resolves YES if Eliud Kipchoge makes an official retirement announcement from professional marathon running in 2026.",
    category: "sports", status: "open", yes_price: 25, no_price: 75,
    total_volume: 670_000, total_trades: 1_234, participant_count: 543,
    resolution_deadline: "2026-12-31T00:00:00.000Z",
    trending: false, resolved_at: null, outcome: null,
    resolver_type: "correspondent", creator_id: null,
    on_chain_market_id: null, keywords: ["kipchoge", "retirement", "marathon"],
    resolution_source: "Official press announcement",
    created_at: "2026-03-05T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(25, 30),
  },
  {
    id: "mkt_010", slug: "mpesa-100m-users",
    question: "Will M-Pesa surpass 100M active users globally by 2027?",
    description: "Based on Safaricom official annual reports released in 2027.",
    category: "politics", status: "open", yes_price: 65, no_price: 35,
    total_volume: 1_200_000, total_trades: 2_345, participant_count: 876,
    resolution_deadline: "2027-12-31T00:00:00.000Z",
    trending: false, resolved_at: null, outcome: null,
    resolver_type: "auto", creator_id: null,
    on_chain_market_id: null, keywords: ["mpesa", "safaricom", "100 million"],
    resolution_source: "Safaricom annual report",
    created_at: "2026-03-15T00:00:00.000Z", updated_at: "2026-04-13T00:00:00.000Z",
    priceHistory: generatePriceHistory(65, 30),
  },
];

// ─── Positions ────────────────────────────────────────────────────────────────

export interface MockPosition {
  id: string;
  marketId: string;
  slug: string;
  question: string;
  yes_shares: number;
  no_shares: number;
  avg_buy_price_yes: number;
  avg_buy_price_no: number;
  currentPrice: number;
  category: string;
  unrealized_pnl: number;
  position_value: number;
  realized_pnl: number;
  market?: MockMarket;
}

export const MOCK_POSITIONS: MockPosition[] = [
  {
    id: "pos_001",
    marketId: "mkt_001", slug: "ruto-2027",
    question: "Will William Ruto win the 2027 Presidential Election?",
    yes_shares: 150, no_shares: 0,
    avg_buy_price_yes: 45, avg_buy_price_no: 0,
    currentPrice: 62, category: "politics",
    unrealized_pnl: (62 - 45) * 150 * 100, // in cents
    position_value: 62 * 150 * 100,
    realized_pnl: 0,
    market: MOCK_MARKETS[0],
  },
  {
    id: "pos_002",
    marketId: "mkt_005", slug: "genz-protests-2026",
    question: "Will there be major Gen-Z protests in Kenya in 2026?",
    yes_shares: 80, no_shares: 0,
    avg_buy_price_yes: 52, avg_buy_price_no: 0,
    currentPrice: 58, category: "politics",
    unrealized_pnl: (58 - 52) * 80 * 100,
    position_value: 58 * 80 * 100,
    realized_pnl: 0,
    market: MOCK_MARKETS[4],
  },
  {
    id: "pos_003",
    marketId: "mkt_008", slug: "lagos-fashion-week-viewers",
    question: "Will Lagos Fashion Week surpass 1M global viewers?",
    yes_shares: 0, no_shares: 200,
    avg_buy_price_yes: 0, avg_buy_price_no: 25,
    currentPrice: 29, category: "fashion",
    unrealized_pnl: (29 - 25) * 200 * 100,
    position_value: 29 * 200 * 100,
    realized_pnl: 0,
    market: MOCK_MARKETS[7],
  },
];

// ─── Trades ───────────────────────────────────────────────────────────────────

export interface MockTrade {
  id: string;
  market?: { id: string; slug: string; question: string };
  outcome_token: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  total_value: number;
  fee_amount: number;
  fee_token: string;
  created_at: string;
}

export const MOCK_TRADES: MockTrade[] = [
  {
    id: "t1",
    market: { id: "mkt_001", slug: "ruto-2027", question: "Will William Ruto win the 2027 Presidential Election?" },
    outcome_token: "yes", side: "buy", price: 45, quantity: 100,
    total_value: 4_500_00, fee_amount: 90_00, fee_token: "kes",
    created_at: new Date(Date.now() - 86_400_000 * 3).toISOString(),
  },
  {
    id: "t2",
    market: { id: "mkt_001", slug: "ruto-2027", question: "Will William Ruto win the 2027 Presidential Election?" },
    outcome_token: "yes", side: "buy", price: 48, quantity: 50,
    total_value: 2_400_00, fee_amount: 48_00, fee_token: "kes",
    created_at: new Date(Date.now() - 86_400_000 * 2).toISOString(),
  },
  {
    id: "t3",
    market: { id: "mkt_005", slug: "genz-protests-2026", question: "Will there be major Gen-Z protests in Kenya in 2026?" },
    outcome_token: "yes", side: "buy", price: 52, quantity: 80,
    total_value: 4_160_00, fee_amount: 83_00, fee_token: "kes",
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "t4",
    market: { id: "mkt_008", slug: "lagos-fashion-week-viewers", question: "Will Lagos Fashion Week surpass 1M global viewers?" },
    outcome_token: "no", side: "buy", price: 25, quantity: 200,
    total_value: 5_000_00, fee_amount: 100_00, fee_token: "kes",
    created_at: new Date(Date.now() - 3_600_000 * 5).toISOString(),
  },
];

// ─── News ─────────────────────────────────────────────────────────────────────

export interface MockNews {
  id: string;
  title: string;
  body?: string;
  source_name: string;
  source_type: "media" | "wire" | "contributor" | "correspondent" | "social";
  source_url?: string;
  image_url?: string;              // Scraped image thumbnail
  verification_status: "verified" | "pending" | "disputed";
  category: "politics" | "sports" | "entertainment" | "fashion";
  urgency: number;
  published_at: string;
  created_at: string;
  linkedMarket?: string;           // Legacy: single slug-based link
  linked_market_ids?: string[];    // Supabase: array of market UUIDs
  /** Set when source_type === "correspondent" */
  correspondent_name?: string;
  correspondent_publication?: string;
}

export const MOCK_NEWS: MockNews[] = [
  {
    id: "n1",
    title: "Ruto announces new digital economy initiative targeting youth employment",
    body: "President William Ruto unveiled a KES 50 billion digital economy fund aimed at creating 500,000 jobs for Kenyan youth by 2027, signaling a major policy push ahead of the election cycle.",
    source_name: "KTN News", source_type: "media",
    source_url: undefined,
    verification_status: "verified", category: "politics", urgency: 4,
    published_at: new Date(Date.now() - 3_600_000 * 2).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 2).toISOString(),
    linkedMarket: "ruto-2027",
  },
  {
    id: "n8",
    title: "Court of Appeal sets date for Gachagua impeachment review",
    body: "Kenya's Court of Appeal has scheduled a five-judge bench to hear the former Deputy President's petition challenging his removal from office, with proceedings expected to start next month.",
    source_name: "Capital FM", source_type: "media",
    verification_status: "verified", category: "politics", urgency: 5,
    published_at: new Date(Date.now() - 3_600_000 * 1).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 1).toISOString(),
    linkedMarket: "gachagua-impeachment",
  },
  {
    id: "n2",
    title: "Harambee Stars coach names provisional squad for World Cup qualifiers",
    body: "The newly appointed head coach has called up 25 players for the upcoming CAF World Cup 2026 qualification matches, with several European-based Kenyans included for the first time.",
    source_name: "Citizen Digital", source_type: "media",
    verification_status: "verified", category: "sports", urgency: 3,
    published_at: new Date(Date.now() - 3_600_000 * 4).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 4).toISOString(),
    linkedMarket: "harambee-stars-afcon",
  },
  {
    id: "n5",
    title: "Gen-Z activists announce nationwide day of action for August",
    body: "A coalition of youth-led organisations has announced a nationwide protest set for August, citing frustration with the government's failure to address unemployment and high cost of living.",
    source_name: "The Standard", source_type: "media",
    verification_status: "verified", category: "politics", urgency: 4,
    published_at: new Date(Date.now() - 3_600_000 * 10).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 10).toISOString(),
    linkedMarket: "genz-protests-2026",
  },
  {
    id: "n3",
    title: "Lagos Fashion Week organisers confirm expansion to Nairobi",
    body: "The Lagos Fashion Week brand will host a satellite event in Nairobi for the first time in October 2026, partnering with local designers and fashion houses.",
    source_name: "Independent", source_type: "contributor",
    verification_status: "pending", category: "fashion", urgency: 2,
    published_at: new Date(Date.now() - 3_600_000 * 6).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 6).toISOString(),
    linkedMarket: "lagos-fashion-week-viewers",
  },
  {
    id: "n4",
    title: "M-Pesa introduces new cross-border payment corridors across East Africa",
    body: "Safaricom's M-Pesa has launched new direct payment corridors with Uganda, Tanzania and Rwanda, part of its strategy to reach 100 million active users globally.",
    source_name: "NTV Kenya", source_type: "media",
    verification_status: "verified", category: "politics", urgency: 3,
    published_at: new Date(Date.now() - 3_600_000 * 8).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 8).toISOString(),
    linkedMarket: "mpesa-100m-users",
  },
  {
    id: "n6",
    title: "Kipchoge hints at one final marathon before retirement decision",
    body: "Marathon legend Eliud Kipchoge told reporters he plans to run at least one more major race before making any decision about his professional future.",
    source_name: "Nation Africa", source_type: "wire",
    verification_status: "verified", category: "sports", urgency: 3,
    published_at: new Date(Date.now() - 3_600_000 * 12).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 12).toISOString(),
    linkedMarket: "kipchoge-retires-2026",
  },
  {
    id: "n7",
    title: "Nollywood blockbuster breaks African box office records",
    body: "A new Nollywood production has shattered box office records across Africa, generating buzz about whether African cinema could finally break through at the Academy Awards.",
    source_name: "Pulse Nigeria", source_type: "media",
    verification_status: "verified", category: "entertainment", urgency: 2,
    published_at: new Date(Date.now() - 3_600_000 * 14).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 14).toISOString(),
    linkedMarket: "nollywood-oscar-2028",
  },
  {
    id: "n_corr_1",
    title: "Inside sources: Treasury circulating draft Finance Bill ahead of August budget",
    body: "Multiple senior officials at Treasury have confirmed that a draft Finance Bill is already being circulated internally, weeks before the official August budget presentation. The bill reportedly includes new capital gains provisions and a revised digital services tax framework.",
    source_name: "Capital FM Kenya", source_type: "correspondent",
    verification_status: "verified", category: "politics", urgency: 4,
    published_at: new Date(Date.now() - 3_600_000 * 3).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 3).toISOString(),
    linkedMarket: "ruto-2027",
    correspondent_name: "Jane Wanjiku",
    correspondent_publication: "Capital FM Kenya",
  },
  {
    id: "n_corr_2",
    title: "Exclusive: AFC Leopards board meeting ends without resolution on coach tenure",
    body: "A Kenyan Blogger FC board meeting held Thursday ended inconclusively, with directors split on whether to retain the current technical bench ahead of the league's second leg. A source close to the board says a final decision is expected within 48 hours.",
    source_name: "Standard Sports", source_type: "correspondent",
    verification_status: "verified", category: "sports", urgency: 3,
    published_at: new Date(Date.now() - 3_600_000 * 6).toISOString(),
    created_at: new Date(Date.now() - 3_600_000 * 6).toISOString(),
    correspondent_name: "Omar Hassan",
    correspondent_publication: "Standard Sports",
  },
];

// ─── Comments ─────────────────────────────────────────────────────────────────

export const MOCK_COMMENTS = [
  { id: "c1", user: "MkekaWaBets", avatar: null, body: "Ruto has this locked. The opposition is fragmented.", likes: 24, replies: 3, timeAgo: "2h ago" },
  { id: "c2", user: "NairobiOracle", avatar: null, body: "Don't sleep on this. 2027 is still far. Anything can happen.", likes: 18, replies: 1, timeAgo: "5h ago" },
  { id: "c3", user: "PredictorKE", avatar: null, body: "Bought 200 YES at 55. Already up 7 points. LFG", likes: 42, replies: 7, timeAgo: "1d ago" },
  { id: "c4", user: "SokoSharp", avatar: null, body: "The real question is whether the opposition can unite. If they do, this drops to 45.", likes: 31, replies: 5, timeAgo: "2d ago" },
];

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface MockTransaction {
  id: string;
  type: "deposit" | "withdrawal" | "trade_buy" | "trade_sell";
  amount: number; // KES cents (positive = credit, negative = debit)
  description: string;
  created_at: string;
}

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: "tx1", type: "deposit", amount: 500_000, description: "M-Pesa deposit", created_at: new Date(Date.now() - 86_400_000 * 5).toISOString() },
  { id: "tx2", type: "trade_buy", amount: -450_000, description: "Bought 100 YES — Ruto 2027", created_at: new Date(Date.now() - 86_400_000 * 3).toISOString() },
  { id: "tx3", type: "trade_buy", amount: -240_000, description: "Bought 50 YES — Ruto 2027", created_at: new Date(Date.now() - 86_400_000 * 2).toISOString() },
  { id: "tx4", type: "deposit", amount: 1_000_000, description: "M-Pesa deposit", created_at: new Date(Date.now() - 86_400_000).toISOString() },
  { id: "tx5", type: "trade_buy", amount: -416_000, description: "Bought 80 YES — Gen-Z protests", created_at: new Date(Date.now() - 86_400_000).toISOString() },
  { id: "tx6", type: "trade_buy", amount: -500_000, description: "Bought 200 NO — Lagos Fashion Week", created_at: new Date(Date.now() - 3_600_000 * 5).toISOString() },
];

// ─── Portfolio summary ────────────────────────────────────────────────────────

export const MOCK_PORTFOLIO_SUMMARY = {
  total_portfolio_value: MOCK_POSITIONS.reduce((s, p) => s + p.position_value, 0) / 100 + MOCK_USER.kesBalance / 100,
  unrealized_pnl: MOCK_POSITIONS.reduce((s, p) => s + p.unrealized_pnl, 0) / 100,
  realized_pnl: 0,
  net_pnl: MOCK_POSITIONS.reduce((s, p) => s + p.unrealized_pnl, 0) / 100,
  total_trades: MOCK_TRADES.length,
  markets_traded: 3,
  win_rate: 75,
  win_count: 3,
  resolved_count: 4,
  kes_balance: MOCK_USER.kesBalance / 100,
};

// ─── Portfolio chart data (30 days) ──────────────────────────────────────────

function generatePortfolioChart(days = 30) {
  const baseValue = 10_000;
  let value = baseValue;
  return Array.from({ length: days }, (_, i) => {
    value += (Math.random() - 0.43) * 400;
    value = Math.max(baseValue * 0.6, value);
    return {
      timestamp: new Date(Date.now() - (days - i) * 86_400_000).toISOString(),
      value: Math.round(value * 100) / 100,
    };
  });
}

export const MOCK_PORTFOLIO_CHART = generatePortfolioChart(30);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMarketBySlug(slug: string): MockMarket | undefined {
  return MOCK_MARKETS.find((m) => m.slug === slug);
}

export function getRelatedMarkets(market: MockMarket, count = 3): MockMarket[] {
  return MOCK_MARKETS
    .filter((m) => m.id !== market.id && m.category === market.category)
    .slice(0, count);
}

export function getPositionForMarket(marketId: string): MockPosition | undefined {
  return MOCK_POSITIONS.find((p) => p.marketId === marketId);
}

// ─── Correspondent ────────────────────────────────────────────────────────────

export interface MockCorrespondent {
  id: string;
  userId: string;
  publicationName: string;
  publicationType: string;
  businessEmail: string | null;
  xHandle: string | null;
  bio: string;
  beat: string;
  verificationStatus: "pending" | "approved" | "rejected" | "suspended";
  storyCount: number;
  accuracyScore: number;
  totalEarned: number; // KES cents
  portfolioUrl?: string;
}

export const MOCK_CORRESPONDENT: MockCorrespondent = {
  id: "corr_001",
  userId: "user_001",
  publicationName: "Capital FM Kenya",
  publicationType: "radio",
  businessEmail: "kodzilla@capitalfm.co.ke",
  xHandle: "@kodzilla_news",
  bio: "Political correspondent covering East African affairs for over 5 years. Previously at Nation Africa and NTV Kenya. Specialising in electoral politics, governance, and policy analysis.",
  beat: "politics",
  verificationStatus: "approved",
  storyCount: 23,
  accuracyScore: 94.2,
  totalEarned: 115_000, // KES 1,150 in cents
  portfolioUrl: "https://capitalfm.co.ke/author/kodzilla",
};

export interface MockCorrespondentApplication {
  id: string;
  userName: string;
  publication: string;
  email: string | null;
  xHandle: string | null;
  beat: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  appliedAt: string;
  storyCount?: number;
  accuracyScore?: number;
}

export const MOCK_CORRESPONDENT_APPLICATIONS: MockCorrespondentApplication[] = [
  { id: "app_001", userName: "Jane Wanjiku",  publication: "Nation Africa",   email: "jane@nation.africa",            xHandle: "@janewanjiku",  beat: "politics",      status: "pending",  appliedAt: "2026-04-10" },
  { id: "app_002", userName: "Omar Hassan",   publication: "The Standard",     email: "omar@standardmedia.co.ke",     xHandle: null,            beat: "sports",        status: "pending",  appliedAt: "2026-04-09" },
  { id: "app_003", userName: "Amani Kibiru",  publication: "Freelance",        email: null,                           xHandle: "@amanikibiru",  beat: "entertainment", status: "approved", appliedAt: "2026-04-05", storyCount: 7, accuracyScore: 91.4 },
  { id: "app_004", userName: "Fatuma Osman",  publication: "KTN News",         email: "fatuma@ktn.co.ke",             xHandle: "@fatumaktn",    beat: "politics",      status: "approved", appliedAt: "2026-03-28", storyCount: 14, accuracyScore: 88.0 },
  { id: "app_005", userName: "Brian Otieno",  publication: "Citizen Digital",  email: "brian@citizentv.co.ke",        xHandle: null,            beat: "sports",        status: "rejected", appliedAt: "2026-04-01" },
];

export interface MockCorrespondentPayment {
  id: string;
  amount: number; // KES cents
  reason: string;
  status: "pending" | "paid" | "failed";
  createdAt: string;
}

export const MOCK_CORRESPONDENT_PAYMENTS: MockCorrespondentPayment[] = [
  { id: "pay_001", amount: 5_000,  reason: "Story published: Ruto signals cabinet reshuffle",        status: "paid",    createdAt: new Date(Date.now() - 86_400_000 * 10).toISOString() },
  { id: "pay_002", amount: 5_000,  reason: "Story published: Gachagua appeals court ruling",         status: "paid",    createdAt: new Date(Date.now() - 86_400_000 * 7).toISOString() },
  { id: "pay_003", amount: 5_000,  reason: "Story published: Gen-Z organisers announce next rally",  status: "paid",    createdAt: new Date(Date.now() - 86_400_000 * 4).toISOString() },
  { id: "pay_004", amount: 5_000,  reason: "Story published: Harambee Stars squad confirmed",        status: "pending", createdAt: new Date(Date.now() - 86_400_000 * 1).toISOString() },
  { id: "pay_005", amount: 5_000,  reason: "Story published: Lagos Fashion Week international debut", status: "pending", createdAt: new Date(Date.now() - 3_600_000 * 6).toISOString() },
];

// ─── AI Predictions ───────────────────────────────────────────────────────────

export interface MockAIPrediction {
  marketId: string;
  marketQuestion: string;
  crowdPrice: number;
  aiProbability: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  keyFactors: string[];
  newsAnalyzed: number;
  updatedAt: string;
  model?: string;
}

export const MOCK_AI_PREDICTIONS: MockAIPrediction[] = [
  {
    marketId: "mkt_001",
    marketQuestion: "Will William Ruto win the 2027 Presidential Election?",
    crowdPrice: 62, aiProbability: 58, confidence: "medium",
    reasoning: "While Ruto maintains a lead in current polling, opposition consolidation talks and persistent economic headwinds — particularly youth unemployment above 38% — suggest the race is closer than the market currently implies. Historical precedent shows incumbents in Kenya rarely win by the margins early markets predict.",
    keyFactors: ["Opposition coalition talks ongoing", "Youth unemployment at 38%+", "Economic growth mixed signals", "Ruto's infrastructure projects show results"],
    newsAnalyzed: 8,
    updatedAt: new Date(Date.now() - 3_600_000 * 2).toISOString(),
    model: "gemini-2.0-flash",
  },
  {
    marketId: "mkt_002",
    marketQuestion: "Will the Gachagua impeachment be upheld by courts?",
    crowdPrice: 71, aiProbability: 75, confidence: "high",
    reasoning: "Legal precedent and court composition strongly favour upholding the impeachment. The constitutional provisions around impeachment are clear, and the grounds cited have been substantiated through documentary evidence. Limited avenues for reversal remain.",
    keyFactors: ["Court of Appeal composition favours ruling", "Constitutional provisions unambiguous", "Limited grounds for reversal", "Parliamentary vote margin decisive"],
    newsAnalyzed: 5,
    updatedAt: new Date(Date.now() - 3_600_000 * 4).toISOString(),
    model: "gemini-2.0-flash",
  },
  {
    marketId: "mkt_005",
    marketQuestion: "Will there be major Gen-Z protests in Kenya in 2026?",
    crowdPrice: 58, aiProbability: 68, confidence: "medium",
    reasoning: "Rising cost of living, sustained social media mobilisation infrastructure from 2024, and early planning signals from Gen-Z organisers make large-scale protests more likely than the market currently suggests. The movement has demonstrated organisational capacity.",
    keyFactors: ["Cost of living trajectory upward", "Social media organisation patterns active", "Historical protest frequency increasing", "2024 movement infrastructure intact"],
    newsAnalyzed: 12,
    updatedAt: new Date(Date.now() - 3_600_000 * 1).toISOString(),
    model: "gemini-2.0-flash",
  },
  {
    marketId: "mkt_003",
    marketQuestion: "Will Harambee Stars qualify for AFCON 2026?",
    crowdPrice: 34, aiProbability: 29, confidence: "low",
    reasoning: "Current squad depth and recent form in qualifying suggest qualification remains a long shot. Key injuries and a difficult group make the crowd price look slightly generous.",
    keyFactors: ["Group difficulty above average", "Key player injuries", "Recent form inconsistent", "Coach tenure uncertainty"],
    newsAnalyzed: 6,
    updatedAt: new Date(Date.now() - 3_600_000 * 8).toISOString(),
    model: "gemini-2.0-flash",
  },
];

export function getAIPredictionForMarket(marketId: string): MockAIPrediction | undefined {
  return MOCK_AI_PREDICTIONS.find((p) => p.marketId === marketId);
}
