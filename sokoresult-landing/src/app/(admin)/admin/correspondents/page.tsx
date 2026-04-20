"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { MOCK_CORRESPONDENT_APPLICATIONS, type MockCorrespondentApplication } from "@/lib/mock-data";

const TABS = [
  { id: "all",       label: "All" },
  { id: "pending",   label: "Pending" },
  { id: "approved",  label: "Approved" },
  { id: "rejected",  label: "Rejected" },
  { id: "suspended", label: "Suspended" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "rgba(255,179,0,0.12)",  color: "#FFB300" },
  approved:  { bg: "rgba(0,230,118,0.12)",  color: "#00E676" },
  rejected:  { bg: "rgba(255,82,82,0.12)",  color: "#FF5252" },
  suspended: { bg: "rgba(255,82,82,0.08)",  color: "#FF8C42" },
};

const BEAT_COLOR: Record<string, string> = {
  politics: "#C4B5FD", sports: "#4DB6AC", entertainment: "#F472B6",
  fashion: "#FFB300", business: "#60A5FA", general: "#8888A0",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
      style={s}>
      {status}
    </span>
  );
}

function DetailPanel({ app, onClose, onAction }: {
  app: MockCorrespondentApplication;
  onClose: () => void;
  onAction: (id: string, status: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-5 max-h-[90dvh] overflow-y-auto"
        style={{ background: "#0D0D1A", border: "1px solid #1E1E35" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-white">{app.userName}</h2>
          <button onClick={onClose} className="text-[#8888A0] hover:text-white cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="space-y-3 mb-5">
          {[
            { label: "Publication", value: app.publication },
            { label: "Email",       value: app.email ?? "—" },
            { label: "X Handle",    value: app.xHandle ? `@${app.xHandle.replace(/^@/, "")}` : "—" },
            { label: "Beat",        value: app.beat },
            { label: "Applied",     value: new Date(app.appliedAt).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" }) },
            { label: "Status",      value: <StatusBadge status={app.status} /> },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-[12px] w-24 flex-shrink-0" style={{ color: "#8888A0" }}>{row.label}</span>
              {typeof row.value === "string"
                ? <span className="text-[13px] text-white">{row.value}</span>
                : row.value}
            </div>
          ))}
        </div>
        {app.status === "pending" && (
          <div className="flex gap-3">
            <button onClick={() => { onAction(app.id, "approved"); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all"
              style={{ background: "#00E676", color: "#0A0A12" }}>
              Approve
            </button>
            <button onClick={() => { onAction(app.id, "rejected"); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all border border-[#FF5252]"
              style={{ color: "#FF5252", background: "transparent" }}>
              Reject
            </button>
          </div>
        )}
        {app.status === "approved" && (
          <button onClick={() => { onAction(app.id, "suspended"); onClose(); }}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all border border-[#FF8C42]"
            style={{ color: "#FF8C42", background: "transparent" }}>
            Suspend
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminCorrespondentsPage() {
  const showToast = useToast();
  const [tab, setTab]     = useState("all");
  const [apps, setApps]   = useState(MOCK_CORRESPONDENT_APPLICATIONS);
  const [detail, setDetail] = useState<MockCorrespondentApplication | null>(null);

  const filtered = useMemo(
    () => tab === "all" ? apps : apps.filter((a) => a.status === tab),
    [tab, apps]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    for (const a of apps) { c[a.status] = (c[a.status] ?? 0) + 1; }
    return c;
  }, [apps]);

  function handleAction(id: string, status: string) {
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: status as MockCorrespondentApplication["status"] } : a));
    const messages: Record<string, string> = {
      approved: "Correspondent approved",
      rejected: "Application rejected",
      suspended: "Correspondent suspended",
    };
    showToast(messages[status] ?? "Updated", "success");
  }

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-[22px] font-bold">Correspondents</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#8888A0" }}>
            {apps.length} total applications
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer"
            style={{
              background: tab === t.id ? "rgba(255,107,53,0.15)" : "transparent",
              color: tab === t.id ? "#FF6B35" : "#8888A0",
              border: `1px solid ${tab === t.id ? "rgba(255,107,53,0.3)" : "transparent"}`,
            }}>
            {t.label}
            {counts[t.id] !== undefined && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: tab === t.id ? "rgba(255,107,53,0.2)" : "#1E1E2E", color: tab === t.id ? "#FF6B35" : "#8888A0" }}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#8888A0" }}>
          <p>No {tab} applications.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                  {["Name", "Publication", "Contact", "Beat", "Status", "Applied", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: "#8888A0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app, i) => (
                  <tr key={app.id}
                    style={{ background: i % 2 === 0 ? "#0A0A12" : "#0D0D1A", borderBottom: "1px solid #1E1E2E" }}>
                    <td className="px-4 py-3 font-semibold text-white">{app.userName}</td>
                    <td className="px-4 py-3" style={{ color: "#C8C8D8" }}>{app.publication}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {app.email && <span className="text-[12px]" style={{ color: "#8888A0" }}>{app.email}</span>}
                        {app.xHandle && <span className="text-[12px]" style={{ color: "#60A5FA" }}>@{app.xHandle.replace(/^@/, "")}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-medium capitalize" style={{ color: BEAT_COLOR[app.beat] ?? "#8888A0" }}>
                        {app.beat}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: "#8888A0" }}>
                      {new Date(app.appliedAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDetail(app)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all"
                          style={{ color: "#C4B5FD", borderColor: "rgba(196,181,253,0.2)", background: "rgba(196,181,253,0.06)" }}>
                          View
                        </button>
                        {app.status === "pending" && (
                          <>
                            <button onClick={() => handleAction(app.id, "approved")}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all"
                              style={{ color: "#00E676", borderColor: "rgba(0,230,118,0.2)", background: "rgba(0,230,118,0.06)" }}>
                              Approve
                            </button>
                            <button onClick={() => handleAction(app.id, "rejected")}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all"
                              style={{ color: "#FF5252", borderColor: "rgba(255,82,82,0.2)", background: "rgba(255,82,82,0.06)" }}>
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === "approved" && (
                          <button onClick={() => handleAction(app.id, "suspended")}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all"
                            style={{ color: "#FF8C42", borderColor: "rgba(255,140,66,0.2)", background: "rgba(255,140,66,0.06)" }}>
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && <DetailPanel app={detail} onClose={() => setDetail(null)} onAction={handleAction} />}
    </div>
  );
}
