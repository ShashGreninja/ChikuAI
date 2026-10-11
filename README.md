# Chiku.AI 🐦

**Can the kids play outside today?** Chiku.AI turns the hourly air-quality and heat forecast for your neighbourhood into one answer: the safest time for a child to be outdoors.

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

**By phone**: a parent can ask Chiku to call them instead (Twilio). Chiku asks the same questions, answered on the keypad (the city can be spoken), reads out the plan in English or Hindi, and takes a spoken follow-up question.

**For schools**: Indian school timetables are fixed, so periods never move. Set up the classes (with how many children have asthma, never names) and the weekly outdoor timetable once, or paste it from Excel. Every morning:

- each outdoor period gets the right step of an activity ladder (e.g. PE: full games → light drills → yoga in the hall → stretching in class)
- PE swaps between two classes are suggested when they leave both no worse off and one better, so the ground and PE teacher are used exactly as before
- a government advisory switch (GRAP, heatwave orders) moves everything indoors
- a morning bulletin: one-page PDF for the notice board, email, and a WhatsApp message in English or Hindi
- an event day finder ranks the next three days for a match or sports day

**Reports**: parents can download a one-page PDF of their plan; schools get the bulletin.

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
  chiku/
    data.py          Open-Meteo client (CAMS air quality + weather), cached
    aqi.py           CPCB AQI and averaging
    heat.py          wet-bulb, WBGT, heat flags
    exposure.py      child breathing rates, activity profiles
    budget.py        lung budget, heat-driven breathing, forecast uncertainty
    prevention.py    pollutant-aware precautions
    planner.py       parent planner, split sessions
    school.py        fixed-timetable plan: activity ladder, PE swaps, event finder
    report.py        PDF reports and the school bulletin
    voice.py         Twilio phone flow (TwiML), English and Hindi
    phone.py         call requests, limits, webhook signatures
    mailer.py        Amazon SES emails
    agent.py         Strands: intake, narration, Ask Chiku
  main.py            REST API
  tests/             pytest
web/                 Next.js (App Router, TypeScript, CSS modules)
  app/               / (landing), /start, /parents, /school, /how-it-works
  components/        Chiku, Scene, ChikuGuide, PlanDashboard, CallChiku, school/…
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
- **Phone calls → Twilio.** Set `TWILIO_FROM_NUMBER` and `PUBLIC_BASE_URL` in `api/apprunner.yaml`, and keep `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` in SSM Parameter Store, referenced under `secrets`. Webhooks are signature-checked.
- **Report emails → Amazon SES.** Set `SES_SENDER` in `api/apprunner.yaml` to a verified SES identity and allow `ses:SendRawEmail` on the instance role. Without it, "Email the report" opens the user's mail app and downloads the PDF to attach.

## Data & credits

- Forecasts: [Open-Meteo](https://open-meteo.com) (Copernicus CAMS air quality, national weather models), CC BY 4.0
- AQI: Central Pollution Control Board, National Air Quality Index (2014)
- Breathing rates and daily inhalation: US EPA, Exposure Factors Handbook (2011)
- Lung budget reference: WHO Global Air Quality Guidelines (2021)

*Chiku.AI gives guidance, not medical advice.*
