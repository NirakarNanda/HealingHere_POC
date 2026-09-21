/**
 * Typed fetch wrapper for the backend REST API.
 * Cookie-based session (credentials: "include"); no tokens in JS.
 *
 * Same-origin by default: /api/* is proxied to the backend by a Next.js
 * rewrite (see next.config.mjs), so the session cookie is first-party and
 * is never blocked as a third-party cookie. NEXT_PUBLIC_API_URL remains as
 * an escape hatch for pointing at a backend directly (e.g. local debugging
 * without the proxy).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the clinic server. Your data stays safe on this device.", 0);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (data && typeof data.message === "string" && data.message) ||
      (res.status === 401 ? "Session expired. Please log in again." : `Request failed (${res.status}).`);
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const authApi = {
  me: () => apiFetch<{ authenticated: boolean; username?: string }>("/auth/me"),
  login: (username: string, password: string) =>
    apiFetch<{ success: boolean }>("/auth/login", { method: "POST", body: { username, password } }),
  logout: () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" }),
};

export interface DeletePatientResponse {
  success: boolean;
  mongoDeleted: boolean;
  sheetDeleted: boolean;
  sheetError?: string;
}

export const patientsApi = {
  deletePatient: (localId: string) =>
    apiFetch<DeletePatientResponse>(`/patients/${encodeURIComponent(localId)}`, {
      method: "DELETE",
    }),
};
