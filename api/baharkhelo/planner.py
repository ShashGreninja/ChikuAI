"""Find the safest time for children to be outdoors, for a family or a whole school.

Decision model, in order:
  1. Flags. Every hour gets an air flag (CPCB AQI bands, stricter with asthma) and a heat
     flag (WBGT lines for the activity's effort, stricter for under-6s). An outing's flag
     is the worst hour it touches. Flags are hard guardrails: a lower flag always wins.
  2. Lung budget. Among outings with the same flag, prefer the one that spends the least of
     the child's daily healthy-air allowance (see budget.py). Hot hours cost more because
     the child breathes harder, and uncertain hours cost more because the forecast could be
     wrong in the bad direction.
  3. Comfort. Heat strain and rain chance break the remaining ties.
  4. Split. For outings of an hour or more, two shorter sessions in two clean windows are
     offered when they save a meaningful share of the budget.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import aqi, budget, heat, prevention
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
SPLIT_GAP = 120  # minutes between two halves of a split outing
SPLIT_MIN_SAVING = 0.2  # only suggest a split if it saves at least 20% of the budget


def air_level(value: int, asthma: bool) -> int:
    caps = (50, 100, 200) if asthma else (100, 200, 300)
    return next((i for i, c in enumerate(caps) if value <= c), 3)


def fmt(minute: int) -> str:
    h, m = divmod(minute, 60)
    return f"{h % 12 or 12}{f':{m:02d}' if m else ''} {'AM' if h < 12 else 'PM'}"


def assess(fc: Forecast, day: str, p: Profile) -> dict[int, dict]:
    """Per-hour view of the chosen day, keyed by local hour."""
    idx = fc.indices(day)
    wf_cache: dict[int, float] = {}

    def wf_at(i: int) -> float | None:
        if not 0 <= i < len(fc.hours):
            return None
        if i not in wf_cache:
            wf_cache[i] = budget.guideline_factor(aqi.planning_conc(fc.hours, i))[0]
        return wf_cache[i]

    out = {}
    for i in idx:
        h = fc.hours[i]
        conc = aqi.planning_conc(fc.hours, i)
        value, dom, subs = aqi.aqi(conc)
        wf, wf_dom = budget.guideline_factor(conc)
        w = heat.wbgt(h.temp, h.rh, h.sw)
        lead = (h.time - fc.now).total_seconds() / 3600
        u = budget.uncertainty(lead, wf_at(i - 1), wf, wf_at(i + 1))
        a_lvl, h_lvl = air_level(value, p.asthma), heat.level(w, p.intensity, p.age)
        out[h.time.hour] = {
            "hour": h.time.hour, "aqi": value, "aqi_cat": aqi.category(value),
            "dominant": aqi.LABEL[dom], "subindex": {aqi.LABEL[k]: v for k, v in subs.items()},
            "wf": round(wf, 2), "pm25": round(h.conc["pm2_5"], 1),
            "temp": round(h.temp, 1), "feels": round(h.feels, 1), "rh": round(h.rh),
            "wbgt": round(w, 1), "uv": round(h.uv, 1), "rain": round(h.rain),
            "vent_x": round(budget.heat_vent_factor(w), 2), "u": round(u, 3),
            "air_level": a_lvl, "heat_level": h_lvl, "level": max(a_lvl, h_lvl),
            "strain": heat.strain(w, p.intensity),
        }
    return out


@dataclass
class Window:
    start: int
    minutes: int
    level: int
    budget: float  # % of the daily allowance
    risk: float  # budget inflated by forecast uncertainty
    pm25_ug: float
    cost: float
    u: float
    hours: list[dict]

    @property
    def end(self) -> int:
        return self.start + self.minutes

    def public(self) -> dict:
        peak = max(self.hours, key=lambda h: h["aqi"])
        return {
            "start": self.start, "end": self.end, "label": f"{fmt(self.start)} to {fmt(self.end)}",
            "start_label": fmt(self.start), "minutes": self.minutes,
            "level": self.level, "status": STATUS[self.level],
            "budget_pct": round(self.budget, 1), "pm25_ug": round(self.pm25_ug, 1),
            "confidence": budget.confidence_label(self.u),
            "aqi": peak["aqi"], "aqi_cat": peak["aqi_cat"], "dominant": peak["dominant"],
            "subindex": peak["subindex"],
            "wbgt": max(h["wbgt"] for h in self.hours), "temp": max(h["temp"] for h in self.hours),
            "uv": max(h["uv"] for h in self.hours), "rain": max(h["rain"] for h in self.hours),
            "vent_x": max(h["vent_x"] for h in self.hours),
        }


def evaluate(hours: dict[int, dict], p: Profile, start: int, minutes: int | None = None,
             indoor: bool = False) -> Window | None:
    minutes = minutes or p.minutes
    lpm = p.vent * 1000
    allowance = budget.allowance_litres(p.age)
    used, spend, risk, pm, strain, rain, u_sum = [], 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    for hour, mins in segments(start, minutes):
        h = hours.get(hour)
        if h is None:
            return None
        used.append(h)
        ratio = INDOOR_RATIO if indoor else 1.0
        vx = 1.0 if indoor else h["vent_x"]
        litres = lpm * vx * mins
        spend += h["wf"] * ratio * litres
        risk += h["wf"] * ratio * litres * (1 + h["u"])
        pm += h["pm25"] * ratio * litres / 1000
        strain = max(strain, 0.0 if indoor else h["strain"])
        rain = max(rain, h["rain"])
        u_sum += h["u"] * mins
    level = 0 if indoor else max(h["level"] for h in used)
    budget_pct = 100 * spend / allowance
    risk_pct = 100 * risk / allowance
    cost = risk_pct / 10 + strain + rain / 200
    return Window(start, minutes, level, budget_pct, risk_pct, pm, cost, u_sum / minutes, used)


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


def best_split(hours, p: Profile, earliest: int, single: Window | None) -> dict | None:
    """Two half-length sessions at least SPLIT_GAP apart, if clearly better than one."""
    if p.minutes < 60 or single is None:
        return None
    half = p.minutes // 2
    ws = candidates(hours, p, earliest, DAY_END, minutes=half)
    best = None
    for a in ws:
        for b in ws:
            if b.start < a.end + SPLIT_GAP:
                continue
            key = (max(a.level, b.level), a.cost + b.cost)
            if best is None or key < best[0]:
                best = (key, a, b)
    if best is None:
        return None
    (level, _), a, b = best
    total = a.budget + b.budget
    if level > single.level or total > (1 - SPLIT_MIN_SAVING) * single.budget:
        return None
    return {"sessions": [a.public(), b.public()], "level": level, "status": STATUS[level],
            "budget_pct": round(total, 1), "saved_vs_single_pct": _pct_saved(total, single.budget)}


def plan_parent(fc: Forecast, p: Profile, day: str = "today", usual: int = 17 * 60) -> dict:
    hours = assess(fc, day, p)
    today = day == "today"
    now_min = fc.now.hour * 60 + fc.now.minute
    earliest = max(DAY_START, _round_up(now_min)) if today else DAY_START

    pick = _best(candidates(hours, p, earliest, DAY_END))
    all_day = candidates(hours, p, DAY_START, DAY_END)
    worst = max(all_day, key=lambda w: w.budget) if all_day else None
    usual_w = evaluate(hours, p, usual)

    hint = None
    if today and (pick is None or pick.level >= 2):
        t_pick = _best(candidates(assess(fc, "tomorrow", p), p, DAY_START, DAY_END))
        if t_pick and (pick is None or t_pick.level < pick.level):
            hint = t_pick.public()

    hour_list = [_public_hour(h) for h in hours.values()]
    pick_pub = pick.public() if pick else None
    allowance = budget.allowance_litres(p.age)
    plan = {
        "mode": "parent", "day": day, "date": fc.target(day).isoformat(),
        "timezone": fc.timezone, "now_min": now_min if today else None,
        "profile": {
            "age": p.age, "activity": p.label, "activity_key": p.activity, "intensity": p.intensity,
            "minutes": p.minutes, "asthma": p.asthma, "litres_per_min": round(p.vent * 1000, 1),
            "body_kg": INHALATION[p.age]["bw"], "per_kg_vs_adult": round(p.per_kg_vs_adult, 1),
            "daily_litres": round(allowance),
        },
        "day_aqi": day_aqi(fc, day),
        "hours": hour_list,
        "pick": pick_pub,
        "usual": usual_w.public() if usual_w else None,
        "worst": worst.public() if worst else None,
        "split": best_split(hours, p, earliest, pick),
        "tomorrow_hint": hint,
        "saved_vs_usual_pct": _pct_saved(pick.budget, usual_w.budget) if pick and usual_w else None,
        "saved_vs_worst_pct": _pct_saved(pick.budget, worst.budget) if pick and worst else None,
        "prevention": prevention.suggestions(p, pick_pub, hour_list) if pick else [],
    }
    return plan


PRIORITY = {"high": 0, "moderate": 1, "light": 2, "sedentary": 3}


def plan_school(fc: Forecast, slots: list[dict], students: int = 500, day: str = "tomorrow",
                age: str = "6-10", school_start: int = 8 * 60, school_end: int = 14 * 60) -> dict:
    """slots: [{"name", "activity", "start" (minutes from midnight), "minutes", "movable"?}]"""
    profiles = [Profile(age=age, activity=s["activity"], minutes=s["minutes"]) for s in slots]
    hours_by_slot = [assess(fc, day, p) for p in profiles]
    taken = {i: (s["start"], s["start"] + s["minutes"]) for i, s in enumerate(slots)}
    order = sorted(range(len(slots)), key=lambda i: (PRIORITY[profiles[i].intensity], slots[i]["start"]))
    earliest = school_start
    if day == "today":  # never move a period into time that has already gone
        earliest = max(school_start, _round_up(fc.now.hour * 60 + fc.now.minute))

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
        elif best and (best.level < cur.level or (best.level == cur.level and best.budget < 0.7 * cur.budget)):
            action, final = "move", best
        elif cur.level >= 2:
            action = "indoors"
            final = evaluate(hours, Profile(age=age, activity="assembly", minutes=s["minutes"]),
                             s["start"], indoor=True)
        else:
            action, final = "easy", cur
        taken[i] = (final.start, final.end)
        before += cur.budget
        after += final.budget
        rows[i] = {
            "name": s["name"], "activity": p.label, "minutes": s["minutes"], "movable": movable,
            "action": action, "current": cur.public(), "final": final.public(),
            "saved_pct": _pct_saved(final.budget, cur.budget),
            "reasons": _reasons(cur, final, action),
        }

    base = Profile(age=age, activity="recess")
    return {
        "mode": "school", "day": day, "date": fc.target(day).isoformat(),
        "timezone": fc.timezone, "students": students, "age": age,
        "school_hours": {"start": school_start, "end": school_end,
                         "label": f"{fmt(school_start)} to {fmt(school_end)}"},
        "day_aqi": day_aqi(fc, day),
        "hours": [_public_hour(h) for h in assess(fc, day, base).values()],
        "rows": [rows[i] for i in range(len(slots))],
        "changes": sum(1 for r in rows.values() if r["action"] != "keep"),
        "cooler_moves": sum(1 for r in rows.values() if "cooler" in r["reasons"]),
        "budget_before": round(before, 1), "budget_after": round(after, 1),
        "saved_pct": _pct_saved(after, before),
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
    if final.budget < 0.9 * cur.budget:
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


def _public_hour(h: dict) -> dict:
    return {k: v for k, v in h.items() if k != "strain"} | {"status": STATUS[h["level"]]["key"]}
