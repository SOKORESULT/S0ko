// src/components/emotion-widget.tsx
"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { MomentumType, EmotionRecord } from "@/lib/ai/emotions";

interface EmotionWidgetProps {
  marketId: string;
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

const MOMENTUM_CONFIG: Record<MomentumType, { label: string; color: string; bg: string }> = {
  surging_positive: { label: "🚀 Surging positive", color: "#00E676", bg: "rgba(0,230,118,0.12)" },
  rising:           { label: "📈 Trending positive", color: "#4DB6AC", bg: "rgba(0,150,136,0.12)" },
  stable:           { label: "➡️ Stable",            color: "#8888A0", bg: "rgba(136,136,160,0.12)" },
  declining:        { label: "📉 Trending negative", color: "#FFB300", bg: "rgba(255,179,0,0.12)" },
  surging_negative: { label: "🔻 Surging negative", color: "#FF5252", bg: "rgba(255,82,82,0.12)" },
};

const EMOTION_CONFIG = [
  { key: "anger",     emoji: "😠", label: "Anger",     color: "#FF5252" },
  { key: "hope",      emoji: "🙏", label: "Hope",      color: "#00E676" },
  { key: "fear",      emoji: "😰", label: "Fear",      color: "#FFB300" },
  { key: "excitement",emoji: "🔥", label: "Excitement", color: "#C4B5FD" },
  { key: "sarcasm",   emoji: "😏", label: "Sarcasm",   color: "#8888A0" },
] as const;

export function EmotionWidget({ marketId }: EmotionWidgetProps) {
  const [emotions, setEmotions] = useState<(EmotionRecord & { analyzed_at: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ai/emotions/${marketId}`)
      .then((r) => r.json())
      .then((d: { emotions: (EmotionRecord & { analyzed_at: string })[] }) => {
        setEmotions(d.emotions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [marketId]);

  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E", height: 180 }} />
    );
  }

  if (emotions.length === 0) return null;

  const latest = emotions[0];
  const momentum = MOMENTUM_CONFIG[latest.momentum] ?? MOMENTUM_CONFIG.stable;
  const historyData = [...emotions].reverse().map((e) => ({
    time: new Date(e.analyzed_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    positive: Math.round(e.positive_pct),
    negative: Math.round(e.negative_pct),
  }));

  return (
    <div className="rounded-2xl p-5" style={{ background: "#0D0D1A", border: "1px solid #1E1E2E" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="text-white font-bold text-[14px]">Public Sentiment</span>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: momentum.bg, color: momentum.color }}
        >
          {momentum.label}
        </span>
      </div>
      <p className="text-[11px] mb-4" style={{ color: "#8888A0" }}>What Kenyans are saying on social media</p>

      {/* Stacked sentiment bar */}
      <div className="flex rounded-lg overflow-hidden mb-1" style={{ height: 28 }}>
        <div
          style={{ width: `${latest.positive_pct}%`, background: "#00E676", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {latest.positive_pct >= 15 && (
            <span className="text-[10px] font-bold" style={{ color: "#003300" }}>{Math.round(latest.positive_pct)}%</span>
          )}
        </div>
        <div
          style={{ width: `${latest.neutral_pct}%`, background: "#2A2A3E", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {latest.neutral_pct >= 15 && (
            <span className="text-[10px] font-bold" style={{ color: "#8888A0" }}>{Math.round(latest.neutral_pct)}%</span>
          )}
        </div>
        <div
          style={{ width: `${latest.negative_pct}%`, background: "#FF5252", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {latest.negative_pct >= 15 && (
            <span className="text-[10px] font-bold" style={{ color: "#330000" }}>{Math.round(latest.negative_pct)}%</span>
          )}
        </div>
      </div>
      <div className="flex justify-between text-[10px] mb-5" style={{ color: "#555577" }}>
        <span>Positive {Math.round(latest.positive_pct)}%</span>
        <span>Neutral {Math.round(latest.neutral_pct)}%</span>
        <span>Negative {Math.round(latest.negative_pct)}%</span>
      </div>

      {/* Emotion breakdown */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {EMOTION_CONFIG.map(({ key, emoji, label, color }) => {
          const value = Math.round(Number(latest[key as keyof EmotionRecord]) || 0);
          return (
            <div key={key} className="rounded-xl p-2 text-center" style={{ background: "#151520", border: "1px solid #1E1E2E" }}>
              <div className="text-[18px] mb-1">{emoji}</div>
              <div className="text-[10px] mb-1.5" style={{ color: "#8888A0" }}>{label}</div>
              <div className="text-[13px] font-bold" style={{ color }}>{value}%</div>
              <div className="mt-1.5 rounded-full overflow-hidden" style={{ height: 3, background: "#1E1E2E" }}>
                <div style={{ width: `${value}%`, height: "100%", background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <p className="text-[12px] mb-4 italic" style={{ color: "#6666A0" }}>&ldquo;{latest.sentiment_summary}&rdquo;</p>

      {/* Notable quotes */}
      {latest.sample_posts?.length > 0 && (
        <div className="space-y-2 mb-4">
          {latest.sample_posts.slice(0, 3).map((post, i) => (
            <div key={post.text.slice(0, 20) || i} className="rounded-lg p-3 text-[11px]" style={{ background: "#151520", border: "1px solid #1E1E2E", color: "#8888A0" }}>
              &ldquo;{post.text}&rdquo;
            </div>
          ))}
        </div>
      )}

      {/* History chart */}
      {historyData.length >= 2 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#555577" }}>Sentiment history</p>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={historyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00E676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF5252" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF5252" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: "#555577", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#0D0D1A", border: "1px solid #1E1E2E", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#8888A0" }}
              />
              <Area type="monotone" dataKey="positive" stroke="#00E676" strokeWidth={1.5} fill="url(#posGrad)" name="Positive" />
              <Area type="monotone" dataKey="negative" stroke="#FF5252" strokeWidth={1.5} fill="url(#negGrad)" name="Negative" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px]" style={{ color: "#444466" }}>
        Based on {latest.post_count} posts · Updated {timeAgo(latest.analyzed_at)}
      </p>
    </div>
  );
}
