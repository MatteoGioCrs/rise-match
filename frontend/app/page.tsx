"use client";

import Link from "next/link";
import { ArrowRight, Zap, Trophy, BarChart3, Users, BookOpen, TrendingUp } from "lucide-react";

const SAMPLE_MATCHES = [
  { name: "Drury University", div: "D2", conf: "GLVC", score: 87, scholarship: 70 },
  { name: "Indiana University", div: "D1", conf: "Big Ten", score: 74, scholarship: 45 },
  { name: "University of Denver", div: "D1", conf: "Summit", score: 68, scholarship: 35 },
  { name: "Auburn University", div: "D1", conf: "SEC", score: 61, scholarship: 25 },
];

const FEATURES = [
  {
    icon: <Users size={24} />,
    title: "Vacances de roster",
    desc: "Identifie les équipes qui perdent leurs seniors sur tes épreuves cette saison.",
    color: "var(--red)",
  },
  {
    icon: <Zap size={24} />,
    title: "Conversion SCY",
    desc: "Tes temps LCM/SCM convertis en SCY via deux tables de référence combinées.",
    color: "var(--blue)",
  },
  {
    icon: <Trophy size={24} />,
    title: "Score conférence",
    desc: "Compares tes temps aux derniers résultats de conférence — scorerais-tu des points ?",
    color: "var(--teal)",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Valeur relais",
    desc: "Détecte les relais sans spécialiste dans le roster et si tu peux les combler.",
    color: "var(--blue)",
  },
  {
    icon: <BookOpen size={24} />,
    title: "Fit académique",
    desc: "Tes filières cibles vs programmes disponibles. GPA estimé vs taux d'admission.",
    color: "var(--teal)",
  },
  {
    icon: <TrendingUp size={24} />,
    title: "Courbe de progression",
    desc: "Régression linéaire sur ton historique FFN. Projection vers ton pic de performance.",
    color: "var(--red)",
  },
];

export default function LandingPage() {
  return (
    <div style={{ background: "var(--navy)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "1.25rem", letterSpacing: "0.05em" }}>
          RISE<span style={{ color: "var(--red)" }}>.</span>MATCH
        </span>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="#pricing" style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Tarifs
          </Link>
          <Link href="/login" style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Connexion
          </Link>
          <Link
            href="/register"
            style={{
              background: "var(--red)",
              color: "#fff",
              padding: "0.5rem 1.25rem",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
          padding: "5rem 4rem",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "2rem" }}>
          <div>
            <div
              style={{
                display: "inline-block",
                background: "rgba(192,57,43,0.15)",
                color: "var(--red)",
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              FFN + SwimCloud connectés
            </div>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: 800,
                lineHeight: 1.15,
                color: "var(--text-primary)",
              }}
            >
              Trouve les universités qui ont{" "}
              <span style={{ color: "var(--red)" }}>besoin de toi.</span>
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.125rem", lineHeight: 1.7 }}>
            6 modules algorithmiques analysent les vacances de roster, les scores de conférence,
            la valeur relais et ton fit académique. Résultat : un score de compatibilité par
            université américaine ou canadienne.
          </p>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: "2rem" }}>
            {[
              ["347+", "programmes"],
              ["6", "critères"],
              ["FFN", "connecté"],
              ["SwimCloud", "intégré"],
            ].map(([val, label]) => (
              <div key={label}>
                <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--text-primary)" }}>
                  {val}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link
              href="/register"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "var(--red)",
                color: "#fff",
                padding: "0.875rem 2rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              Calculer mes matchs <ArrowRight size={18} />
            </Link>
            <Link
              href="/demo"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                padding: "0.875rem 2rem",
                borderRadius: "8px",
                fontWeight: 500,
                fontSize: "1rem",
              }}
            >
              Tester l&apos;algorithme →
            </Link>
          </div>
        </div>

        {/* Right — live match widget */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Exemple · Lucas M. · Brasse · 1:02.41 LCM
          </div>
          {SAMPLE_MATCHES.map((m) => (
            <div
              key={m.name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "8px",
                    background: "var(--navy-mid)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                  }}
                >
                  {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{m.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {m.div} · {m.conf}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>bourse est.</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--teal)" }}>
                    ~{m.scholarship}%
                  </div>
                </div>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: `conic-gradient(var(--red) ${m.score * 3.6}deg, var(--navy-mid) 0deg)`,
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
                    {m.score}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: "4rem", maxWidth: "1280px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          6 modules algorithmiques
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.75rem",
              }}
            >
              <div
                style={{
                  color: f.color,
                  marginBottom: "1rem",
                  width: 40,
                  height: 40,
                  background: `${f.color}22`,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "4rem", maxWidth: "1280px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          Tarifs
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          {[
            {
              name: "Free",
              price: "0€",
              desc: "Pour explorer",
              features: ["Top 5 matchs", "Score global visible", "Sans carte bancaire"],
              cta: "Commencer gratuitement",
              highlight: false,
            },
            {
              name: "Match",
              price: "29€/mois",
              desc: "Pour agir",
              features: [
                "Tous les matchs illimités",
                "Détail des 6 modules",
                "Emails pré-rédigés",
                "Contacts des coaches",
                "Courbe de progression",
              ],
              cta: "Passer à Match",
              highlight: true,
            },
            {
              name: "Accompagné",
              price: "Sur devis",
              desc: "Suivi personnalisé RISE Athletics",
              features: [
                "Tout Match inclus",
                "Conseiller dédié",
                "Relecture emails",
                "Préparation entretiens",
              ],
              cta: "Nous contacter",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? "var(--navy-mid)" : "var(--surface)",
                border: `1px solid ${plan.highlight ? "var(--red)" : "var(--border)"}`,
                borderRadius: "12px",
                padding: "2rem",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{plan.name}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                {plan.price}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                {plan.desc}
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--teal)" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: plan.highlight ? "var(--red)" : "transparent",
                  border: `1px solid ${plan.highlight ? "var(--red)" : "var(--border)"}`,
                  color: "#fff",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Coach banner */}
      <section
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          padding: "2.5rem 4rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Coach universitaire US ou canadien ?{" "}
          <Link href="/register?role=coach" style={{ color: "var(--blue)", fontWeight: 600 }}>
            Accès gratuit aux profils nageurs →
          </Link>
        </p>
      </section>
    </div>
  );
}
