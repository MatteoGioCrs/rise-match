"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, User, TrendingUp, LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { clearAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/profile", label: "Mon profil", icon: <User size={18} /> },
  { href: "/progress", label: "Progression", icon: <TrendingUp size={18} /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  // On mount: validate token and hydrate localStorage if needed
  useEffect(() => {
    const token = localStorage.getItem("rise_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Validate token against /api/auth/me and hydrate swimmer_id / plan
    api.me()
      .then((user) => {
        localStorage.setItem("rise_swimmer_id", user.swimmer_id);
        localStorage.setItem("rise_plan", user.plan);
        setAuthReady(true);
      })
      .catch(() => {
        // Token invalid or expired — clear and redirect
        clearAuth();
        router.replace("/login");
      });
  }, []); // eslint-disable-line

  function handleLogout() {
    clearAuth();
    window.location.href = "/";
  }

  if (!authReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--navy)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          fontSize: "0.875rem",
        }}
      >
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--navy)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: "var(--surface-2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 0",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "0 1.5rem", marginBottom: "2rem" }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.05em" }}>
            RISE<span style={{ color: "var(--red)" }}>.</span>MATCH
          </Link>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0 0.75rem" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "8px",
                  background: isActive ? "var(--navy-mid)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "0 0.75rem" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "8px",
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
