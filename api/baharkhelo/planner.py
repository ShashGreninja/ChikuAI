"""Find the safest time for children to be outdoors, for a family or a whole school.

Every hour gets two flags (air, heat) on a 0–3 scale; an outing's flag is the worst hour it
touches. Among outings with the same flag we prefer the one with the lowest pollution dose
and heat strain. The pollution dose is NAAQS-relative:

    dose = Σ  air_factor(hour) × breathing rate (L/min) × minutes in that hour

so "1,000" means the child took in as much pollution as 1,000 litres of air sitting exactly
at India's legal limit. PM2.5 mass (µg) is reported alongside as a concrete number.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import aqi, heat
from .data import Forecast
from .exposure import INHALATION, Profile, segments

STATUS = (
    {"key": "go", "label": "Go play", "hi": "खेलो!"},
    {"key": "caution", "label": "Go easy", "hi": "आराम से खेलो"},
    {"key": "limit", "label": "Keep it short", "hi": "थोड़ी देर ही"},
    {"key": "stop", "label": "Stay indoors", "hi": "अंदर रहो"},
)

DAY_START, DAY_END, STEP = 6 * 60, 20 * 60, 30  # outdoor hours for children, minutes
INDOOR_RATIO = 0.6  # indoor/outdoor PM ratio typical of naturally ventilated Indian classrooms


def air_level(value: int, asthma: bool) -> int:
    caps = (50, 100, 200) if asthma else (100, 200, 300)
    return next((i for i, c in enumerate(caps) if value <= c), 3)


def fmt(minute: int) -> str:
    h, m = divmod(minute, 60)
    return f"{h % 12 or 12}{f':{m:02d}' if m else ''} {'AM' if h < 12 else 'PM'}"


def assess(fc: Forecast, day: str, p: Profile) -> dict[int, dict]:
    """Per-hour view of the chosen day, keyed by local hour."""
    out = {}
    for i in fc.indices(day):
        h = fc.hours[i]
        conc = aqi.planning_conc(fc.hours, i)
        value, dom, subs = aqi.aqi(conc)
        factor, f_dom = aqi.air_factor(conc)
        w = heat.wbgt(h.temp, h.rh, h.sw)
        a_lvl, h_lvl = air_level(value, p.asthma), heat.level(w, p.intensity, p.age)
        out[h.time.hour] = {
            "hour": h.time.hour, "aqi": value, "aqi_cat": aqi.category(value),
            "dominant": aqi.LABEL[dom], "subindex": {aqi.LABEL[k]: v for k, v in subs.items()},
            "factor": round(factor, 2), "pm25": round(h.conc["pm2_5"], 1),
            "temp": round(h.temp, 1), "feels": round(h.feels, 1), "rh": round(h.rh),
            "wbgt": round(w, 1), "uv": round(h.uv, 1), "rain": round(h.rain),
            "air_level": a_lvl, "heat_level": h_lvl, "level": max(a_lvl, h_lvl),
            "strain": heat.strain(w, p.intensity),
        }
    return out


@dataclass
class Window:
    start: int
    minutes: int
    level: int
    dose: float  # NAAQS-litres
    pm25_ug: float
    cost: float
    hours: list[dict]

    @property
    def end(self) -> int:
        return self.start + self.minutes

    def overlaps(self, start: int, end: int) -> bool:
        return self.start < end and start < self.end

    def public(self) -> dict:
        peak = max(self.hours, key=lambda h: h["aqi"])
        return {
            "start": self.start, "end": self.end, "label": f"{fmt(self.start)} – {fmt(self.end)}",
            "start_label": fmt(self.start), "level": self.level, "status": STATUS[self.level],
            "dose": round(self.dose), "pm25_ug": round(self.pm25_ug, 1),
            "aqi": peak["aqi"], "aqi_cat": peak["aqi_cat"], "dominant": peak["dominant"],
            "subindex": peak["subindex"],
            "wbgt": max(h["wbgt"] for h in self.hours), "temp": max(h["temp"] for h in self.hours),
            "uv": max(h["uv"] for h in self.hours), "rain": max(h["rain"] for h in self.hours),
        }


def evaluate(hours: dict[int, dict], p: Profile, start: int, minutes: int | None = None,
             indoor: bool = False) -> Window | None:
    minutes = minutes or p.minutes
    litres_per_min = p.vent * 1000
    used, dose, pm, strain, rain = [], 0.0, 0.0, 0.0, 0.0
    for hour, mins in segments(start, minutes):
        h = hours.get(hour)
        if h is None:
            return None
        used.append(h)
        ratio = INDOOR_RATIO if indoor else 1.0
        dose += h["factor"] * ratio * litres_per_min * mins
        pm += h["pm25"] * ratio * p.vent * mins
        strain = max(strain, 0.0 if indoor else h["strain"])
        rain = max(rain, h["rain"])
    level = 0 if indoor else max(h["level"] for h in used)
    avg_factor = dose / (litres_per_min * minutes)
    cost = avg_factor + strain + rain / 200
    return Window(start, minutes, level, dose, pm, cost, used)


def candidates(hours, p, earliest, latest_end, minutes=None, blocked=()):
    minutes = minutes or p.minutes
    out = []
    for s in range(earliest, latest_end - minutes + 1, STEP):
        if any(b[0] < s + minutes and s < b[1] for b in blocked):
            continue
        w = evaluate(hours, p, s, minutes)
        if w:
            out.append(w)
    return out


def _round_up(minute: int) -> int:
    return -(-minute // STEP) * STEP


def _best(ws: list[Window]) -> Window | None:
    return min(ws, key=lambda w: (w.level, w.cost)) if ws else None


def _pct_saved(new: float, old: float) -> int:
    return round(100 * (1 - new / old)) if old > 0 else 0


def plan_parent(fc: Forecast, p: Profile, day: str = "today", usual: int = 17 * 60) -> dict:
    hours = assess(fc, day, p)
    today = day == "today"
    now_min = fc.now.hour * 60 + fc.now.minute
    earliest = max(DAY_START, _round_up(now_min)) if today else DAY_START

    pick = _best(candidates(hours, p, earliest, DAY_END))
    all_day = candidates(hours, p, DAY_START, DAY_END)
    worst = max(all_day, key=lambda w: w.dose) if all_day else None
    usual_w = evaluate(hours, p, usual)

    hint = None
    if today and (pick is None or pick.level >= 2):
        t_hours = assess(fc, "tomorrow", p)
        t_pick = _best(candidates(t_hours, p, DAY_START, DAY_END))
        if t_pick and (pick is None or t_pick.level < pick.level):
            hint = t_pick.public()

    plan = {
        "mode": "parent", "day": day, "date": fc.target(day).isoformat(),
        "timezone": fc.timezone, "now_min": now_min if today else None,
        "profile": {
            "age": p.age, "activity": p.label, "intensity": p.intensity, "minutes": p.minutes,
            "asthma": p.asthma, "litres_per_min": round(p.vent * 1000, 1),
            "body_kg": INHALATION[p.age]["bw"], "per_kg_vs_adult": round(p.per_kg_vs_adult, 1),
        },
        "day_aqi": day_aqi(fc, day),
        "hours": [_public_hour(h) for h in hours.values()],
        "pick": pick.public() if pick else None,
        "usual": usual_w.public() if usual_w else None,
        "worst": worst.public() if worst else None,
        "tomorrow_hint": hint,
    }
    plan["saved_vs_usual_pct"] = _pct_saved(pick.dose, usual_w.dose) if pick and usual_w else None
    plan["saved_vs_worst_pct"] = _pct_saved(pick.dose, worst.dose) if pick and worst else None
    plan["tips"] = tips(pick, p)
    return plan


PRIORITY = {"high": 0, "moderate": 1, "light": 2, "sedentary": 3}


def plan_school(fc: Forecast, slots: list[dict], students: int = 500, day: str = "tomorrow",
                age: str = "6-10", school_start: int = 8 * 60, school_end: int = 14 * 60) -> dict:
    """slots: [{"name", "activity", "start" (minutes from midnight), "minutes"}]"""
    profiles = [Profile(age=age, activity=s["activity"], minutes=s["minutes"]) for s in slots]
    hours_by_slot = [assess(fc, day, p) for p in profiles]
    taken = {i: (s["start"], s["start"] + s["minutes"]) for i, s in enumerate(slots)}
    earliest = school_start
    if day == "today":  # never move a period into time that has already gone
        earliest = max(school_start, _round_up(fc.now.hour * 60 + fc.now.minute))
    order = sorted(range(len(slots)), key=lambda i: (PRIORITY[profiles[i].intensity], slots[i]["start"]))

    rows: dict[int, dict] = {}
    before = after = 0.0
    for i in order:
        s, p, hours = slots[i], profiles[i], hours_by_slot[i]
        cur = evaluate(hours, p, s["start"])
        if cur is None:
            raise ValueError(f"{s['name']} is outside the forecast range")
        others = [v for k, v in taken.items() if k != i]
        movable = s.get("movable", True)
        best = _best(candidates(hours, p, earliest, school_end, blocked=others)) if movable else None

        if cur.level == 0:
            action, final = "keep", cur
        elif best and (best.level < cur.level or (best.level == cur.level and best.dose < 0.7 * cur.dose)):
            action, final = "move", best
        elif cur.level >= 2:
            action = "indoors"
            final = evaluate(hours, Profile(age=age, activity="assembly", minutes=s["minutes"]),
                             s["start"], indoor=True)
        else:
            action, final = "easy", cur
        taken[i] = (final.start, final.end)
        before += cur.dose
        after += final.dose
        rows[i] = {
            "name": s["name"], "activity": p.label, "minutes": s["minutes"], "movable": movable,
            "action": action, "current": cur.public(), "final": final.public(),
            "saved_pct": _pct_saved(final.dose, cur.dose),
            "reasons": _reasons(cur, final, action),
        }

    base = Profile(age=age, activity="recess")
    return {
        "mode": "school", "day": day,
        "date": fc.target(day).isoformat(),
        "timezone": fc.timezone, "students": students, "age": age,
        "school_hours": {"start": school_start, "end": school_end,
                         "label": f"{fmt(school_start)} – {fmt(school_end)}"},
        "day_aqi": day_aqi(fc, day),
        "hours": [_public_hour(h) for h in assess(fc, day, base).values()],
        "rows": [rows[i] for i in range(len(slots))],
        "changes": sum(1 for r in rows.values() if r["action"] != "keep"),
        "cooler_moves": sum(1 for r in rows.values() if "cooler" in r["reasons"]),
        "dose_before": round(before), "dose_after": round(after),
        "saved_pct": _pct_saved(after, before),
        "saved_school_dose": round((before - after) * students),
    }


def _reasons(cur: Window, final: Window, action: str) -> list[str]:
    """Why a slot was changed, in the words a teacher would use."""
    air = max(h["air_level"] for h in cur.hours)
    hot = max(h["heat_level"] for h in cur.hours)
    if action == "keep":
        return ["clear"]
    if action in ("indoors", "easy"):
        return [r for r, lvl in (("air", air), ("heat", hot)) if lvl == cur.level and lvl > 0]
    out = []
    if max(h["heat_level"] for h in final.hours) < hot:
        out.append("cooler")
    if final.dose < 0.9 * cur.dose:
        out.append("cleaner")
    return out or ["safer"]


def day_aqi(fc: Forecast, day: str) -> dict:
    """CPCB-method AQI (rolling 24 h / 8 h means): the day's peak, and the current value today."""
    idx = fc.indices(day)
    if not idx:
        return {}
    series = []
    for i in idx:
        v, dom, _ = aqi.aqi(aqi.official_conc(fc.hours, i))
        series.append((fc.hours[i].time.hour, v, dom))
    peak = max(series, key=lambda x: x[1])
    out = {"peak": peak[1], "peak_cat": aqi.category(peak[1]), "peak_hour": peak[0],
           "dominant": aqi.LABEL[peak[2]]}
    if day == "today":
        cur = next((x for x in series if x[0] == fc.now.hour), None)
        if cur:
            out |= {"now": cur[1], "now_cat": aqi.category(cur[1])}
    return out


def tips(w: Window | None, p: Profile) -> list[str]:
    if w is None:
        return ["The outdoor window for today has passed — check tomorrow morning."]
    pub, out = w.public(), []
    if p.asthma and pub["aqi"] > 50:
        out.append("Keep the reliever inhaler in the bag and stop at the first cough or wheeze.")
    elif 100 < pub["aqi"] <= 200:
        out.append("Air is Moderate — children are a sensitive group, so mix in rest breaks.")
    if w.level >= 2:
        out.append("Swap running games for calm play, and keep it short.")
    if pub["aqi"] > 200:
        out.append("A well-fitted N95 helps on Poor-air days. Cloth and surgical masks don't stop PM2.5.")
    if pub["wbgt"] >= heat.THRESHOLDS[p.intensity][0] - 1:
        out.append("Water break every 15–20 minutes and pick a shaded spot.")
    if pub["uv"] >= 6:
        out.append("Strong sun — cap and sunscreen.")
    if pub["rain"] >= 50:
        out.append("Rain is likely; carry a raincoat.")
    return out or ["Air and heat both look kind. Enjoy!"]


def _public_hour(h: dict) -> dict:
    return {k: v for k, v in h.items() if k != "strain"} | {"status": STATUS[h["level"]]["key"]}
