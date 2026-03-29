"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // TODO: replace with real JWT auth
    if (email && password) {
      localStorage.setItem("token", "demo-token");
      localStorage.setItem("swimmer_id", "demo-swimmer-id");
      router.push("/dashboard");
    } else {
      setError("Email et mot de passe requis.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--navy)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "2.5rem",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <Link
            href="/"
            style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.05em" }}
          >
            RISE<span style={{ color: "var(--red)" }}>.</span>MATCH
          </Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "1.5rem" }}>
            Connexion
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: "var(--navy-mid)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.75rem",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                background: "var(--navy-mid)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.75rem",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                outline: "none",
              }}
            />
          </div>
          {error && (
            <p style={{ color: "var(--red)", fontSize: "0.875rem" }}>{error}</p>
          )}
          <button
            type="submit"
            style={{
              background: "var(--red)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          >
            Se connecter
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Pas encore de compte ?{" "}
          <Link href="/register" style={{ color: "var(--blue)" }}>
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
