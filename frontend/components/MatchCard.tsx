"use client";

import Link from "next/link";
import FitScoreBar from "./FitScoreBar";

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  "Vacance critique":   { bg: "rgba(192,57,43,0.15)",  color: "var(--red)" },
  "Points conférence":  { bg: "rgba(46,134,193,0.15)", color: "var(--blue)" },
  "Recrutement EU":     { bg: "rgba(29,158,117,0.15)", color: "var(--teal)" },
};

interface MatchCardProps {
  universityId: number;
  name: string;
  division: string;
  conference: string;
  location: string;
  fitScore: number;
  scholarshipEst?: number | null;
  isPriority?: boolean;
  tags?: string[];
  isBlurred?: boolean;
}

export default function MatchCard({
  universityId,
  name,
  division,
  conference,
  location,
  fitScore,
  scholarshipEst,
  isPriority,
  tags = [],
  isBlurred = false,
}: MatchCardProps) {
  const initials = name
    .split(" ")
    .filter((w) => w.length > 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const score = Math.round(fitScore);

  return (
    <div
      style={{
        position: "relative",
        background: "var(--surface)",
        border: `1px solid ${isPriority ? "rgba(192,57,43,0.4)" : "var(--border)"}`,
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        overflow: "hidden",
      }}
    >
      {/* Blur overlay for freemium gate */}
      {isBlurred && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: "blur(6px)",
            background: "rgba(10,14,26,0.7)",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "12px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Plan Match requis
            </p>
            <Link
              href="/register"
              style={{
                background: "var(--red)",
                color: "#fff",
                padding: "0.5rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Passer à Match — 29€/mois
            </Link>
          </div>
        </div>
      )}

      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "10px",
          background: "var(--navy-mid)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "0.875rem",
          flexShrink: 0,
          color: "var(--text-secondary)",
        }}
      >
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{name}</span>
          <span
            style={{
              background: "var(--navy-mid)",
              color: "var(--text-secondary)",
              padding: "0.125rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.7rem",
              fontWeight: 600,
            }}
          >
            {division}
          </span>
          {tags.map((tag) => {
            const style = TAG_STYLES[tag] || { bg: "var(--navy-mid)", color: "var(--text-secondary)" };
            return (
              <span
                key={tag}
                style={{
                  background: style.bg,
                  color: style.color,
                  padding: "0.125rem 0.5rem",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.125rem" }}>
          {conference} · {location}
        </div>
        <div style={{ marginTop: "0.5rem", maxWidth: 260 }}>
          <FitScoreBar score={fitScore} maxScore={100} />
        </div>
      </div>

      {/* Score + scholarship */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        {scholarshipEst !== null && scholarshipEst !== undefined && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>bourse est.</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--teal)" }}>
              ~{Math.round(scholarshipEst)}%
            </div>
          </div>
        )}

        {/* Score circle */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: `conic-gradient(var(--red) ${score * 3.6}deg, var(--navy-mid) 0deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            {score}
          </div>
        </div>

        {/* Email button */}
        <Link
          href={`/match/${universityId}`}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            padding: "0.5rem 0.875rem",
            borderRadius: "8px",
            fontSize: "0.8rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Email →
        </Link>
      </div>
    </div>
  );
}
