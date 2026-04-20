import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// TODO: Replace with real TimescaleDB portfolio snapshots when trading engine is live.
// For now, generates a realistic-looking mock curve based on interval and a seed
// derived from the user's profile ID so the curve is consistent per user.

type ChartPoint = { timestamp: string; value: number };

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateCurve(points: number, baseValue: number, seed: number): ChartPoint[] {
  const rand = seededRandom(seed);
  const now = Date.now();
  const result: ChartPoint[] = [];

  let value = baseValue * (0.75 + rand() * 0.5);
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trend    = progress * baseValue * 0.3;          // mild uptrend
    const noise    = (rand() - 0.48) * baseValue * 0.08; // volatility
    value = Math.max(baseValue * 0.2, value + trend / points + noise);
    result.push({ timestamp: "", value: Math.round(value * 100) / 100 });
  }
  return result;
}

function intervalConfig(interval: string): { points: number; stepMs: number } {
  switch (interval) {
    case "24h": return { points: 24,  stepMs: 60 * 60 * 1000 };
    case "7d":  return { points: 28,  stepMs: 6 * 60 * 60 * 1000 };
    case "30d": return { points: 30,  stepMs: 24 * 60 * 60 * 1000 };
    case "90d": return { points: 90,  stepMs: 24 * 60 * 60 * 1000 };
    case "all": return { points: 52,  stepMs: 7 * 24 * 60 * 60 * 1000 };
    default:    return { points: 30,  stepMs: 24 * 60 * 60 * 1000 };
  }
}

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!result.profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const { searchParams } = request.nextUrl;
  const interval = searchParams.get("interval") ?? "30d";
  const { points, stepMs } = intervalConfig(interval);

  // Seed from profile id so the curve is stable per user
  const seed = result.profile.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const baseValue = 5000 + (seed % 20000);

  const now = Date.now();
  const data = generateCurve(points, baseValue, seed).map((p, i) => ({
    timestamp: new Date(now - (points - 1 - i) * stepMs).toISOString(),
    value: p.value,
  }));

  return Response.json({ data, interval });
}
