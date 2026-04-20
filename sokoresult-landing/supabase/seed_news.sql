-- Seed news stories
INSERT INTO news_stories (id, title, body, source_name, source_type, source_url, category, urgency, verification_status, published_at)
VALUES
  (
    gen_random_uuid(),
    'Ruto Faces Growing Opposition as 2027 Campaigns Heat Up',
    'President William Ruto''s administration is facing mounting political pressure as opposition coalitions begin early mobilization ahead of the 2027 general elections. Key figures from Azimio and newly formed alliances are touring county capitals this week.',
    'KTN News',
    'media',
    'https://www.ktnnews.com',
    'politics',
    4,
    'verified',
    NOW() - INTERVAL '2 hours'
  ),
  (
    gen_random_uuid(),
    'Harambee Stars Coach Confirms AFCON Qualification Camp Squad',
    'Football Kenya Federation has confirmed a 25-man preliminary squad for the upcoming Africa Cup of Nations qualification matches. Several European-based players are expected to join the camp in Nairobi starting next week.',
    'Citizen TV',
    'media',
    'https://www.citizentv.co.ke',
    'sports',
    3,
    'verified',
    NOW() - INTERVAL '5 hours'
  ),
  (
    gen_random_uuid(),
    'Nigerian Designers Dominate Lagos Fashion Week Runway',
    'The 2025 Lagos Fashion Week closed with record attendance as homegrown Nigerian designers showcased collections that blended traditional Ankara prints with contemporary silhouettes. Several pieces are already drawing international buyer interest.',
    'Independent Fashion Africa',
    'correspondent',
    NULL,
    'fashion',
    2,
    'verified',
    NOW() - INTERVAL '8 hours'
  ),
  (
    gen_random_uuid(),
    'Opposition Alliance Tables Motion to Censure Finance Minister',
    'A cross-party opposition bloc in Parliament has tabled a motion to censure the Finance Cabinet Secretary over alleged irregularities in the supplementary budget. The motion is expected to be debated next Tuesday.',
    'NTV Kenya',
    'media',
    'https://www.ntv.co.ke',
    'politics',
    5,
    'verified',
    NOW() - INTERVAL '1 hour'
  ),
  (
    gen_random_uuid(),
    'KRA Misses Revenue Target by KES 18 Billion in Q1',
    'The Kenya Revenue Authority has reported a shortfall of KES 18 billion against its Q1 2025 target, citing slow economic activity and reduced import volumes. Treasury officials say corrective measures are in place.',
    'The Standard',
    'wire',
    'https://www.standardmedia.co.ke',
    'politics',
    3,
    'pending',
    NOW() - INTERVAL '3 hours'
  ),
  (
    gen_random_uuid(),
    'Burna Boy Announces East Africa Tour Dates Including Nairobi',
    'Grammy-winning Afrobeats artist Burna Boy has confirmed three East African tour dates as part of his "No Sign of Weakness" world tour. The Nairobi show is scheduled for Uhuru Gardens on August 16.',
    'Pulse Nigeria',
    'media',
    'https://www.pulse.ng',
    'entertainment',
    2,
    'verified',
    NOW() - INTERVAL '12 hours'
  );
