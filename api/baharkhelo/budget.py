"""Lung budget: how much of a child's healthy daily pollution allowance an outing uses.

The allowance is what the child would inhale in a full day breathing air that sits exactly
at the WHO 2021 guideline. An outing "spends" part of it:

    spend(hour) = (C / WHO guideline) × breathing rate × heat factor × minutes
    budget %    = Σ spend / (daily inhalation volume) × 100

Two couplings make it more than a lookup table:
  * heat raises breathing rate (thermal hyperpnoea), so hot hours cost more air;
  * forecast uncertainty grows with lead time and with how jumpy the forecast is around an
    hour, and windows are ranked on a risk-adjusted spend, so a steady clean hour beats a
    clean-looking hour wedged between two spikes.
"""
from __future__ import annotations

# WHO global air quality guidelines (2021), µg/m³. 24 h means except O₃ (8 h peak season).
WHO_AQG = {"pm2_5": 15, "pm10": 45, "nitrogen_dioxide": 25, "sulphur_dioxide": 40,
           "ozone": 100, "carbon_monoxide": 4000}

# Mean daily inhalation volume, m³/day. US EPA Exposure Factors Handbook (2011), Table 6-1.
DAILY_INHALATION = {"3-5": 10.1, "6-10": 12.0, "11-15": 15.2, "adult": 15.7}

HEAT_VENT_SLOPE = 0.03  # +3% breathing per °C of WBGT above 22 °C
HEAT_VENT_CAP = 1.35


def guideline_factor(conc: dict[str, float]) -> tuple[float, str]:
    """Concentration as a multiple of the WHO guideline, for the worst pollutant."""
    ratios = {p: conc[p] / WHO_AQG[p] for p in WHO_AQG}
    dom = max(ratios, key=ratios.__getitem__)
    return ratios[dom], dom


def heat_vent_factor(wbgt: float) -> float:
    return min(HEAT_VENT_CAP, 1.0 + HEAT_VENT_SLOPE * max(0.0, wbgt - 22.0))


def allowance_litres(age: str) -> float:
    return DAILY_INHALATION[age] * 1000.0


def uncertainty(lead_hours: float, prev: float | None, cur: float, nxt: float | None) -> float:
    """Relative uncertainty of an hourly air forecast.

    Base 8% grows ~0.3% per hour of lead time (CAMS skill drops with lead), plus local
    volatility: how sharply the forecast changes around this hour.
    """
    neighbours = [x for x in (prev, nxt) if x is not None]
    vol = 0.0
    if neighbours and cur > 0:
        vol = min(0.5, max(abs(cur - n) for n in neighbours) / (2 * cur))
    return 0.08 + 0.003 * max(0.0, lead_hours) + vol


def confidence_label(u: float) -> str:
    return "high" if u < 0.18 else "medium" if u < 0.3 else "low"
