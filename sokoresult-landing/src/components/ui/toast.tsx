"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface Toast { id: string; message: string; type?: "success" | "error" | "info"; }

interface ToastContextValue { toast: (message: string, type?: Toast["type"]) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium shadow-xl pointer-events-auto"
            style={{
              background: t.type === "success" ? "rgba(0,230,118,0.15)" : t.type === "error" ? "rgba(255,82,82,0.15)" : "rgba(42,42,62,0.95)",
              border: `1px solid ${t.type === "success" ? "rgba(0,230,118,0.3)" : t.type === "error" ? "rgba(255,82,82,0.3)" : "#2A2A3E"}`,
              color: t.type === "success" ? "#00E676" : t.type === "error" ? "#FF5252" : "#E8E8F0",
              animation: "toastIn 200ms ease-out both",
            }}
          >
            {t.type === "success" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
            {t.type === "error" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
