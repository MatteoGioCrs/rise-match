/**
 * Auth helpers — store token in both localStorage (for API requests)
 * and a cookie (for middleware route protection).
 */

export function saveAuth(token: string, swimmerId: string, plan: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("rise_token", token);
  localStorage.setItem("rise_swimmer_id", swimmerId);
  localStorage.setItem("rise_plan", plan);
  // Cookie for middleware (session-scoped, readable server-side)
  document.cookie = `rise_token=${token}; path=/; SameSite=Lax`;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("rise_token");
  localStorage.removeItem("rise_swimmer_id");
  localStorage.removeItem("rise_plan");
  document.cookie = "rise_token=; path=/; max-age=0";
}
