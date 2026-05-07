export function Waves({
  count = 10,
  height = 10,
}: {
  count?: number;
  height?: number;
}) {
  const heights = Array.from({ length: count }).map((_, i) => {
    const v = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9) * 0.3 + 0.6;
    return Math.max(0.2, Math.min(1, v));
  });
  return (
    <div className="flex items-center gap-[3px]" style={{ height }}>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-purple-400/40 animate-pulse"
          style={{
            height: `${Math.round(h * 100)}%`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}
