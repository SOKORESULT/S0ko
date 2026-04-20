export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{ background: "linear-gradient(90deg,#1A1A2E 25%,#22223E 50%,#1A1A2E 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear", ...style }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2A2A3E] p-4 space-y-3" style={{ background: "#12121E" }}>
      <Skeleton style={{ height: 16, width: "40%" }} />
      <Skeleton style={{ height: 20, width: "90%" }} />
      <Skeleton style={{ height: 12, width: "70%" }} />
      <Skeleton style={{ height: 8, borderRadius: 99, width: "100%" }} />
      <div className="flex justify-between">
        <Skeleton style={{ height: 16, width: "30%" }} />
        <Skeleton style={{ height: 16, width: "30%" }} />
      </div>
    </div>
  );
}

export function SkeletonStyle() {
  return <style>{`@keyframes shimmer { to { background-position: -200% 0; } }`}</style>;
}
