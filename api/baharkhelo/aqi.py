"""India National Air Quality Index (CPCB, 2014).

Two views of the same forecast:
  * `official_conc`: the CPCB way, with 24 h means for PM/NO₂/SO₂ and 8 h means for O₃/CO.
    Used for the day's headline AQI.
  * `planning_conc`: hour by hour, for deciding when to go out. PM, NO₂ and SO₂ use the
    hourly value (what a child actually breathes in that hour); O₃ and CO keep CPCB's
    8-hour rolling mean.
"""
from __future__ import annotations

from collections.abc import Sequence

from .data import Hour

AQI_POINTS = (0, 50, 100, 200, 300, 400, 500)

# Concentration breakpoints (µg/m³; CO in mg/m³) for AQI_POINTS.
BREAKPOINTS: dict[str, tuple[float, ...]] = {
    "pm2_5": (0, 30, 60, 90, 120, 250, 380),
    "pm10": (0, 50, 100, 250, 350, 430, 510),
    "nitrogen_dioxide": (0, 40, 80, 180, 280, 400, 520),
    "ozone": (0, 50, 100, 168, 208, 748, 1000),
    "carbon_monoxide": (0, 1.0, 2.0, 10, 17, 34, 50),
    "sulphur_dioxide": (0, 40, 80, 380, 800, 1600, 2100),
}

# CPCB averaging period (hours) for each pollutant.
AVERAGING = {"pm2_5": 24, "pm10": 24, "nitrogen_dioxide": 24, "sulphur_dioxide": 24,
             "ozone": 8, "carbon_monoxide": 8}

LABEL = {"pm2_5": "PM2.5", "pm10": "PM10", "nitrogen_dioxide": "NO₂", "ozone": "O₃",
         "carbon_monoxide": "CO", "sulphur_dioxide": "SO₂"}

CATEGORIES = ((50, "Good"), (100, "Satisfactory"), (200, "Moderate"),
              (300, "Poor"), (400, "Very Poor"), (500, "Severe"))


def subindex(pollutant: str, conc: float) -> float:
    if pollutant == "carbon_monoxide":
        conc = conc / 1000.0  # µg/m³ -> mg/m³
    bp = BREAKPOINTS[pollutant]
    if conc <= 0:
        return 0.0
    if conc >= bp[-1]:
        return 500.0
    for i in range(len(bp) - 1):
        if conc <= bp[i + 1]:
            lo, hi = bp[i], bp[i + 1]
            return AQI_POINTS[i] + (conc - lo) * (AQI_POINTS[i + 1] - AQI_POINTS[i]) / (hi - lo)
    return 500.0


def aqi(conc: dict[str, float]) -> tuple[int, str, dict[str, int]]:
    """AQI = max sub-index. Returns (value, dominant pollutant key, sub-indices)."""
    subs = {p: subindex(p, c) for p, c in conc.items() if p in BREAKPOINTS}
    dom = max(subs, key=subs.__getitem__)
    return round(subs[dom]), dom, {p: round(v) for p, v in subs.items()}


def category(value: float) -> str:
    return next((name for cap, name in CATEGORIES if value <= cap), "Severe")


def _rolling(hours: Sequence[Hour], i: int, pollutant: str, window: int) -> float:
    lo = max(0, i - window + 1)
    vals = [h.conc[pollutant] for h in hours[lo:i + 1]]
    return sum(vals) / len(vals)


def planning_conc(hours: Sequence[Hour], i: int) -> dict[str, float]:
    out = dict(hours[i].conc)
    for p in ("ozone", "carbon_monoxide"):
        out[p] = _rolling(hours, i, p, AVERAGING[p])
    return out


def official_conc(hours: Sequence[Hour], i: int) -> dict[str, float]:
    return {p: _rolling(hours, i, p, AVERAGING[p]) for p in BREAKPOINTS}
