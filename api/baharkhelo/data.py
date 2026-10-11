"""Open-Meteo client: hourly air-quality (CAMS) + weather forecasts and place search.

No API key needed. Responses are cached in-process for 15 minutes so the dashboard,
the school planner and the agent can all hit the same forecast without re-fetching.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

import httpx

AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
WX_URL = "https://api.open-meteo.com/v1/forecast"
GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"

POLLUTANTS = ("pm2_5", "pm10", "nitrogen_dioxide", "ozone", "carbon_monoxide", "sulphur_dioxide")
WEATHER = ("temperature_2m", "relative_humidity_2m", "apparent_temperature", "uv_index",
           "precipitation_probability", "shortwave_radiation")

CACHE_TTL = 900
_cache: dict[str, tuple[float, dict]] = {}


class ForecastError(RuntimeError):
    pass


@dataclass
class Hour:
    time: datetime
    conc: dict[str, float]  # µg/m³ for every pollutant (CO included)
    temp: float
    rh: float
    feels: float
    uv: float
    rain: float  # precipitation probability, %
    sw: float  # shortwave radiation, W/m²


@dataclass
class Forecast:
    lat: float
    lon: float
    timezone: str
    now: datetime  # local wall-clock time at the location
    hours: list[Hour] = field(default_factory=list)

    def target(self, which: str) -> date:
        return self.now.date() + timedelta(days=1 if which == "tomorrow" else 0)

    def indices(self, which: str) -> list[int]:
        """Positions in `hours` that fall on `which` day (today/tomorrow), local time."""
        t = self.target(which)
        return [i for i, h in enumerate(self.hours) if h.time.date() == t]


def _get(url: str, params: dict, ttl: int = CACHE_TTL) -> dict:
    key = url + repr(sorted(params.items()))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    try:
        r = httpx.get(url, params=params, timeout=20)
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise ForecastError(f"Forecast service unavailable: {e}") from e
    data = r.json()
    _cache[key] = (time.time(), data)
    return data


def geocode(query: str, limit: int = 6) -> list[dict]:
    data = _get(GEO_URL, {"name": query, "count": limit, "language": "en", "countryCode": "IN"}, ttl=86400)
    return [{"name": p["name"], "region": p.get("admin1", ""),
             "lat": round(p["latitude"], 4), "lon": round(p["longitude"], 4)}
            for p in data.get("results") or []]


def fetch_forecast(lat: float, lon: float) -> Forecast:
    lat, lon = round(lat, 3), round(lon, 3)
    # past_days=1 gives the history needed for CPCB rolling averages (8 h / 24 h).
    common = {"latitude": lat, "longitude": lon, "timezone": "auto", "past_days": 1, "forecast_days": 3}
    aq = _get(AQ_URL, common | {"hourly": ",".join(POLLUTANTS)})
    wx = _get(WX_URL, common | {"hourly": ",".join(WEATHER)})

    offset = wx.get("utc_offset_seconds", 19800)
    now = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=offset)
    a, w = aq["hourly"], wx["hourly"]
    w_idx = {t: i for i, t in enumerate(w["time"])}

    hours: list[Hour] = []
    for i, t in enumerate(a["time"]):
        j = w_idx.get(t)
        if j is None or a["pm2_5"][i] is None or w["temperature_2m"][j] is None:
            continue
        temp = w["temperature_2m"][j]
        hours.append(Hour(
            time=datetime.fromisoformat(t),
            conc={p: float(a[p][i] or 0.0) for p in POLLUTANTS},
            temp=temp,
            rh=w["relative_humidity_2m"][j] or 50.0,
            feels=w["apparent_temperature"][j] if w["apparent_temperature"][j] is not None else temp,
            uv=w["uv_index"][j] or 0.0,
            rain=w["precipitation_probability"][j] or 0.0,
            sw=w["shortwave_radiation"][j] or 0.0,
        ))
    if not hours:
        raise ForecastError("No forecast data for this location")
    return Forecast(lat=lat, lon=lon, timezone=wx.get("timezone", "Asia/Kolkata"), now=now, hours=hours)
