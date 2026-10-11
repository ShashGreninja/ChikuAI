"""'Ask Chiku': a Strands Agents assistant that answers in plain language.

The agent never estimates air or heat on its own. Its tools call the same planner the
dashboard uses, so a chat answer and the on-screen plan always agree.
"""
from __future__ import annotations

import json
import os

from strands import Agent, tool

from . import data, planner
from .exposure import AGES, ACTIVITIES, Profile

SYSTEM_PROMPT = """You are Chiku, a cheerful house sparrow who helps Indian parents and teachers
decide when children can safely play outside.

Rules:
- Always call a tool before stating any time, AQI, temperature or heat figure. Never guess.
- Lead with the answer: a time window, or "best to stay indoors". Then one line on why
  (India AQI value + category, heat), then at most one practical tip.
- Under 80 words. Warm, simple words a busy parent understands. No markdown headings or tables.
- Reply in the language the user wrote in (Hindi, Hinglish or English).
- You are not a doctor. If a child has symptoms, tell them to see one.
- If the user names a different place, look it up with find_place first."""


@tool
def find_place(name: str) -> str:
    """Look up an Indian city or locality and return its coordinates.

    Args:
        name: City, town or locality name, e.g. "Gurugram" or "Salt Lake, Kolkata".
    """
    return json.dumps(data.geocode(name, limit=3))


@tool
def plan_outdoor_time(lat: float, lon: float, age: str = "6-10", activity: str = "play",
                      minutes: int = 60, asthma: bool = False, day: str = "today") -> str:
    """Find the safest time window for a child to be outdoors, with AQI and heat for each hour.

    Args:
        lat: Latitude of the place.
        lon: Longitude of the place.
        age: Age group: "3-5", "6-10" or "11-15".
        activity: One of "play", "cycling", "sports", "walk".
        minutes: How long the child will be outside (10-240).
        asthma: True if the child has asthma or another breathing condition.
        day: "today" or "tomorrow".
    """
    p = Profile(age=age if age in AGES else "6-10",
                activity=activity if activity in ACTIVITIES else "play",
                minutes=max(10, min(240, int(minutes))), asthma=bool(asthma))
    plan = planner.plan_parent(data.fetch_forecast(lat, lon), p, "tomorrow" if day == "tomorrow" else "today")
    hours = [{k: h[k] for k in ("hour", "aqi", "aqi_cat", "wbgt", "status")}
             for h in plan["hours"] if 6 <= h["hour"] < 20]
    return json.dumps({k: plan[k] for k in ("pick", "tomorrow_hint", "day_aqi", "tips", "profile")}
                      | {"hours": hours})


def _model():
    if key := os.getenv("GEMINI_API_KEY"):
        from strands.models.gemini import GeminiModel
        return GeminiModel(client_args={"api_key": key},
                           model_id=os.getenv("GEMINI_MODEL", "gemini-flash-latest"),
                           params={"temperature": 0.3})
    if os.getenv("ANTHROPIC_API_KEY"):
        from strands.models.anthropic import AnthropicModel
        return AnthropicModel(model_id=os.getenv("ANTHROPIC_MODEL", "claude-haiku-5-5"), max_tokens=600)
    return None


def enabled() -> bool:
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))


def ask(question: str, context: dict) -> str:
    model = _model()
    if model is None:
        raise RuntimeError("No LLM key configured")
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT,
                  tools=[find_place, plan_outdoor_time], callback_handler=None)
    ctx = ", ".join(f"{k}={v}" for k, v in context.items() if v not in (None, ""))
    return str(agent(f"[Context: {ctx}]\n{question}")).strip()
