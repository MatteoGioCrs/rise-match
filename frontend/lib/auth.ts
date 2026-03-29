/**
 * Auth helpers — store token in both localStorage (for API requests)
 * and a cookie (for middleware route protection).
 */

export function saveAuth(token: string, swimmerId: string, plan: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  localStorage.setItem("swimmer_id", swimmerId);
  localStorage.setItem("plan", plan);
  // Cookie for middleware (session-scoped, readable server-side)
  document.cookie = `token=${token}; path=/; SameSite=Lax`;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("swimmer_id");
  localStorage.removeItem("plan");
  document.cookie = "token=; path=/; max-age=0";
}
