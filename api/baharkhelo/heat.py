"""Heat stress for children: wet-bulb, outdoor WBGT and activity-specific flags."""
from __future__ import annotations

import math

# WBGT (°C) at which play moves to caution / limit / stop, by activity intensity.
# Adapted from youth-sport heat guidance (AAP 2011 policy statement; ACSM 2021 roundtable):
# the harder the activity, the earlier the flag.
THRESHOLDS = {
    "sedentary": (28.0, 31.0, 33.0),
    "light": (27.0, 30.0, 32.0),
    "moderate": (25.0, 28.0, 31.0),
    "high": (23.0, 26.0, 29.0),
}


def wet_bulb(t: float, rh: float) -> float:
    """Stull (2011) wet-bulb temperature from air temperature (°C) and RH (%)."""
    return (t * math.atan(0.151977 * math.sqrt(rh + 8.313659))
            + math.atan(t + rh) - math.atan(rh - 1.676331)
            + 0.00391838 * rh ** 1.5 * math.atan(0.023101 * rh) - 4.686035)


def globe_temp(t: float, sw: float) -> float:
    """Black-globe temperature estimate: air temperature plus a solar load term."""
    return t + 0.0125 * max(0.0, sw)


def wbgt(t: float, rh: float, sw: float) -> float:
    """Outdoor WBGT = 0.7·Tw + 0.2·Tg + 0.1·Ta."""
    return 0.7 * wet_bulb(t, rh) + 0.2 * globe_temp(t, sw) + 0.1 * t


def level(w: float, intensity: str, age: str) -> int:
    """0 go · 1 caution · 2 limit · 3 stop."""
    caps = THRESHOLDS[intensity]
    if age == "3-5":  # small children gain heat faster and sweat less
        caps = tuple(c - 1.0 for c in caps)
    return next((i for i, c in enumerate(caps) if w < c), 3)


def strain(w: float, intensity: str) -> float:
    """Continuous heat penalty for ranking: 0 well below the caution line, rising above it."""
    return max(0.0, w - (THRESHOLDS[intensity][0] - 3.0)) * 0.5
