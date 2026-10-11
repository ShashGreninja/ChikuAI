# Bahar Khelo? 🐦

**Can the kids play outside today?** Bahar Khelo turns the hourly air-quality and heat forecast for your neighbourhood into one answer: the safest time for a child to be outdoors.

Built for Environmental Hacks (Bharat Builds Tour), **Air** track.

## The problem

Every winter in North India, and on many summer afternoons everywhere, parents and schools make the same call with no real information: *is it okay to send them out?* The AQI number on a phone is a daily average for an adult standing still. A child running around a park breathes about twice as much air per kg of body weight. And the same day can swing from "Satisfactory" at 7 AM to "Poor" at 5 PM.

## What it does

**For parents**: Chiku, a house sparrow, greets you on an illustrated park scene and asks one question at a time: where, the child's name and age, asthma, the activity, how long, today or tomorrow, and their usual time. You can also type it all in one line. Then Chiku gives:

- the best window, as one of four verdicts: *Go play / Go easy / Keep it short / Stay indoors*, while the sky in the scene turns clear, hazy, smoggy or hot to match
- a short personal note in English or Hindi
- a checklist of precautions that depend on what's actually in the air (no mask advice on ozone days, for example), with water in millilitres and the best time to air out the house
- an option to split the outing into two cleaner sessions when that saves a real share of the lung budget
- the full picture: an hour-by-hour strip, lung budget rings for the pick vs. the usual and worst times, forecast confidence, and a shareable message

**For schools**: enter the outdoor periods from the timetable. The planner moves what can move, keeps fixed periods in place (taking them indoors if needed), never double-books a slot, and drafts the circular for parents.

**Reports**: parents and schools can download a one-page PDF of their plan. Schools can also email it, with the PDF attached, straight from the page.

## The decision model

1. **Guardrails.** Each hour gets an air flag (CPCB National AQI bands, one band stricter with asthma) and a heat flag (outdoor WBGT against youth-sport lines by effort level, stricter for under-6s). A lower flag always wins.
2. **Lung budget.** Among equally flagged windows, pick the one that spends the least of the child's daily allowance, defined as what they would inhale in a full day at the WHO 2021 guideline:
   `spend = Σ (C ÷ WHO guideline) × L/min × heat factor × minutes`, divided by the daily inhalation volume. Breathing rates by age and effort are from the US EPA Exposure Factors Handbook (2011).
3. **Heat-driven breathing.** Breathing rises about 3% per °C of WBGT above 22°C, so hot hours cost more air.
4. **Uncertainty.** Forecast error grows with lead time and local volatility. Ranking uses a risk-adjusted spend, so a steady clean hour beats a clean-looking hour between two spikes.
5. **Split sessions.** For outings of 60 minutes or more, two halves at least two hours apart are offered when they save 20% or more.
6. **Prevention.** Precautions are triggered by the dominant pollutant, heat, UV, rain, asthma and the forecast's cleanest and dirtiest hours.

Full write-up, with known limitations, is on the in-app **How it works** page.

## Where AI is used

The planner decides everything about air, heat and timing. The LLM (via **Strands Agents**, AWS open source) has three narrow jobs:

- **Intake:** turns a free-text message into the planner's inputs with structured output
- **Narration:** writes Chiku's note from the planner's numbers, in English or Hindi
- **Ask Chiku:** answers follow-up questions by calling the planner as a tool

Without an API key, notes fall back to a template and everything else works the same.

## Project layout

```
api/                 Python, FastAPI
  baharkhelo/
    data.py          Open-Meteo client (CAMS air quality + weather), cached
    aqi.py           CPCB AQI and averaging
    heat.py          wet-bulb, WBGT, heat flags
    exposure.py      child breathing rates, activity profiles
    budget.py        lung budget, heat-driven breathing, forecast uncertainty
    prevention.py    pollutant-aware precautions
    planner.py       parent + school planners, split sessions
    agent.py         Strands: intake, narration, Ask Chiku
  main.py            REST API
  tests/             pytest
web/                 Next.js (App Router, TypeScript, CSS modules)
  app/               /, /school, /how-it-works
  components/        Chiku, Scene, ChikuGuide, PlanDashboard, DayStrip, BudgetRings…
  lib/               API client, types, share messages (EN/HI)
```

## Run it locally

Needs Python 3.11+ and Node 20+.

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r api\requirements.txt
npm --prefix web install
.\dev.ps1
```

Open http://localhost:3000. The planner needs no keys. To turn on the AI features (free-text answers, Chiku's personal note, Ask Chiku), copy `api/.env.example` to `api/.env` and add a free Gemini key from https://aistudio.google.com/apikey.

Tests:

```powershell
cd api; ..\.venv\Scripts\python -m pytest
```

## Deploy on AWS

- **API → AWS App Runner** from this repo, source directory `api`, using `api/apprunner.yaml`. The AI features use Amazon Bedrock (Nova 2 Lite) through the service's instance role, which needs `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`.
- **Web → AWS Amplify Hosting**, monorepo root `web`, with the environment variable `API_URL` set to the App Runner URL. Next.js forwards `/api/*` there.
- **Report emails → Amazon SES.** Set `SES_SENDER` in `api/apprunner.yaml` to a verified SES identity and allow `ses:SendRawEmail` on the instance role. Without it, "Email the report" opens the user's mail app and downloads the PDF to attach.

## Data & credits

- Forecasts: [Open-Meteo](https://open-meteo.com) (Copernicus CAMS air quality, national weather models), CC BY 4.0
- AQI: Central Pollution Control Board, National Air Quality Index (2014)
- Breathing rates and daily inhalation: US EPA, Exposure Factors Handbook (2011)
- Lung budget reference: WHO Global Air Quality Guidelines (2021)

*Bahar Khelo gives guidance, not medical advice.*
