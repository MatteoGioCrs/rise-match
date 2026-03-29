"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, MatchDetail } from "@/lib/api-client";
import FitScoreBar from "@/components/FitScoreBar";
import EmailGenerator from "@/components/EmailGenerator";

const MODULES = [
  { key: "score_vacancy",    label: "Vacance roster",   weight: 30 },
  { key: "score_conf",       label: "Conférence",       weight: 20 },
  { key: "score_conversion", label: "Conversion SCY",   weight: 20 },
  { key: "score_relay",      label: "Relais",           weight: 10 },
  { key: "score_academic",   label: "Académique",       weight: 15 },
  { key: "score_progress",   label: "Progression",      weight: 5  },
] as const;

export default function MatchDetailPage() {
  const { univId } = useParams<{ univId: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const swimmerId = localStorage.getItem("rise_swimmer_id") || "demo";
    api
      .getMatchDetail(swimmerId, parseInt(univId))
      .then(setMatch)
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  }, [univId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        Chargement du match...
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        Match introuvable ou plan insuffisant.
      </div>
    );
  }

  const score = Math.round(match.fit_score);

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left panel */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
            {match.university_name}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "1.5rem" }}>
            {match.division} · {match.conference}
            <br />
            {match.city}, {match.state}
          </p>

          {/* Score circle */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: `conic-gradient(var(--red) ${score * 3.6}deg, var(--navy-mid) 0deg)`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 78,
                  height: 78,
                  borderRadius: "50%",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "1.5rem" }}>{score}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>/ 100</span>
              </div>
            </div>
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Score de compatibilité
            </p>
          </div>

          {/* Module bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {MODULES.map((mod) => {
              const val = match[mod.key as keyof MatchDetail] as number | null;
              return (
                <div key={mod.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>{mod.label}</span>
                    <span style={{ fontWeight: 600 }}>{val !== null && val !== undefined ? Math.round(val) : "—"}%</span>
                  </div>
                  <FitScoreBar score={val ?? 0} maxScore={100} />
                </div>
              );
            })}
          </div>

          {match.scholarship_est && (
            <div
              style={{
                marginTop: "1.5rem",
                background: "rgba(29,158,117,0.1)",
                border: "1px solid var(--teal)",
                borderRadius: "8px",
                padding: "0.875rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Bourse estimée</div>
              <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--teal)" }}>
                ~{Math.round(match.scholarship_est)}%
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Analysis cards 2x2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Vacancy */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                Analyse des vacances
              </h3>
              {match.vacancy_detail ? (
                <>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                    {match.vacancy_detail.seniors_leaving?.length || 0} seniors partants
                  </p>
                  {match.vacancy_detail.events_covered?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                      {match.vacancy_detail.events_covered.map((ev: string) => (
                        <span
                          key={ev}
                          style={{
                            background: "rgba(192,57,43,0.15)",
                            color: "var(--red)",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                          }}
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}
                  {match.vacancy_detail.is_priority && (
                    <p style={{ fontSize: "0.75rem", color: "var(--red)", marginTop: "0.5rem", fontWeight: 600 }}>
                      ★ Vacance prioritaire
                    </p>
                  )}
                </>
              ) : (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Données roster non disponibles
                </p>
              )}
            </div>

            {/* Conference */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                Score conférence
              </h3>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--blue)" }}>
                {match.score_conf !== null && match.score_conf !== undefined
                  ? Math.round(match.score_conf)
                  : "—"}
                <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--text-secondary)" }}>/100</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Basé sur les derniers championnats de conférence (8e place = seuil de score NCAA)
              </p>
            </div>

            {/* Converted times */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                Temps convertis SCY
              </h3>
              <div
                style={{
                  background: "rgba(192,57,43,0.08)",
                  border: "1px solid rgba(192,57,43,0.2)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.75rem",
                }}
              >
                ≈ approximation — conversion multi-tables LCM/SCM→SCY
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Score confiance conversion :{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {match.score_conversion !== null && match.score_conversion !== undefined
                    ? Math.round(match.score_conversion)
                    : "—"}%
                </strong>
              </p>
            </div>

            {/* Academic */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                Fit académique
              </h3>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--teal)" }}>
                {match.score_academic !== null && match.score_academic !== undefined
                  ? Math.round(match.score_academic)
                  : "—"}
                <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--text-secondary)" }}>/100</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Filières disponibles + GPA estimé vs taux d&apos;admission
              </p>
            </div>
          </div>

          {/* Email generator */}
          <EmailGenerator
            swimmerId={localStorage.getItem("rise_swimmer_id") || ""}
            universityId={parseInt(univId)}
            universityName={match.university_name}
            coachEmail={match.coach_head_email}
          />
        </div>
      </div>
    </div>
  );
}
