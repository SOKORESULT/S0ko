"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  kyc_tier: number;
}

interface CommentRow {
  id: string;
  body: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  user: CommentUser;
  replies?: CommentRow[];
  liked?: boolean; // client-side optimistic
}

interface Holder {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  yes_shares: number;
  no_shares: number;
  avg_buy_price_yes: number | null;
  avg_buy_price_no: number | null;
  position_value: number;
}

interface ActivityTrade {
  id: string;
  outcome: string;
  price: number;
  quantity: number;
  total_value: number;
  created_at: string;
  buyer_name: string;
  seller_name: string;
}

type SortMode = "newest" | "oldest" | "liked";
type Tab = "comments" | "holders" | "positions" | "activity";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function fmtKES(v: number) {
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${v.toFixed(2)}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 36 }: { user: CommentUser; size?: number }) {
  const initials = (user.display_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (user.avatar_url) {
    return (
      <div className="rounded-full overflow-hidden flex-shrink-0 border border-[#2A2A3E]"
        style={{ width: size, height: size }}>
        <Image src={user.avatar_url} alt={user.display_name ?? "User"} width={size} height={size} className="object-cover w-full h-full" />
      </div>
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #7B2FBE, #9B4FDE)", fontSize: size < 32 ? 10 : 13 }}>
      {initials}
    </div>
  );
}

// ─── Comment Input ────────────────────────────────────────────────────────────

function CommentInput({
  marketId, parentId, placeholder = "Add a comment…",
  onPosted, autoFocus = false, compact = false,
}: {
  marketId: string;
  parentId?: string;
  placeholder?: string;
  onPosted: (c: CommentRow) => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const { user, profile } = useAuth();
  const router    = useRouter();
  const [text, setText]   = useState("");
  const [expanded, setExpanded] = useState(autoFocus);
  const [posting, setPosting]   = useState(false);
  const [imgUrl, setImgUrl]     = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isKyc   = (profile?.kyc_tier ?? 0) >= 1;

  async function uploadImage(file: File) {
    setUploading(true);
    const token = await user?.getIdToken();
    const form  = new FormData();
    form.append("file", file);
    // Upload via Supabase storage directly from client using signed URL approach
    // For simplicity, use a data URL in dev (real: upload to Supabase storage)
    const reader = new FileReader();
    reader.onload = (e) => { setImgUrl(e.target?.result as string); setUploading(false); };
    reader.readAsDataURL(file);
    void token; // suppress unused warning
  }

  async function post() {
    if (!text.trim() || posting) return;
    if (!isKyc) { router.push("/kyc"); return; }
    setPosting(true);
    const token = await user?.getIdToken();
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ market_id: marketId, body: text.trim(), parent_id: parentId ?? null, image_url: imgUrl ?? null }),
    });
    if (res.ok) {
      const data = await res.json();
      onPosted(data.comment);
      setText("");
      setImgUrl(null);
      setExpanded(false);
    }
    setPosting(false);
  }

  if (!isKyc) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-[#2A2A3E]" style={{ background: "#12121E" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,179,0,0.12)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <p className="text-[13px] text-[#8888A0] flex-1">
          <button onClick={() => router.push("/kyc")} className="text-[#FFB300] underline cursor-pointer font-semibold">Verify your identity</button> to join the discussion.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {profile && (
        <Avatar user={{ id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url ?? null, kyc_tier: profile.kyc_tier }} size={compact ? 30 : 36} />
      )}
      <div className="flex-1">
        <div className="rounded-xl border border-[#2A2A3E] transition-colors focus-within:border-[#7B2FBE] overflow-hidden"
          style={{ background: "#0A0A12" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post(); }}
            placeholder={placeholder}
            rows={expanded ? 3 : 1}
            maxLength={1000}
            autoFocus={autoFocus}
            className="w-full bg-transparent text-[13px] text-white outline-none resize-none px-3 py-2.5 placeholder-[#8888A0]"
          />
          {imgUrl && (
            <div className="px-3 pb-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="Attachment" className="rounded-lg max-h-24 max-w-[180px] object-cover" />
              <button onClick={() => setImgUrl(null)} className="text-[#8888A0] hover:text-[#FF5252] cursor-pointer">✕</button>
            </div>
          )}
          {expanded && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1E1E2E]">
              {/* Image upload */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="p-1.5 rounded-lg cursor-pointer transition-colors"
                style={{ color: "#8888A0" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#E8E8F0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8888A0"; }}
                title="Attach image"
              >
                {uploading ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#2A2A3E" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#7B2FBE" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />

              <span className="text-[10px] text-[#4A4A6A] ml-1">{text.length}/1000</span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => { setExpanded(false); setText(""); setImgUrl(null); }}
                  className="px-3 py-1.5 rounded-lg text-[12px] text-[#8888A0] cursor-pointer hover:text-[#E8E8F0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={post}
                  disabled={!text.trim() || posting}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all"
                  style={{
                    background: text.trim() && !posting ? "#00E676" : "#2A2A3E",
                    color: text.trim() && !posting ? "#0A0A12" : "#8888A0",
                    cursor: !text.trim() || posting ? "not-allowed" : "pointer",
                  }}
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment Card ─────────────────────────────────────────────────────────────

function CommentCard({
  comment, marketId, depth = 0,
  onLikeToggle,
}: {
  comment: CommentRow;
  marketId: string;
  depth?: number;
  onLikeToggle: (id: string, liked: boolean, count: number) => void;
}) {
  const { user } = useAuth();
  const [showReply, setShowReply]       = useState(false);
  const [showReplies, setShowReplies]   = useState(false);
  const [replies, setReplies]           = useState<CommentRow[]>(comment.replies ?? []);
  const [liking, setLiking]             = useState(false);
  const liked    = comment.liked ?? false;
  const replyCount = replies.length;

  async function toggleLike() {
    if (liking) return;
    setLiking(true);
    const token = await user?.getIdToken();
    const res   = await fetch(`/api/comments/${comment.id}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      onLikeToggle(comment.id, data.liked, data.count);
    }
    setLiking(false);
  }

  return (
    <div className={depth > 0 ? "pl-10 border-l-2 border-[#2A2A3E]" : ""}>
      <div className="flex gap-3 py-3">
        <Avatar user={comment.user} size={depth > 0 ? 28 : 36} />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[13px] font-semibold text-white">{comment.user.display_name ?? "User"}</span>
            {comment.user.kyc_tier >= 1 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#00E676" stroke="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            )}
            <span className="text-[11px] text-[#8888A0]">{timeAgo(comment.created_at)}</span>
            {/* More menu */}
            <button className="ml-auto p-0.5 rounded cursor-pointer text-[#4A4A6A] hover:text-[#8888A0] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <p className="text-[13px] text-[#E8E8F0] leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>

          {/* Image attachment */}
          {comment.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.image_url} alt="Comment attachment" className="mt-2 rounded-xl max-w-[300px] max-h-[240px] object-cover" />
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={toggleLike}
              disabled={liking}
              className="flex items-center gap-1.5 text-[12px] transition-colors cursor-pointer"
              style={{ color: liked ? "#FF5252" : "#8888A0" }}
              onMouseEnter={(e) => { if (!liked) e.currentTarget.style.color = "#FF5252"; }}
              onMouseLeave={(e) => { if (!liked) e.currentTarget.style.color = "#8888A0"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>{comment.likes_count}</span>
            </button>

            {depth === 0 && (
              <button
                onClick={() => setShowReply((v) => !v)}
                className="flex items-center gap-1.5 text-[12px] text-[#8888A0] hover:text-[#E8E8F0] transition-colors cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Reply
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReply && (
            <div className="mt-3">
              <CommentInput
                marketId={marketId}
                parentId={comment.id}
                placeholder={`Reply to ${comment.user.display_name ?? "user"}…`}
                autoFocus
                compact
                onPosted={(r) => {
                  setReplies((prev) => [r, ...prev]);
                  setShowReplies(true);
                  setShowReply(false);
                }}
              />
            </div>
          )}

          {/* Replies toggle */}
          {depth === 0 && replyCount > 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="mt-2 text-[12px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
              style={{ color: "#7B2FBE" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#9B4FDE"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#7B2FBE"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showReplies ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && replies.length > 0 && (
        <div className="ml-10">
          {replies.map((r) => (
            <CommentCard key={r.id} comment={r} marketId={marketId} depth={1} onLikeToggle={onLikeToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comments Tab ─────────────────────────────────────────────────────────────

function CommentsTab({ marketId, commentCount, token }: { marketId: string; commentCount: number; token: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sort, setSort]         = useState<SortMode>("newest");
  const [holdersOnly, setHoldersOnly] = useState(false);
  const [total, setTotal]       = useState(commentCount);
  const [hasMore, setHasMore]   = useState(false);
  const [page, setPage]         = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (s: SortMode, ho: boolean, reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const pg = reset ? 1 : page + 1;
    const url = `/api/comments?market_id=${marketId}&sort=${s}&holders_only=${ho}&page=${pg}&limit=20`;
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (reset) { setComments(data.comments ?? []); setPage(1); }
    else { setComments((prev) => [...prev, ...(data.comments ?? [])]); setPage(pg); }
    setTotal(data.total ?? 0);
    setHasMore(data.has_more ?? false);
    if (reset) setLoading(false); else setLoadingMore(false);
  }, [marketId, token, page]);

  useEffect(() => { load(sort, holdersOnly, true); }, [sort, holdersOnly, marketId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLike(id: string, liked: boolean, count: number) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, liked, likes_count: count } : c));
  }

  function handleNew(comment: CommentRow) {
    setComments((prev) => [comment, ...prev]);
    setTotal((t) => t + 1);
  }

  return (
    <div>
      {/* Comment input */}
      <div className="mb-5">
        <CommentInput marketId={marketId} onPosted={handleNew} />
      </div>

      {/* Sort + filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-[#2A2A3E] overflow-hidden" style={{ background: "#12121E" }}>
          {(["newest", "oldest", "liked"] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="px-3 py-1.5 text-[12px] font-medium capitalize transition-colors cursor-pointer"
              style={{ background: sort === s ? "#7B2FBE" : "transparent", color: sort === s ? "white" : "#8888A0" }}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setHoldersOnly((v) => !v)}
            className="w-9 h-5 rounded-full transition-colors relative cursor-pointer"
            style={{ background: holdersOnly ? "#7B2FBE" : "#2A2A3E" }}
          >
            <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
              style={{ left: holdersOnly ? "calc(100% - 18px)" : "2px" }} />
          </div>
          <span className="text-[12px] text-[#8888A0]">Holders only</span>
        </label>
        <span className="text-[12px] text-[#8888A0] ml-auto">{total} comment{total !== 1 ? "s" : ""}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-[#2A2A3E] flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-24 rounded bg-[#2A2A3E] mb-2" />
                <div className="h-3 w-full rounded bg-[#2A2A3E] mb-1" />
                <div className="h-3 w-3/4 rounded bg-[#2A2A3E]" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 text-[#8888A0]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p className="text-[14px]">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="divide-y divide-[#1E1E2E]">
          {comments.map((c) => (
            <CommentCard key={c.id} comment={c} marketId={marketId} onLikeToggle={handleLike} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => load(sort, holdersOnly, false)}
          disabled={loadingMore}
          className="mt-4 w-full py-2.5 rounded-xl border border-[#2A2A3E] text-[13px] font-semibold text-[#8888A0] cursor-pointer transition-all"
          style={{ background: "#12121E" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7B2FBE"; e.currentTarget.style.color = "#C4B5FD"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#8888A0"; }}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

// ─── Top Holders Tab ──────────────────────────────────────────────────────────

function HoldersTab({ slug, token }: { slug: string; token: string }) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/markets/${slug}/holders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setHolders(d.holders ?? []); setLoading(false); });
  }, [slug, token]);

  if (loading) return (
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[#2A2A3E]" />
          <div className="flex-1">
            <div className="h-3 w-24 rounded bg-[#2A2A3E] mb-1" />
            <div className="h-3 w-16 rounded bg-[#2A2A3E]" />
          </div>
          <div className="h-3 w-14 rounded bg-[#2A2A3E]" />
        </div>
      ))}
    </div>
  );

  if (!holders.length) return (
    <div className="text-center py-10 text-[#8888A0] text-[14px]">No positions in this market yet.</div>
  );

  return (
    <div className="flex flex-col divide-y divide-[#1E1E2E]">
      {holders.map((h, i) => (
        <div key={h.user_id} className="flex items-center gap-3 py-3">
          <span className="text-[11px] font-bold text-[#8888A0] w-5 text-right flex-shrink-0">{i + 1}</span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-[12px]"
            style={{ background: "linear-gradient(135deg, #7B2FBE, #9B4FDE)" }}>
            {(h.display_name ?? "A").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{h.display_name}</p>
            <p className="text-[11px] text-[#8888A0]">
              {h.yes_shares > 0 && <span className="text-[#00E676]">{h.yes_shares} YES</span>}
              {h.yes_shares > 0 && h.no_shares > 0 && <span className="text-[#4A4A6A]"> · </span>}
              {h.no_shares > 0 && <span className="text-[#FF5252]">{h.no_shares} NO</span>}
              {h.avg_buy_price_yes && h.yes_shares > 0 && <span className="text-[#4A4A6A]"> · avg {h.avg_buy_price_yes}¢</span>}
            </p>
          </div>
          <span className="text-[12px] font-bold text-white flex-shrink-0" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
            {fmtKES(h.position_value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Positions Tab ────────────────────────────────────────────────────────────

function PositionsTab({ slug, token, yesPrice, noPrice }: { slug: string; token: string; yesPrice: number; noPrice: number }) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/markets/${slug}/holders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setHolders(d.holders ?? []); setLoading(false); });
  }, [slug, token]);

  if (loading) return <div className="h-32 rounded-xl animate-pulse bg-[#2A2A3E]" />;

  const totalYes   = holders.reduce((a, h) => a + (h.yes_shares ?? 0), 0);
  const totalNo    = holders.reduce((a, h) => a + (h.no_shares  ?? 0), 0);
  const totalShares = totalYes + totalNo;
  const yesPct     = totalShares > 0 ? Math.round((totalYes / totalShares) * 100) : 50;
  const largestPos = holders[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "YES Shares", value: totalYes.toLocaleString(), color: "#00E676" },
          { label: "NO Shares",  value: totalNo.toLocaleString(),  color: "#FF5252" },
          { label: "Unique Holders", value: holders.length.toString(), color: "#E8E8F0" },
          { label: "Largest Position", value: largestPos ? fmtKES(largestPos.position_value) : "—", color: "#C4B5FD" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded-xl border border-[#2A2A3E]" style={{ background: "#12121E" }}>
            <p className="text-[11px] text-[#8888A0] mb-1">{label}</p>
            <p className="text-[16px] font-bold" style={{ color, fontFamily: "var(--font-space-mono, monospace)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* YES vs NO split bar */}
      <div>
        <div className="flex justify-between text-[12px] mb-1">
          <span className="font-bold text-[#00E676]">YES {yesPct}%</span>
          <span className="font-bold text-[#FF5252]">NO {100 - yesPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#FF5252" }}>
          <div className="h-full rounded-full" style={{ width: `${yesPct}%`, background: "#00E676", transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Price distribution hint */}
      <p className="text-[12px] text-[#8888A0] text-center">
        Current YES price: <span className="text-[#00E676] font-bold">{yesPrice}¢</span> · NO price: <span className="text-[#FF5252] font-bold">{noPrice}¢</span>
      </p>
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ slug, token }: { slug: string; token: string }) {
  const [trades, setTrades]   = useState<ActivityTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/markets/${slug}/activity`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setTrades(d.trades ?? []); setLoading(false); });
  }, [slug, token]);

  if (loading) return (
    <div className="flex flex-col gap-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
          <div className="h-3 w-20 rounded bg-[#2A2A3E]" />
          <div className="h-3 w-full rounded bg-[#2A2A3E]" />
          <div className="h-3 w-12 rounded bg-[#2A2A3E]" />
        </div>
      ))}
    </div>
  );

  if (!trades.length) return (
    <div className="text-center py-10 text-[#8888A0] text-[14px]">No trades in this market yet.</div>
  );

  return (
    <div className="flex flex-col divide-y divide-[#1E1E2E]">
      {trades.map((t) => {
        const isYes = t.outcome === "yes";
        const color = isYes ? "#00E676" : "#FF5252";
        return (
          <div key={t.id} className="flex items-center gap-3 py-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: isYes ? "rgba(0,230,118,0.12)" : "rgba(255,82,82,0.12)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isYes ? <><path d="M12 2v20M17 7l-5-5-5 5"/></> : <><path d="M12 22V2M7 17l5 5 5-5"/></>}
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#E8E8F0]">
                <span className="font-semibold">{t.buyer_name}</span>
                {" "}bought{" "}
                <span className="font-bold" style={{ color }}>{t.quantity} {t.outcome.toUpperCase()}</span>
                {" "}at{" "}
                <span className="font-bold" style={{ fontFamily: "var(--font-space-mono, monospace)", color }}>{t.price}¢</span>
              </p>
            </div>
            <span className="text-[11px] text-[#8888A0] flex-shrink-0">{timeAgo(t.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SocialSection({
  marketId, slug, token, yesPrice, noPrice,
}: {
  marketId: string;
  slug: string;
  token: string;
  yesPrice: number;
  noPrice: number;
}) {
  const [tab, setTab]     = useState<Tab>("comments");
  const [counts, setCounts] = useState({ comments: 0 });

  // Fetch initial comment count
  useEffect(() => {
    if (!token) return;
    fetch(`/api/comments?market_id=${marketId}&limit=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCounts({ comments: d.total ?? 0 }));
  }, [marketId, token]);

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "comments",  label: "Comments",    count: counts.comments },
    { id: "holders",   label: "Top Holders" },
    { id: "positions", label: "Positions" },
    { id: "activity",  label: "Activity" },
  ];

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex border-b border-[#2A2A3E] mb-5 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer relative"
            style={{ color: tab === t.id ? "#E8E8F0" : "#8888A0" }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: tab === t.id ? "rgba(123,47,190,0.25)" : "#1E1E2E", color: tab === t.id ? "#C4B5FD" : "#8888A0" }}>
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: "#7B2FBE" }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === "comments"  && <CommentsTab  marketId={marketId} commentCount={counts.comments} token={token} />}
      {tab === "holders"   && <HoldersTab   slug={slug} token={token} />}
      {tab === "positions" && <PositionsTab slug={slug} token={token} yesPrice={yesPrice} noPrice={noPrice} />}
      {tab === "activity"  && <ActivityTab  slug={slug} token={token} />}
    </div>
  );
}
