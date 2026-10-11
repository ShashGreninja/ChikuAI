"""The School plan: for timetables that don't move.

Indian schools run a fixed weekly timetable, so the useful questions each morning are:
  * What should each outdoor period *do* today? (an activity ladder, not a new time)
  * Would swapping two classes' PE slots get both of them better air or less heat?
  * Which day this week is best for the inter-house match?
"""
from __future__ import annotations

from .data import Forecast
from .exposure import Profile
from .planner import (DAY_END, DAY_START, STATUS, _best, _round_up, assess, candidates, day_aqi, evaluate,
                      fmt, _public_hour)

KIND_LABEL = {"pe": "PE / games", "sports": "Sports practice", "assembly": "Assembly", "recess": "Recess",
              "walk": "Nature walk"}

# What each kind of period should become at each flag: go / caution / limit / stop.
LADDER = {
    "pe": ["Full games outside", "Light drills outside, water break every 15 minutes",
           "Yoga or indoor games in the hall", "Stretching and theory in the classroom"],
    "sports": ["Practice as planned", "Skills only, no full matches, extra water",
               "Indoor fitness in the hall", "Cancel outdoor practice"],
    "assembly": ["Assembly outside as usual", "Short assembly outside, 10 minutes",
                 "Assembly in the hall", "Assembly over the PA, in classrooms"],
    "recess": ["Recess outside", "Recess outside, in shaded areas", "Recess in corridors and the hall",
               "Recess in classrooms"],
    "walk": ["Walk as planned", "Shorter walk on shaded paths", "Indoor activity instead", "Indoor activity instead"],
}

SWAPPABLE = {"pe", "sports"}
YOUNGEST = ("3-5", "6-10", "11-15")


def _drivers(window) -> list[str]:
    air = max(h["air_level"] for h in window.hours)
    heat = max(h["heat_level"] for h in window.hours)
    out = []
    if air and air >= heat:
        out.append("air")
    if heat and heat >= air:
        out.append("heat")
    return out


class _Hours:
    """assess() is the expensive bit; cache it per (age, activity, asthma)."""

    def __init__(self, fc: Forecast, day: str):
        self.fc, self.day, self.cache = fc, day, {}

    def get(self, p: Profile) -> dict:
        key = (p.age, p.activity, p.asthma)
        if key not in self.cache:
            self.cache[key] = assess(self.fc, self.day, p)
        return self.cache[key]


def check_day(fc: Forecast, day: str, classes: list[dict], periods: list[dict], school_start: int,
              school_end: int, advisory: bool = False) -> dict:
    """classes: [{id, name, age, asthma}]; periods: [{id, class_id ('all' or a class id), kind, start, minutes}]"""
    by_id = {c["id"]: c for c in classes}
    hours = _Hours(fc, day)
    results, profiles = [], {}

    for per in sorted(periods, key=lambda x: (x["start"], x["id"])):
        cls = by_id.get(per["class_id"])
        if per["class_id"] == "all":
            age = min((c["age"] for c in classes), key=YOUNGEST.index, default="6-10")
            asthma_count = sum(c.get("asthma", 0) for c in classes)
            class_name = "Whole school"
        elif cls:
            age, asthma_count, class_name = cls["age"], cls.get("asthma", 0), cls["name"]
        else:
            continue
        p = Profile(age=age, activity=per["kind"], minutes=per["minutes"])
        w = evaluate(hours.get(p), p, per["start"])
        if w is None:
            continue
        level = 3 if advisory else w.level
        drivers = ["advisory"] if advisory else _drivers(w)

        asthma = None
        if asthma_count and not advisory:
            pa = Profile(age=age, activity=per["kind"], minutes=per["minutes"], asthma=True)
            wa = evaluate(hours.get(pa), pa, per["start"])
            if wa and wa.level > level:
                asthma = {"count": asthma_count, "level": wa.level, "status": STATUS[wa.level],
                          "action": LADDER[per["kind"]][wa.level]}

        pub = w.public()
        results.append({
            "id": per["id"], "class_id": per["class_id"], "class_name": class_name, "kind": per["kind"],
            "kind_label": KIND_LABEL[per["kind"]], "start": per["start"], "end": per["start"] + per["minutes"],
            "label": f"{fmt(per['start'])} to {fmt(per['start'] + per['minutes'])}", "minutes": per["minutes"],
            "level": level, "status": STATUS[level], "drivers": drivers, "action": LADDER[per["kind"]][level],
            "asthma": asthma, "aqi": pub["aqi"], "aqi_cat": pub["aqi_cat"], "dominant": pub["dominant"],
            "wbgt": pub["wbgt"], "budget_pct": pub["budget_pct"],
        })
        profiles[per["id"]] = (p, w)

    swaps = [] if advisory else find_swaps(results, profiles, hours)
    youngest = min((c["age"] for c in classes), key=YOUNGEST.index, default="6-10")
    counts = {s["key"]: sum(1 for r in results if r["status"]["key"] == s["key"]) for s in STATUS}
    return {
        "day": day, "date": fc.target(day).isoformat(), "advisory": advisory,
        "school_hours": {"start": school_start, "end": school_end,
                         "label": f"{fmt(school_start)} to {fmt(school_end)}"},
        "day_aqi": day_aqi(fc, day),
        "hours": [_public_hour(h) for h in hours.get(Profile(age=youngest, activity="recess")).values()],
        "periods": results, "swaps": swaps, "counts": counts,
        "asthma_notes": sum(1 for r in results if r["asthma"]),
    }


