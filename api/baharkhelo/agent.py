"""Where the language model fits, and where it doesn't.

The LLM never decides anything about air or heat. The planner does that, deterministically.
The model has three narrow jobs, all built on Strands Agents:

  1. intake():  turn a parent's free-text message ("my 7 yr old has mild asthma, wants to
                play cricket after school in Noida") into the planner's inputs.
  2. narrate(): write Chiku's short, personal note from the planner's numbers, in English
                or Hindi. A template is used when no model key is configured.
  3. ask():     answer follow-up questions. Its only source of facts is the planner, which
                it reaches through tools.
"""
from __future__ import annotations

import json
import os
import re
from typing import Literal

from pydantic import BaseModel, Field
from strands import Agent, tool

from . import data, planner
from .exposure import ACTIVITIES, AGES, Profile

STYLE = ("Write like a warm, practical friend. Short sentences. Never use em dashes or en dashes; "
         "use commas or full stops instead. No markdown, no headings, no lists.")


def _model():
    if key := os.getenv("GEMINI_API_KEY"):
        from strands.models.gemini import GeminiModel
        return GeminiModel(client_args={"api_key": key},
                           model_id=os.getenv("GEMINI_MODEL", "gemini-flash-latest"),
                           params={"temperature": 0.4})
    if os.getenv("ANTHROPIC_API_KEY"):
        from strands.models.anthropic import AnthropicModel
        return AnthropicModel(model_id=os.getenv("ANTHROPIC_MODEL", "claude-haiku-5-5"), max_tokens=600)
    return None


def enabled() -> bool:
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))


def _clean(text: str) -> str:
    text = re.sub(r"\s*[—–]\s*", ", ", text)
    return re.sub(r"[*#_`]", "", text).strip()


# ---------------------------------------------------------------- 1. intake

class Intake(BaseModel):
    """What a parent told Chiku. Leave a field empty if they didn't say it."""
    place: str | None = Field(None, description="City or locality in India, as written")
    child_name: str | None = Field(None, description="Child's first name, if given")
    age_group: Literal["3-5", "6-10", "11-15"] | None = Field(None, description="Age bucket of the child")
    asthma: bool | None = Field(None, description="True if asthma, wheezing or a breathing condition is mentioned")
    activity: Literal["play", "cycling", "sports", "walk"] | None = Field(
        None, description="play = park/playground, sports = cricket/football/any team or coached sport")
    minutes: int | None = Field(None, description="Planned duration in minutes")
    day: Literal["today", "tomorrow"] | None = None
    usual_time: str | None = Field(None, description="Usual time they go out, 24h HH:MM")


def intake(text: str) -> dict:
    model = _model()
    if model is None:
        raise RuntimeError("No LLM key configured")
    agent = Agent(model=model, callback_handler=None, system_prompt=(
        "Extract outing details from a parent's message for a child air-quality planner. "
        "The message may be English, Hindi or Hinglish. Map ages to the nearest bucket. "
        "'After school' means about 16:30, 'evening' 17:30, 'morning' 07:00. Do not invent details."))
    result: Intake = agent.structured_output(Intake, text)
    out = result.model_dump()
    if out.get("minutes"):
        out["minutes"] = max(15, min(180, out["minutes"]))
    if out.get("place"):
        matches = data.geocode(out["place"], limit=1)
        out["place_match"] = matches[0] if matches else None
    return out


# ---------------------------------------------------------------- 2. narrate

def _template(plan: dict, name: str | None, lang: str) -> str:
    pick = plan.get("pick")
    who = name or ("आपका बच्चा" if lang == "hi" else "your child")
    if not pick:
        return ("आज बाहर खेलने का सुरक्षित समय निकल चुका है। कल सुबह फिर पूछना।" if lang == "hi"
                else "Today's safe window has passed. Ask me again for tomorrow morning.")
    tip = plan["prevention"][0]["title"] if plan.get("prevention") else ""
    saved = plan.get("saved_vs_usual_pct")
    if lang == "hi":
        line = f"{who} के लिए सबसे अच्छा समय {pick['label']} है। हवा AQI {pick['aqi']} ({pick['dominant']})।"
        if saved and saved > 0:
            line += f" रोज़ के समय से {saved}% कम प्रदूषण साँस में जाएगा।"
        return line
    line = f"The best time for {who} is {pick['label']}. Air is AQI {pick['aqi']}, mostly {pick['dominant']}."
    if saved and saved > 0:
        line += f" That's {saved}% less pollution than the usual time."
    if tip:
        line += f" One thing to remember: {tip[0].lower() + tip[1:]}."
    return line


def narrate(plan: dict, name: str | None, lang: Literal["en", "hi"] = "en") -> dict:
    model = _model()
    if model is None:
        return {"text": _template(plan, name, lang), "source": "template"}
    facts = {
        "child": name or None, "age": plan["profile"]["age"], "asthma": plan["profile"]["asthma"],
        "activity": plan["profile"]["activity"], "minutes": plan["profile"]["minutes"],
        "day": plan["day"], "pick": plan["pick"], "usual": plan["usual"], "split": plan["split"],
        "saved_vs_usual_pct": plan["saved_vs_usual_pct"], "day_peak_aqi": plan["day_aqi"],
        "top_suggestions": [s["title"] for s in plan["prevention"][:3]],
    }
    agent = Agent(model=model, callback_handler=None, system_prompt=(
        "You are Chiku, a friendly house sparrow helping an Indian parent. Using ONLY the JSON facts, "
        "write 2 or 3 sentences (max 60 words): when to go out and why in plain words (name the main "
        "pollutant or heat), how much of the lung budget that saves if the number is positive, and the "
        "single most useful precaution. Address the child by name if given. " + STYLE +
        (" Reply in simple Hindi (Devanagari)." if lang == "hi" else " Reply in English.")))
    try:
        text = _clean(str(agent(json.dumps(facts, ensure_ascii=False))))
        return {"text": text, "source": "ai"}
    except Exception:
        return {"text": _template(plan, name, lang), "source": "template"}


# ---------------------------------------------------------------- 3. ask

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
    keep = ("pick", "split", "tomorrow_hint", "day_aqi", "saved_vs_usual_pct")
    return json.dumps({k: plan[k] for k in keep}
                      | {"suggestions": [s["title"] for s in plan["prevention"]], "hours": hours})


ASK_PROMPT = """You are Chiku, a cheerful house sparrow who helps Indian parents and teachers
decide when children can safely play outside.
Always call a tool before stating any time, AQI or heat figure; never guess.
Lead with the answer (a time window, or "best to stay indoors"), then one line on why,
then at most one practical tip. Under 80 words. Reply in the user's language
(Hindi, Hinglish or English). You are not a doctor; for symptoms, say to see one.
If the user names a different place, look it up with find_place first. """ + STYLE


def ask(question: str, context: dict) -> str:
    model = _model()
    if model is None:
        raise RuntimeError("No LLM key configured")
    agent = Agent(model=model, system_prompt=ASK_PROMPT,
                  tools=[find_place, plan_outdoor_time], callback_handler=None)
    ctx = ", ".join(f"{k}={v}" for k, v in context.items() if v not in (None, ""))
    return _clean(str(agent(f"[Context: {ctx}]\n{question}")))
