"""Bahar Khelo API.  Run:  python main.py   ->  http://127.0.0.1:8000/docs

The Next.js app in ../web proxies /api/* to this server.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

HERE = Path(__file__).parent
load_dotenv(HERE / ".env")
load_dotenv(HERE.parent / ".env")

import uvicorn  # noqa: E402
from fastapi import Depends, FastAPI, HTTPException, Query  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from baharkhelo import agent, data, planner  # noqa: E402
from baharkhelo.exposure import Profile  # noqa: E402

log = logging.getLogger("baharkhelo")
app = FastAPI(title="Bahar Khelo API", version="2.0")

Day = Literal["today", "tomorrow"]
Age = Literal["3-5", "6-10", "11-15"]


def _forecast(lat: float, lon: float) -> data.Forecast:
    try:
        return data.fetch_forecast(lat, lon)
    except data.ForecastError as e:
        raise HTTPException(503, str(e)) from e


@app.get("/api/health")
def health():
    return {"ok": True, "agent": agent.enabled()}


@app.get("/api/places")
def places(q: str = Query(min_length=2, max_length=80)):
    try:
        return data.geocode(q)
    except data.ForecastError as e:
        raise HTTPException(503, str(e)) from e


class PlanQuery(BaseModel):
    lat: float = Field(ge=6, le=38)
    lon: float = Field(ge=68, le=98)
    age: Age = "6-10"
    activity: Literal["play", "cycling", "sports", "walk"] = "play"
    minutes: int = Field(60, ge=10, le=240)
    asthma: bool = False
    day: Day = "today"
    usual: int = Field(17 * 60, ge=6 * 60, le=19 * 60)

    def run(self) -> dict:
        p = Profile(age=self.age, activity=self.activity, minutes=self.minutes, asthma=self.asthma)
        return planner.plan_parent(_forecast(self.lat, self.lon), p, self.day, self.usual)


@app.get("/api/plan")
def plan(q: PlanQuery = Depends()):
    return q.run()


class NarrateRequest(PlanQuery):
    name: str | None = Field(None, max_length=30)
    lang: Literal["en", "hi"] = "en"


@app.post("/api/narrate")
def narrate(req: NarrateRequest):
    return agent.narrate(req.run(), (req.name or "").strip() or None, req.lang)


class IntakeRequest(BaseModel):
    text: str = Field(min_length=3, max_length=500)


@app.post("/api/intake")
def intake(req: IntakeRequest):
    if not agent.enabled():
        raise HTTPException(503, "Free-text answers need GEMINI_API_KEY in api/.env")
    try:
        return agent.intake(req.text)
    except Exception as e:
        log.exception("intake failed")
        raise HTTPException(502, "Chiku couldn't read that. Try the buttons instead.") from e


class Slot(BaseModel):
    name: str = Field(max_length=40)
    activity: Literal["pe", "recess", "assembly", "sports", "walk"]
    start: int = Field(ge=5 * 60, le=19 * 60)
    minutes: int = Field(ge=10, le=120)
    movable: bool = True


class SchoolRequest(BaseModel):
    lat: float = Field(ge=6, le=38)
    lon: float = Field(ge=68, le=98)
    students: int = Field(500, ge=1, le=20000)
    age: Age = "6-10"
    day: Day = "tomorrow"
    school_start: int = Field(8 * 60, ge=5 * 60, le=12 * 60)
    school_end: int = Field(14 * 60, ge=10 * 60, le=19 * 60)
    slots: list[Slot] = Field(min_length=1, max_length=8)


@app.post("/api/school")
def school(req: SchoolRequest):
    try:
        return planner.plan_school(_forecast(req.lat, req.lon), [s.model_dump() for s in req.slots],
                                   req.students, req.day, req.age, req.school_start, req.school_end)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=500)
    context: dict[str, str | float | bool | None] = {}


@app.post("/api/ask")
def ask(req: AskRequest):
    if not agent.enabled():
        raise HTTPException(503, "Chiku's chat needs GEMINI_API_KEY in api/.env")
    try:
        return {"answer": agent.ask(req.question, req.context)}
    except Exception as e:
        log.exception("agent failed")
        raise HTTPException(502, "Chiku couldn't answer right now. Try again in a moment.") from e


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
