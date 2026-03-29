"use client";

interface FitScoreBarProps {
  score: number;
  maxScore?: number;
  height?: number;
  showLabel?: boolean;
}

function getColor(pct: number): string {
  if (pct >= 75) return "var(--teal)";
  if (pct >= 50) return "var(--blue)";
  if (pct >= 30) return "#F39C12";
  return "var(--red)";
}

export default function FitScoreBar({
  score,
  maxScore = 100,
  height = 6,
  showLabel = false,
}: FitScoreBarProps) {
  const pct = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  const color = getColor(pct);

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          width: "100%",
          height,
          background: "var(--navy-mid)",
          borderRadius: height,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: height,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      {showLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.25rem",
            fontSize: "0.7rem",
            color: "var(--text-secondary)",
          }}
        >
          <span>0</span>
          <span style={{ color }}>{Math.round(pct)}%</span>
          <span>100</span>
        </div>
      )}
    </div>
  );
}
