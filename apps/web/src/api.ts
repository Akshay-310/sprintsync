const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "sprintsync_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : null,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const base = data && typeof data.error === "string" ? data.error : "Request failed";
    const details =
      data && Array.isArray(data.details)
        ? data.details
            .map((d: { path: string; message: string }) => `${d.path}: ${d.message}`)
            .join(", ")
        : "";
    throw new ApiError(res.status, details ? `${base} (${details})` : base);
  }
  return data as T;
}