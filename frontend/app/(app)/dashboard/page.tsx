"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, MatchSummary } from "@/lib/api-client";
import MatchCard from "@/components/MatchCard";

const ALL_DIVISIONS = ["D1", "D2", "D3", "NAIA", "USports", "ACAC"];
const SORT_OPTIONS = [
  { value: "fit_score", label: "Fit" },
  { value: "scholarship", label: "Bourse" },
  { value: "academic", label: "Académique" },
];

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // activeDivs: empty array = "Tous" (show all)
  const [activeDivs, setActiveDivs] = useState<string[]>([]);
  const [sort, setSort] = useState("fit_score");

  useEffect(() => {
    const swimmerId = localStorage.getItem("rise_swimmer_id") || "demo";
    const plan = localStorage.getItem("rise_plan") || "free";

    api
      .getMatches(swimmerId, { sort, plan })
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [sort]);

  function toggleDiv(div: string) {
    setActiveDivs((prev) =>
      prev.includes(div) ? prev.filter((d) => d !== div) : [...prev, div]
    );
  }

  function selectAll() {
    setActiveDivs([]);
  }

  const filtered =
    activeDivs.length === 0
      ? matches
      : matches.filter((m) => m.division && activeDivs.includes(m.division));

  // Metrics
  const totalMatches = matches.length;
  const avgScholarship =
    matches.length > 0
      ? Math.round(
          matches.slice(0, 5).reduce((s, m) => s + (m.scholarship_est || 0), 0) /
            Math.min(5, matches.length)
        )
      : 0;

  return (
    <div style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Mes Matchs</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
          Universités classées par score de compatibilité
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total matchs", value: totalMatches },
          { label: "Bourse moy. top 5", value: `~${avgScholarship}%` },
          { label: "Meilleur temps SCY", value: "≈ 57.80" },
          { label: "Emails envoyés", value: "0" },
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.25rem",
            }}
          >
            <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.375rem" }}>
              {metric.label}
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.5rem" }}>{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {/* "Tous" chip */}
          <button
            onClick={selectAll}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: activeDivs.length === 0 ? "var(--red)" : "transparent",
              color: "#fff",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: activeDivs.length === 0 ? 600 : 400,
            }}
          >
            Tous
          </button>
          {ALL_DIVISIONS.map((div) => (
            <button
              key={div}
              onClick={() => toggleDiv(div)}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                background: activeDivs.includes(div) ? "var(--red)" : "transparent",
                color: "#fff",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: activeDivs.includes(div) ? 600 : 400,
              }}
            >
              {div}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.375rem 0.75rem",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Trier par : {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Match list */}
      {loading ? (
        <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "4rem" }}>
          Chargement des matchs...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ marginBottom: "1rem" }}>Aucun match calculé pour l&apos;instant.</p>
          <Link
            href="/profile"
            style={{
              background: "var(--red)",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Compléter mon profil
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((match) => (
            <MatchCard
              key={match.id}
              universityId={match.university_id}
              name={match.university_name}
              division={match.division || ""}
              conference={match.conference || ""}
              location={`${match.city || ""}, ${match.state || match.country}`}
              fitScore={match.fit_score}
              scholarshipEst={match.scholarship_est}
              isPriority={match.is_priority}
              tags={[
                match.is_priority ? "Vacance critique" : null,
                match.score_conf && match.score_conf > 70 ? "Points conférence" : null,
                match.country !== "USA" ? "Recrutement EU" : null,
              ].filter(Boolean) as string[]}
              isBlurred={match.is_blurred}
            />
          ))}
        </div>
      )}
    </div>
  );
}
