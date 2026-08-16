import { request } from "../request";
import type { AdminLoginResult, AdminSession, Captcha, FlowTalkToken } from "./types";

// authApi wraps Product Gallery authentication endpoints and the temporary
// Flow Talk token handoff endpoint.
export const authApi = {
  // C-end captcha endpoint; currently kept for the documented login flow.
  captcha() {
    return request<Captcha>("/api/client/captcha");
  },

  // Admin login returns both the admin profile and local Product Gallery token.
  adminLogin(payload: { username: string; password: string }) {
    return request<AdminLoginResult>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Read the server-side view of the current admin session.
  adminMe() {
    return request<AdminSession>("/api/admin/auth/me");
  },

  // Logout is best-effort; the frontend clears local storage regardless.
  adminLogout() {
    return request<{ ok: boolean }>("/api/admin/auth/logout", {
      method: "POST",
    });
  },

  // Exchange the current Product Gallery admin session for a stable external
  // token that Flow Talk's demo provider can accept.
  adminFlowTalkToken() {
    return request<FlowTalkToken>("/api/admin/flow-talk/token", {
      method: "POST",
    });
  },

  // Anonymous C-end visitors use a stable device id to map into Flow Talk's
  // demo provider during local联调.
  clientFlowTalkToken(visitorDeviceId: string) {
    return request<FlowTalkToken>("/api/client/flow-talk/token", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ visitor_device_id: visitorDeviceId }),
    });
  },
};
