import Constants from "expo-constants";
import { mockRequest, MockApiError } from "./mock/server";

/**
 * Client HTTP subțire peste `fetch` — fără nicio bibliotecă suplimentară, ca să fie
 * ușor de citit de cineva care vine din React "clasic". Token-ul JWT e injectat de
 * `AuthContext` prin `setAuthToken`, nu e nevoie să-l pasezi manual la fiecare apel.
 *
 * Baza URL vine din app.json → expo.extra.apiBaseUrl. Pentru telefon fizic pe aceeași
 * rețea Wi-Fi, "localhost" înseamnă telefonul, nu calculatorul tău — schimbă valoarea
 * din app.json cu IP-ul local al calculatorului (ex. "http://192.168.1.20:5017"),
 * vizibil cu `ipconfig` pe Windows.
 */
const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "http://localhost:5017";

/**
 * Comutator mock/real — RUNTIME, nu compile-time. Cât timp `apiMode === "mock"`, toate
 * cererile sunt rutate către `./mock/server.ts` (date în memorie, fără backend
 * pornit). `"real"` trimite cereri HTTP adevărate către `API_BASE_URL` (backend-ul
 * ASP.NET). Fiecare ecran vorbește doar cu `api.get/post/patch/delete` de mai jos,
 * niciodată direct cu `fetch`, deci comutarea nu atinge ecranele — doar modul de-aici.
 *
 * Alegerea utilizatorului (persistată pe dispozitiv, comutator pe ecranul de login) e
 * în `src/state/ApiModeContext.tsx` — acela sincronizează în `apiMode` de mai jos prin
 * `setApiMode()`, exact ca `AuthContext` cu `setAuthToken()`. Nu citi `apiMode` direct
 * dintr-un ecran — folosește `useApiMode()`. Implicit `"mock"`, ca înainte.
 */
export type ApiMode = "mock" | "real";
let apiMode: ApiMode = "mock";

export function getApiMode(): ApiMode {
  return apiMode;
}

/** Pentru descărcări binare (PDF-ul de contract de la server) — `api.get<T>()` de mai
 * jos presupune JSON, nu merge pentru un `application/pdf`. Vezi
 * `downloadAndSharePdf` din `src/documents/pdf.ts`. */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function setApiMode(mode: ApiMode) {
  apiMode = mode;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Apelat de AuthContext ca să golească sesiunea automat la un 401 — ex. tokenul e valid
 * criptografic, dar contul din spatele lui nu mai există (șters, sau baza de date locală
 * de dezvoltare a fost recreată cu alt Guid pentru contul de Nucleu). Fără asta, userul
 * rămâne "logat" în ecranul curent și orice acțiune nouă pică cu același 401, fără cale
 * de ieșire vizibilă în afară de a reporni aplicația manual. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (apiMode === "mock") {
    try {
      const parsedBody = typeof options.body === "string" ? JSON.parse(options.body) : undefined;
      return (await mockRequest(options.method ?? "GET", path, parsedBody, authToken)) as T;
    } catch (err) {
      if (err instanceof MockApiError) {
        if (err.status === 401) onUnauthorized?.();
        throw new ApiError(err.status, err.message);
      }
      throw err;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : undefined;

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    const message = body?.error ?? `Cererea a eșuat (${response.status}).`;
    throw new ApiError(response.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
