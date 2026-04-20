-- ============================================================
-- SokoResult — Seed Data
-- 6 sample markets
-- ============================================================

INSERT INTO markets (
  id,
  slug,
  question,
  description,
  category,
  status,
  yes_price,
  no_price,
  total_volume,
  total_trades,
  participant_count,
  resolution_deadline,
  resolver_type,
  created_at,
  updated_at
) VALUES

(
  gen_random_uuid(),
  'ruto-wins-2027-presidential-election',
  'Will William Ruto win the 2027 Presidential Election?',
  'The 2027 Kenyan general election is scheduled for August 2027. Will incumbent President William Ruto secure a second term, defeating challengers from opposition coalitions?',
  'politics',
  'open',
  62,
  38,
  4820000,
  1834,
  612,
  '2027-08-09 06:00:00+03',
  'correspondent',
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'harambee-stars-afcon-2027-qualification',
  'Will Harambee Stars qualify for AFCON 2027?',
  'Kenya''s national football team has struggled to qualify for the Africa Cup of Nations in recent cycles. Will they break the drought and make it to AFCON 2027?',
  'sports',
  'open',
  34,
  66,
  2150000,
  987,
  441,
  '2026-11-15 20:00:00+03',
  'auto',
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'nollywood-film-oscar-2028',
  'Will a Nollywood film win an Oscar by 2028?',
  'Nigeria''s film industry is the second largest in the world by volume. As African cinema gains global recognition, will a Nollywood production take home an Academy Award before 2028?',
  'entertainment',
  'open',
  18,
  82,
  890000,
  423,
  289,
  '2028-03-01 00:00:00+03',
  'correspondent',
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'lagos-fashion-week-1m-viewers',
  'Will Lagos Fashion Week surpass 1M global viewers?',
  'Lagos Fashion Week has grown into Africa''s premier fashion event. Will its cumulative global live and replay viewership exceed 1 million for the 2026 edition?',
  'fashion',
  'open',
  71,
  29,
  1340000,
  658,
  374,
  '2026-10-31 23:59:59+03',
  'correspondent',
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'kenya-hosts-fifa-u20-world-cup',
  'Will Kenya host the FIFA U-20 World Cup?',
  'Kenya has bid for several international sporting events in recent years. Will Kenya be awarded and successfully host a FIFA U-20 World Cup before 2030?',
  'sports',
  'open',
  45,
  55,
  670000,
  312,
  198,
  '2027-12-31 23:59:59+03',
  'admin',
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'burna-boy-headlines-coachella-2027',
  'Will Burna Boy headline Coachella 2027?',
  'Afrobeats superstar Burna Boy has steadily climbed to global stardom. With Coachella increasingly booking African artists, will the Grammy winner land a headlining slot in 2027?',
  'entertainment',
  'open',
  55,
  45,
  3100000,
  1241,
  527,
  '2027-01-15 00:00:00+03',
  'auto',
  NOW(),
  NOW()
);
