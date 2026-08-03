import type { AdminLoginResult, AdminRole, AdminSession } from "../api/types";

const ADMIN_AUTH_KEY = "product_gallery_admin_auth";

export type StoredAdminAuth = AdminLoginResult;

// getStoredAdminAuth is guarded for SSR because Next.js can import this module
// before browser localStorage exists.
export function getStoredAdminAuth(): StoredAdminAuth | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(ADMIN_AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAdminAuth;
  } catch {
    // Corrupt localStorage should not trap the user on protected pages.
    window.localStorage.removeItem(ADMIN_AUTH_KEY);
    return null;
  }
}

// saveStoredAdminAuth notifies AppShell in the same tab as well as other tabs.
export function saveStoredAdminAuth(auth: StoredAdminAuth) {
  window.localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(auth));
  window.dispatchEvent(new Event("product-gallery-auth-change"));
}

// clearStoredAdminAuth is used by logout and failed-auth recovery.
export function clearStoredAdminAuth() {
  window.localStorage.removeItem(ADMIN_AUTH_KEY);
  window.dispatchEvent(new Event("product-gallery-auth-change"));
}

// getStoredAdminSession returns only the token-bearing session slice.
export function getStoredAdminSession(): AdminSession | null {
  return getStoredAdminAuth()?.session ?? null;
}

// getStoredAdminRole is a convenience for navigation and guards.
export function getStoredAdminRole(): AdminRole | null {
  return getStoredAdminAuth()?.session.role ?? null;
}

// canAccessAdminPath implements the first-stage role rules used by AdminGate.
export function canAccessAdminPath(pathname: string, role: AdminRole | null) {
  if (pathname === "/admin/login") {
    return true;
  }
  if (!pathname.startsWith("/admin")) {
    return true;
  }
  if (!role) {
    return false;
  }
  if (role === "super_admin") {
    return true;
  }
  return !pathname.startsWith("/admin/admins") && !pathname.startsWith("/admin/settings");
}
