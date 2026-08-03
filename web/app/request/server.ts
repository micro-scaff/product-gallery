// Server-side Product Gallery request helpers.
//
// These functions are used only from Next.js Server Components / route files.
// They fetch initial page data during SSR so the browser does not have to render
// sample data first and then immediately re-request the same list/detail data.

type ServerEnvelope<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

const SERVER_API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:18080";

export function serverQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export async function serverRequest<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${SERVER_API_BASE}${path}`, {
      // Product/admin data changes frequently during local implementation, so
      // each request should read fresh data instead of using a static cache.
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as ServerEnvelope<T>;
    if (!response.ok || payload.error) {
      return null;
    }
    return payload.data ?? null;
  } catch {
    // SSR should not fail the whole page just because the local Go backend is
    // stopped. Client pages still render with their sample fallback data.
    return null;
  }
}
