"""Preventive suggestions that depend on *what* is in the air and on the child.

Generic advice ("wear a mask") is often wrong: a mask does nothing for ozone, and a hard
run in an N95 is a bad idea for a small child. So every suggestion here is triggered by the
dominant pollutant, the heat, the activity or the child's profile, and carries a number
where one helps (millilitres of water, minutes of rest, which hour to open windows).
"""
from __future__ import annotations

from .exposure import Profile
from .heat import THRESHOLDS

# Rough sweat rates (L/h) for children at WBGT 20 °C by effort, scaled by age.
SWEAT_BASE = {"sedentary": 0.15, "light": 0.3, "moderate": 0.5, "high": 0.7}
SWEAT_AGE = {"3-5": 0.55, "6-10": 0.75, "11-15": 1.0}

INDOOR_IDEAS = {
    "play": "hopscotch with tape on the floor, a pillow obstacle course, or dance-offs",
    "cycling": "skipping rope or a stair game in the building",
    "sports": "ball drills in a hall or covered parking, or a yoga session",
    "walk": "a walk through a mall or a covered corridor",
}


def _fmt_hour(h: int) -> str:
    return f"{h % 12 or 12} {'AM' if h < 12 else 'PM'}"


def water_plan(p: Profile, wbgt: float, minutes: int) -> tuple[int, int]:
    """(ml every 20 minutes, total ml) to replace roughly 80% of sweat loss."""
    rate = SWEAT_BASE[p.intensity] * SWEAT_AGE[p.age] * (1 + 0.08 * max(0.0, wbgt - 20.0))
    total = rate * minutes / 60 * 1000 * 0.8
    per20 = total / max(1, minutes / 20)
    return int(round(per20 / 10) * 10), int(round(total / 50) * 50)


def suggestions(p: Profile, pick: dict, hours: list[dict]) -> list[dict]:
    """Ordered most to least important for this outing."""
    out: list[dict] = []
    dom = pick["dominant"]
    aqi = pick["aqi"]

    # What's in the air decides what helps.
    if dom in ("PM2.5", "PM10") and aqi > 100:
        out.append({
            "id": "route", "icon": "route",
            "title": "Pick the park, not the roadside",
            "detail": f"{dom} is the main problem today. It is highest along busy roads and construction, so "
                      "choose a green spot set back from traffic.",
        })
        if aqi > 200:
            out.append({
                "id": "mask", "icon": "mask",
                "title": "Child-size N95 for the walk there",
                "detail": "It filters fine particles on the way. Take it off for running games if breathing "
                          "feels hard. Cloth and surgical masks don't stop PM2.5.",
            })
    elif dom == "O₃" and aqi > 100:
        out.append({
            "id": "ozone", "icon": "sun",
            "title": "Ozone builds in sunshine",
            "detail": "Today's main pollutant is ozone, which forms in afternoon sun. Masks don't filter it, "
                      "but shade and earlier hours do. Indoor ozone is usually far lower.",
        })
    elif dom == "NO₂" and aqi > 100:
        out.append({
            "id": "traffic", "icon": "route",
            "title": "Stay a lane away from traffic",
            "detail": "NO₂ comes from exhausts and drops off quickly with distance. Play in a back lane, "
                      "courtyard or park interior.",
        })

    # Heat: water, rest, sun.
    wbgt = pick["wbgt"]
    per20, total = water_plan(p, wbgt, p.minutes)
    caution = THRESHOLDS[p.intensity][0]
    out.append({
        "id": "water", "icon": "water",
        "title": f"About {per20} ml of water every 20 minutes",
        "detail": f"That's roughly {total} ml for {p.minutes} minutes at {wbgt}°C WBGT. Small sips beat one "
                  "big gulp at the end.",
    })
    if wbgt >= caution - 1:
        out.append({
            "id": "shade", "icon": "shade",
            "title": "5 minutes in the shade every 20",
            "detail": "Heat stress is close to the caution line for this activity. Light cotton clothes help, "
                      "and so does a cold drink before heading out.",
        })
    if pick["uv"] >= 6:
        out.append({"id": "uv", "icon": "sun", "title": "Cap and sunscreen",
                    "detail": f"UV index reaches {pick['uv']:.0f} during this window."})

    if p.asthma:
        out.append({
            "id": "asthma", "icon": "inhaler",
            "title": "Reliever inhaler in the bag",
            "detail": "Warm up slowly, and stop at the first cough, wheeze or tight chest. Follow the plan "
                      "your doctor gave you.",
        })

    if pick["rain"] >= 50:
        out.append({"id": "rain", "icon": "rain", "title": "Rain is likely",
                    "detail": f"{pick['rain']}% chance of rain. Pack a raincoat, and wet ground means slower games."})

    if pick["level"] >= 2:
        out.append({
            "id": "indoor", "icon": "home",
            "title": "Have an indoor plan B",
            "detail": f"Try {INDOOR_IDEAS.get(p.activity, INDOOR_IDEAS['play'])}.",
        })

    # When to air out the house: cleanest vs dirtiest daytime hours from the forecast.
    day = [h for h in hours if 6 <= h["hour"] <= 22]
    if day:
        clean = min(day, key=lambda h: h["wf"])
        dirty = max(day, key=lambda h: h["wf"])
        if dirty["aqi"] > 150 and dirty["wf"] > 1.5 * clean["wf"]:
            out.append({
                "id": "windows", "icon": "window",
                "title": f"Open windows around {_fmt_hour(clean['hour'])}, shut them by {_fmt_hour(max(6, dirty['hour'] - 1))}",
                "detail": f"Outdoor air is cleanest at {_fmt_hour(clean['hour'])} and worst near "
                          f"{_fmt_hour(dirty['hour'])} (AQI {dirty['aqi']}). Time the airing so indoor air stays clean too.",
            })
    return out
