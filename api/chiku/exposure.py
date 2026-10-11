"""How much air a child breathes, and therefore how much pollution reaches their lungs."""
from __future__ import annotations

from dataclasses import dataclass

# Short-term inhalation rate (m³/min) by age group and activity level, mean body weight (kg).
# US EPA Exposure Factors Handbook (2011), Table 6-2 and Table 8-1.
INHALATION = {
    "3-5": {"bw": 18.6, "sedentary": 0.0048, "light": 0.011, "moderate": 0.021, "high": 0.037},
    "6-10": {"bw": 31.8, "sedentary": 0.0045, "light": 0.011, "moderate": 0.022, "high": 0.042},
    "11-15": {"bw": 56.8, "sedentary": 0.0050, "light": 0.013, "moderate": 0.025, "high": 0.049},
    "adult": {"bw": 80.0, "sedentary": 0.0042, "light": 0.012, "moderate": 0.026, "high": 0.050},
}

ACTIVITIES = {
    "play": ("Park play", "moderate"),
    "cycling": ("Cycling", "moderate"),
    "sports": ("Sports practice", "high"),
    "walk": ("Walk", "light"),
    "pe": ("PE class", "high"),
    "assembly": ("Assembly", "light"),
    "recess": ("Recess", "moderate"),
}

AGES = ("3-5", "6-10", "11-15")


@dataclass(frozen=True)
class Profile:
    age: str = "6-10"
    activity: str = "play"
    minutes: int = 60
    asthma: bool = False

    def __post_init__(self):
        if self.age not in INHALATION:
            raise ValueError(f"unknown age group {self.age!r}")
        if self.activity not in ACTIVITIES:
            raise ValueError(f"unknown activity {self.activity!r}")
        if not 10 <= self.minutes <= 240:
            raise ValueError("minutes must be between 10 and 240")

    @property
    def label(self) -> str:
        return ACTIVITIES[self.activity][0]

    @property
    def intensity(self) -> str:
        return ACTIVITIES[self.activity][1]

    @property
    def vent(self) -> float:
        """m³ of air per minute."""
        return INHALATION[self.age][self.intensity]

    @property
    def per_kg_vs_adult(self) -> float:
        """How much more air per kg of body weight than an adult doing the same thing."""
        child = self.vent / INHALATION[self.age]["bw"]
        adult = INHALATION["adult"][self.intensity] / INHALATION["adult"]["bw"]
        return child / adult


def segments(start_min: int, minutes: int):
    """Split an outing into (hour, minutes-in-that-hour) pieces."""
    t, end = start_min, start_min + minutes
    while t < end:
        hour = t // 60
        step = min(end, (hour + 1) * 60) - t
        yield hour, step
        t += step
