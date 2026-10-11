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

export interface AirNow {
  aqi: number;
  aqi_cat: string;
  dominant: string;
  temp: number;
  feels: number;
  wbgt: number;
  is_day: boolean;
}

export function getNow(lat: number, lon: number) {
  return request<AirNow>(`/api/now?lat=${lat}&lon=${lon}`);
}

export function getHealth() {
  return request<{ ok: boolean; agent: boolean; email: boolean; calls: boolean }>("/api/health");
}

export function requestCall(phone: string, lang: "en" | "hi", consent: boolean) {
  return request<{ status: string; to: string }>("/api/call", {
    method: "POST",
    body: JSON.stringify({ phone, lang, consent }),
  });
}

/** POST JSON, receive a file, and hand it to the browser as a download. */
async function download(path: string, body: unknown, fallbackName: string) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new ApiError("Can't reach the Bahar Khelo server.", 0);
  });
  if (!res.ok) throw new ApiError(`Couldn't make the report (${res.status})`, res.status);
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadParentReport(q: ParentQuery, place: string, name: string | null, note: string | null) {
  return download("/api/report/parent", { ...q, place, name, note }, "bahar-khelo-plan.pdf");
}

export interface SchoolReportQuery extends SchoolQuery {
  place: string;
  school_name: string;
  circular: string;
}

function schoolBody(q: SchoolReportQuery) {
  return { ...q, slots: q.slots.map(({ id: _id, ...s }) => s) };
}

export function downloadSchoolReport(q: SchoolReportQuery) {
  return download("/api/report/school", schoolBody(q), "bahar-khelo-timetable.pdf");
}

export function emailSchoolReport(q: SchoolReportQuery, to: string[]) {
  return request<{ sent: number }>("/api/report/school/email", {
    method: "POST",
    body: JSON.stringify({ ...schoolBody(q), to }),
  });
}

export function askChiku(question: string, context: Record<string, string | number | boolean | null>) {
  return request<{ answer: string }>("/api/ask", {
    method: "POST",
    body: JSON.stringify({ question, context }),
  });
}
