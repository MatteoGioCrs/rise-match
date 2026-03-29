"use client";

import { useState } from "react";
import ProgressionChart from "@/components/ProgressionChart";

// Sample data — in production, fetch from /api/swimmer/{id}/performances
const SAMPLE_HISTORY = [
  { date: "2023-03", time: 66.5, label: "Mar 2023" },
  { date: "2023-09", time: 65.2, label: "Sep 2023" },
  { date: "2024-03", time: 63.8, label: "Mar 2024" },
  { date: "2024-11", time: 63.0, label: "Nov 2024" },
  { date: "2025-03", time: 62.41, label: "Mar 2025" },
];

const POTENTIAL_PROJECTION = [
  { date: "2025-03", time: 62.41, label: "Mar 2025" },
  { date: "2025-09", time: 61.5, label: "Sep 2025 (proj.)" },
  { date: "2026-03", time: 60.7, label: "Mar 2026 (proj.)" },
  { date: "2026-09", time: 60.0, label: "Sep 2026 (proj.)" },
  { date: "2027-03", time: 59.4, label: "Peak est. (proj.)" },
];

const EVENTS = ["100BR", "200BR"];

export default function ProgressPage() {
  const [activeEvent, setActiveEvent] = useState("100BR");

  // Delta last 12 months
  const last = SAMPLE_HISTORY[SAMPLE_HISTORY.length - 1].time;
  const oneYearAgo = SAMPLE_HISTORY.find((p) => p.date <= "2024-03")?.time || last;
  const delta12m = last - oneYearAgo;

  // Potential at peak
  const peakProjection = POTENTIAL_PROJECTION[POTENTIAL_PROJECTION.length - 1].time;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Courbe de Progression</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
          Historique FFN + projection de potentiel
        </p>
      </div>

      {/* Event selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {EVENTS.map((ev) => (
          <button
            key={ev}
            onClick={() => setActiveEvent(ev)}
            style={{
              padding: "0.375rem 1rem",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: activeEvent === ev ? "var(--red)" : "transparent",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: activeEvent === ev ? 600 : 400,
            }}
          >
            {ev}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1rem", display: "flex", gap: "1.5rem", fontSize: "0.8rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ display: "inline-block", width: 20, height: 2, background: "var(--navy-mid)", border: "2px solid var(--blue)" }} />
            Historique réel (FFN)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ display: "inline-block", width: 20, height: 0, borderTop: "2px dashed var(--red)" }} />
            Projection potentiel
          </span>
        </div>

        <ProgressionChart
          history={SAMPLE_HISTORY}
          projection={POTENTIAL_PROJECTION}
          eventCode={activeEvent}
        />
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
            Delta 12 mois
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: delta12m < 0 ? "var(--teal)" : "var(--red)",
            }}
          >
            {delta12m > 0 ? "+" : ""}{delta12m.toFixed(2)}s
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {delta12m < 0 ? "Progression forte" : delta12m < 0.5 ? "Plateau" : "Régression"}
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
            Potentiel estimé (pic)
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--red)" }}>
            {peakProjection.toFixed(2)}s
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            ~{Math.floor(peakProjection / 60)}:{(peakProjection % 60).toFixed(2).padStart(5, "0")} SCY
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
            Meilleur temps actuel
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
            {last.toFixed(2)}s
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            ≈ {(last * 0.926).toFixed(2)}s SCY (LCM→SCY)
          </div>
        </div>
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
        ≈ Projections approximatives — régression linéaire sur historique FFN + heuristique -0.8%/an jusqu&apos;au pic d&apos;âge.
        Ne constitue pas une garantie de performance.
      </p>
    </div>
  );
}
