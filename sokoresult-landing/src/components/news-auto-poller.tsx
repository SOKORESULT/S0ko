// src/components/news-auto-poller.tsx
"use client";

import { useEffect, useRef } from "react";

// Invisible component — polls news ingestion every 10 minutes.
// Only runs when an admin tab is open. Vercel Cron handles it otherwise.
export function NewsAutoPoller() {
  const isRunning = useRef(false);

  async function runIngestion() {
    if (isRunning.current) return;
    isRunning.current = true;
    try {
      await fetch(
        `/api/news/auto-ingest?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? "dev"}`
      );
    } catch {
      // Silent — cron will catch up
    }
    isRunning.current = false;
  }

  useEffect(() => {
    runIngestion();
    const interval = setInterval(runIngestion, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
