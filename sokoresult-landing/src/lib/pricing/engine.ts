/**
 * SokoResult Pricing Engine
 *
 * Four signals combine to produce each price update:
 *   1. Crowd demand         — buy/sell pressure (main driver)
 *   2. AI gravity           — gentle pull toward AI prediction (5% per trade)
 *   3. Sentiment momentum   — ±1-2 points based on social media trend
 *   4. House margin         — compresses extreme prices (edge near 0 / 100)
 *
 * Additionally, every trade pays a 2% fee (implemented in the trade route).
 */

export interface PriceUpdate {
  newYesPrice:    number;
  newNoPrice:     number;
  crowdComponent: number;
  aiComponent:    number;
  marginApplied:  number;
}

export function calculateNewPrice(
  currentYesPrice: number,
  tradeOutcome:    "yes" | "no",
  tradeSide:       "buy" | "sell",
  quantity:        number,
  aiPrediction?:     number,   // 1-99, from ai_predictions table
  sentimentMomentum?: string,
): PriceUpdate {

  // ── COMPONENT 1: Crowd (supply/demand) ──────────────────────────────────────
  // √qty creates diminishing returns for block orders; sells move price less
  const rawImpact  = Math.ceil(Math.sqrt(quantity) * 0.5);
  const crowdImpact = tradeSide === "sell" ? Math.ceil(rawImpact * 0.6) : rawImpact;

  let crowdPrice: number;
  if      (tradeSide === "buy"  && tradeOutcome === "yes") crowdPrice = currentYesPrice + crowdImpact;
  else if (tradeSide === "buy"  && tradeOutcome === "no")  crowdPrice = currentYesPrice - crowdImpact;
  else if (tradeSide === "sell" && tradeOutcome === "yes") crowdPrice = currentYesPrice - crowdImpact;
  else                                                      crowdPrice = currentYesPrice + crowdImpact;

  // ── COMPONENT 2: AI gravity ──────────────────────────────────────────────────
  // Pulls 5% of the gap between AI's prediction and current crowd price
  let aiGravity = 0;
  if (aiPrediction !== undefined && aiPrediction >= 1 && aiPrediction <= 99) {
    const divergence = aiPrediction - crowdPrice;
    aiGravity = Math.round(divergence * 0.05);
  }
  // ── COMPONENT 3: Sentiment momentum ─────────────────────────────────────────
  // Nudges price ±1-2 points based on social media momentum.
  let sentimentNudge = 0;
  if (sentimentMomentum) {
    switch (sentimentMomentum) {
      case "surging_positive": sentimentNudge =  2; break;
      case "rising":           sentimentNudge =  1; break;
      case "declining":        sentimentNudge = -1; break;
      case "surging_negative": sentimentNudge = -2; break;
      default:                 sentimentNudge =  0;
    }
  }

  const adjustedPrice = crowdPrice + aiGravity + sentimentNudge;

  // ── COMPONENT 4: House margin ────────────────────────────────────────────────
  // Compress prices very close to 0/100 — the house earns the spread
  let margin = 0;
  if (adjustedPrice > 90) margin = -Math.ceil((adjustedPrice - 90) * 0.2);
  else if (adjustedPrice < 10) margin = Math.ceil((10 - adjustedPrice) * 0.2);

  const finalYes = Math.max(1, Math.min(99, adjustedPrice + margin));

  return {
    newYesPrice:    finalYes,
    newNoPrice:     100 - finalYes,
    crowdComponent: crowdImpact * (tradeOutcome === "yes" && tradeSide === "buy" ? 1 : -1),
    aiComponent:    aiGravity,
    marginApplied:  margin,
  };
}

/** Calculate the house's expected profit on a market. */
export function calculateHouseEdge(totalVolume: number): {
  tradingFees:    number;
  spreadEdge:     number;
  expectedProfit: number;
} {
  const tradingFees = Math.floor(totalVolume * 0.02);
  const spreadEdge  = Math.floor(totalVolume * 0.005);
  return { tradingFees, spreadEdge, expectedProfit: tradingFees + spreadEdge };
}