def find_swaps(results: list[dict], profiles: dict, hours: _Hours) -> list[dict]:
    """Two classes trade PE slots when that leaves both no worse off and at least one better.

    Both periods keep their place in the timetable grid, so the ground and the PE teacher are
    used exactly as before. Only which class is on the ground changes.
    """
    pool = [r for r in results if r["kind"] in SWAPPABLE and r["class_id"] != "all"]
    options = []
    for i, a in enumerate(pool):
        for b in pool[i + 1:]:
            if a["class_id"] == b["class_id"] or a["start"] == b["start"]:
                continue
            pa, wa = profiles[a["id"]]
            pb, wb = profiles[b["id"]]
            a_there = evaluate(hours.get(pa), pa, b["start"], pa.minutes)
            b_there = evaluate(hours.get(pb), pb, a["start"], pb.minutes)
            if not a_there or not b_there:
                continue
            before = (wa.level, wb.level)
            after = (a_there.level, b_there.level)
            if after[0] > before[0] or after[1] > before[1] or sum(after) >= sum(before):
                continue
            gain = sum(before) - sum(after)
            budget_gain = (wa.budget + wb.budget) - (a_there.budget + b_there.budget)
            options.append((gain, budget_gain, a, b, a_there, b_there))

    used, swaps = set(), []
    for gain, budget_gain, a, b, a_there, b_there in sorted(options, key=lambda o: (-o[0], -o[1])):
        if a["id"] in used or b["id"] in used:
            continue
        used |= {a["id"], b["id"]}
        swaps.append({
            "a": {"id": a["id"], "class_name": a["class_name"], "from": a["label"], "to": b["label"],
                  "before": a["status"], "after": STATUS[a_there.level],
                  "action": LADDER[a["kind"]][a_there.level]},
            "b": {"id": b["id"], "class_name": b["class_name"], "from": b["label"], "to": a["label"],
                  "before": b["status"], "after": STATUS[b_there.level],
                  "action": LADDER[b["kind"]][b_there.level]},
            "gain": gain,
        })
    return swaps


EVENT_DAYS = ("today", "tomorrow", "2")


def find_event_slots(fc: Forecast, age: str, kind: str, minutes: int, earliest: int, latest: int) -> dict:
    """Best window on each of the next three days for a one-off event, best day first."""
    p = Profile(age=age, activity=kind, minutes=minutes)
    days = []
    for day in EVENT_DAYS:
        hours = assess(fc, day, p)
        start = earliest
        if day == "today":
            start = max(start, _round_up(fc.now.hour * 60 + fc.now.minute))
        w = _best(candidates(hours, p, max(DAY_START, start), min(DAY_END, latest)))
        days.append({
            "day": day, "date": fc.target(day).isoformat(),
            "window": (w.public() | {"drivers": _drivers(w), "action": LADDER[kind][w.level]}) if w else None,
            "_rank": (w.level, w.cost) if w else (9, 0),
        })
    ranked = sorted(days, key=lambda d: d["_rank"])
    best = ranked[0]["day"] if ranked[0]["window"] else None
    for d in days:
        d.pop("_rank")
    return {"kind": kind, "kind_label": KIND_LABEL[kind], "minutes": minutes, "days": days, "best": best}
