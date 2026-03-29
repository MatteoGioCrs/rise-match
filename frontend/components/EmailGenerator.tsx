"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Mail, Send, AlertTriangle } from "lucide-react";

interface EmailGeneratorProps {
  swimmerId: string;
  universityId: number;
  universityName: string;
  coachEmail?: string | null;
}

export default function EmailGenerator({
  swimmerId,
  universityId,
  universityName,
  coachEmail,
}: EmailGeneratorProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>(coachEmail ? [coachEmail] : []);
  const [isShutdown, setIsShutdown] = useState(false);
  const [shutdownWarning, setShutdownWarning] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const result = await api.generateEmail(swimmerId, universityId);
      setSubject(result.subject);
      setBody(result.body);
      setRecipients(result.recipients);
      setIsShutdown(result.is_ncaa_shutdown);
      setShutdownWarning(result.shutdown_warning || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!subject || !body || recipients.length === 0) return;
    setSending(true);
    setError("");
    try {
      await api.sendEmail({ swimmer_id: swimmerId, university_id: universityId, subject, body, recipients });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "var(--navy-mid)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.75rem",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    outline: "none",
    resize: "vertical" as const,
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <Mail size={18} style={{ color: "var(--blue)" }} />
        <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>
          Générer un email pour {universityName}
        </h3>
      </div>

      {/* NCAA shutdown warning */}
      {isShutdown && shutdownWarning && (
        <div
          style={{
            background: "rgba(243,156,18,0.1)",
            border: "1px solid rgba(243,156,18,0.4)",
            borderRadius: "8px",
            padding: "0.875rem",
            marginBottom: "1rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={16} style={{ color: "#F39C12", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: "0.8rem", color: "#F39C12" }}>{shutdownWarning}</p>
        </div>
      )}

      {!subject ? (
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: "var(--blue)",
            border: "none",
            color: "#fff",
            padding: "0.875rem 1.5rem",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: generating ? "wait" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {generating ? "Génération en cours..." : "Générer l'email de recrutement"}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
              Objet
            </label>
            <input
              style={inputStyle}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
              Destinataires
            </label>
            <input
              style={inputStyle}
              value={recipients.join(", ")}
              onChange={(e) => setRecipients(e.target.value.split(",").map((s) => s.trim()))}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
              Corps du message
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 280 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div
            style={{
              background: "rgba(192,57,43,0.06)",
              border: "1px solid rgba(192,57,43,0.15)",
              borderRadius: "6px",
              padding: "0.625rem 0.875rem",
              fontSize: "0.7rem",
              color: "var(--text-secondary)",
            }}
          >
            Note: This score reflects current probability. Coaches may be in discussions with other
            athletes. Sending multiple emails increases your chances.
          </div>

          {error && <p style={{ color: "var(--red)", fontSize: "0.875rem" }}>{error}</p>}

          {sent ? (
            <p style={{ color: "var(--teal)", fontWeight: 600, fontSize: "0.875rem" }}>
              ✓ Email envoyé à {recipients.join(", ")}
            </p>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleGenerate}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Regénérer
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--red)",
                  border: "none",
                  color: "#fff",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: sending ? "wait" : "pointer",
                  fontSize: "0.875rem",
                }}
              >
                <Send size={14} />
                {sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
