import type {
  Activity, AgeGroup, Day, IntakeResult, Narration, ParentPlan, Place, SchoolPlan, SchoolSlot,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("Can't reach the Bahar Khelo server. Is the API running?", 0);
  }
  if (!res.ok) {
    let detail = `Something went wrong (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export function searchPlaces(q: string, signal?: AbortSignal) {
  return request<Place[]>(`/api/places?q=${encodeURIComponent(q)}`, { signal });
}

export interface ParentQuery {
  lat: number;
  lon: number;
  age: AgeGroup;
  activity: Activity;
  minutes: number;
  asthma: boolean;
  day: Day;
  usual: number;
}

export function getParentPlan(q: ParentQuery) {
  const params = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]));
  return request<ParentPlan>(`/api/plan?${params}`);
}

export function getNarration(q: ParentQuery, name: string | null, lang: "en" | "hi") {
  return request<Narration>("/api/narrate", {
    method: "POST",
    body: JSON.stringify({ ...q, name, lang }),
  });
}

export function readIntake(text: string) {
  return request<IntakeResult>("/api/intake", { method: "POST", body: JSON.stringify({ text }) });
}

export interface SchoolQuery {
  lat: number;
  lon: number;
  students: number;
  age: AgeGroup;
  day: Day;
  school_start: number;
  school_end: number;
  slots: SchoolSlot[];
}

export function getSchoolPlan(q: SchoolQuery) {
  const body = { ...q, slots: q.slots.map(({ id: _id, ...s }) => s) };
  return request<SchoolPlan>("/api/school", { method: "POST", body: JSON.stringify(body) });
}

export function getHealth() {
  return request<{ ok: boolean; agent: boolean }>("/api/health");
}

export function askChiku(question: string, context: Record<string, string | number | boolean | null>) {
  return request<{ answer: string }>("/api/ask", {
    method: "POST",
    body: JSON.stringify({ question, context }),
  });
}
