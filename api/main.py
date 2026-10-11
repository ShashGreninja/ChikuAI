"""Bahar Khelo API.  Run:  python main.py   ->  http://127.0.0.1:8000/docs

The Next.js app in ../web proxies /api/* to this server.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

HERE = Path(__file__).parent
load_dotenv(HERE / ".env")
load_dotenv(HERE.parent / ".env")

import uvicorn  # noqa: E402
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from baharkhelo import agent, data, mailer, phone, planner, report, voice  # noqa: E402
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
    return {"ok": True, "agent": agent.enabled(), "email": mailer.enabled(), "calls": phone.enabled()}


def _pdf(content: bytes, filename: str) -> Response:
    return Response(content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/places")
def places(q: str = Query(min_length=2, max_length=80)):
    try:
        return data.geocode(q)
    except data.ForecastError as e:
        raise HTTPException(503, str(e)) from e


@app.get("/api/now")
def now(lat: float = Query(ge=6, le=38), lon: float = Query(ge=68, le=98)):
    return planner.now_snapshot(_forecast(lat, lon))


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


class ParentReportRequest(NarrateRequest):
    place: str = Field(max_length=80)
    note: str | None = Field(None, max_length=800)


@app.post("/api/report/parent")
def parent_report(req: ParentReportRequest):
    plan = req.run()
    name = (req.name or "").strip() or None
    pdf = report.parent_pdf(plan, req.place, name, req.note)
    return _pdf(pdf, f"bahar-khelo-{report.slug(name or 'plan')}-{plan['date']}.pdf")


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


class SchoolReportRequest(SchoolRequest):
    place: str = Field(max_length=80)
    school_name: str = Field("our school", max_length=60)
    circular: str = Field("", max_length=3000)


def _school_pdf(req: SchoolReportRequest) -> tuple[bytes, str, dict]:
    plan = school(req)
    pdf = report.school_pdf(plan, req.place, req.school_name, req.circular)
    return pdf, f"bahar-khelo-{report.slug(req.school_name)}-{plan['date']}.pdf", plan


@app.post("/api/report/school")
def school_report(req: SchoolReportRequest):
    pdf, filename, _ = _school_pdf(req)
    return _pdf(pdf, filename)


EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SchoolEmailRequest(SchoolReportRequest):
    to: list[str] = Field(min_length=1, max_length=mailer.MAX_RECIPIENTS)


@app.post("/api/report/school/email")
def school_email(req: SchoolEmailRequest, request: Request):
    import re

    to = [t.strip() for t in req.to if t.strip()]
    if not to or any(not re.match(EMAIL_RE, t) for t in to):
        raise HTTPException(422, "Check the email addresses.")
    if not mailer.enabled():
        raise HTTPException(503, "Email isn't set up on this server.")
    if not mailer.allow(request.client.host if request.client else "unknown"):
        raise HTTPException(429, "That's a lot of emails. Try again in an hour.")
    pdf, filename, plan = _school_pdf(req)
    try:
        mailer.send_report(
            to, f"Outdoor timetable for {req.school_name}, {report.pretty_date(plan['date'])}",
            f"{req.circular}\n\nThe full report is attached.\n\nSent with Bahar Khelo.", pdf, filename)
    except mailer.MailError as e:
        log.warning("email failed: %s", e)
        raise HTTPException(502, "The email couldn't be sent. Download the report and attach it instead.") from e
    return {"sent": len(to)}


class CallRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    lang: Literal["en", "hi"] = "en"
    consent: bool


@app.post("/api/call")
def request_call(req: CallRequest, request: Request):
    if not phone.enabled():
        raise HTTPException(503, "Calls aren't available right now.")
    if not req.consent:
        raise HTTPException(422, "Please tick the box so Chiku can call you.")
    number = phone.normalise(req.phone)
    if not number:
        raise HTTPException(422, "Enter a 10-digit Indian mobile number.")
    if reason := phone.check_limits(number, request.client.host if request.client else "unknown"):
        raise HTTPException(429, reason)
    try:
        phone.place_call(number, req.lang)
    except phone.CallError as e:
        log.warning("call to %s failed: %s", phone.masked(number), e)
        raise HTTPException(502, "Chiku couldn't place the call. Please try again in a minute.") from e
    return {"status": "calling", "to": phone.masked(number)}


@app.post("/api/voice/{step}")
async def voice_webhook(step: str, request: Request):
    """Twilio webhooks for the phone flow. Every hit is signature-checked when Twilio is set up."""
    from urllib.parse import parse_qsl

    params = dict(parse_qsl((await request.body()).decode()))
    query = request.url.query
    if phone.enabled():
        url = f"{phone.base_url()}{request.url.path}{'?' + query if query else ''}"
        if not phone.valid_signature(url, params, request.headers.get("X-Twilio-Signature", "")):
            raise HTTPException(403, "Bad signature")
    elif not os.getenv("VOICE_DEV"):  # unsigned webhooks only for local testing
        raise HTTPException(404)
    state = dict(parse_qsl(query))
    twiml = voice.handle(step, state, params, phone.base_url())
    return Response(twiml, media_type="application/xml")


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
    uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8000")))
