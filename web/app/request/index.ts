import { clearStoredAdminAuth, getStoredAdminSession } from "./session";

export type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export type RequestOptions = RequestInit & {
  /**
   * Whether to prepend the Product Gallery business API origin.
   * Keep this enabled for normal API calls; disable only for absolute URLs.
   */
  withBaseUrl?: boolean;
  /**
   * Some C-end endpoints intentionally run as anonymous visitor requests even
   * when the same browser has an admin login stored in localStorage.
   */
  skipAuth?: boolean;
};

export class RequestError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "REQUEST_ERROR", status = 0) {
    super(message);
    this.name = "RequestError";
    this.code = code;
    this.status = status;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:18080";

// resolveUrl keeps Product Gallery API calls terse while still allowing an
// absolute URL when a caller explicitly opts out.
function resolveUrl(path: string, withBaseUrl = true) {
  if (!withBaseUrl || /^https?:\/\//.test(path)) {
    return path;
  }
  return `${API_BASE}${path}`;
}

// normalizeHeaders centralizes JSON defaults and admin Bearer token injection.
function normalizeHeaders(init?: RequestInit, skipAuth = false) {
  const headers = new Headers(init?.headers);
  const adminSession = getStoredAdminSession();

  // FormData must let the browser set boundary automatically.
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth && adminSession?.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${adminSession.token}`);
  }

  return headers;
}

// buildQuery keeps every list API on the same page/page_size serialization.
export function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

// request is the Product Gallery business API wrapper. It handles base URL,
// local auth injection, network errors and the agreed { data | error } envelope.
export async function request<T>(
  path: string,
  { withBaseUrl = true, skipAuth = false, ...init }: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(resolveUrl(path, withBaseUrl), {
      ...init,
      headers: normalizeHeaders(init, skipAuth),
    });
  } catch {
    throw new RequestError("网络连接失败，请确认服务是否已启动", "NETWORK_ERROR");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || payload.error) {
    if (response.status === 401 && path.startsWith("/api/admin")) {
      clearStoredAdminAuth();
    }
    throw new RequestError(
      payload.error?.message ?? "请求失败",
      payload.error?.code ?? "HTTP_ERROR",
      response.status,
    );
  }

  return payload.data as T;
}
