# Bahar Khelo? 🐦

**Can the kids play outside today?** Bahar Khelo turns the hourly air-quality and heat forecast for your neighbourhood into one answer: the safest time for a child to be outdoors.

Built for Environmental Hacks (Bharat Builds Tour), **Air** track.

## The problem

Every winter in North India, and on many summer afternoons everywhere, parents and schools make the same call with no real information: *is it okay to send them out?* The AQI number on a phone is a daily average for an adult standing still. A child running around a park breathes about twice as much air per kg of body weight. And the same day can swing from "Satisfactory" at 7 AM to "Poor" at 5 PM.

## What it does

**For parents**: pick a place, the child's age, asthma (yes/no) and the activity. Chiku, the house sparrow, tells you:

- the best window today or tomorrow, as one of four verdicts: *Go play / Go easy / Keep it short / Stay indoors*
- an hour-by-hour strip showing air and heat separately, so you can see *why*
- how much less pollution reaches their lungs compared with your usual time
- a message you can forward in English or Hindi

**For schools**: enter the outdoor periods from the timetable (assembly, PE, recess, practice). The planner moves what can move, keeps fixed periods in place (moving them indoors if needed), never double-books a slot, and drafts the circular for parents.

**Ask Chiku**: a chat agent (Strands Agents) for questions like *"Is 5 PM okay for cricket?"* or *"कल सुबह साइकिल चलाना ठीक रहेगा?"*. It answers by calling the same planner, so it can't make numbers up.

## How it decides

| Piece | Method |
|---|---|
| Air | India National AQI from CPCB breakpoints. The day's headline uses CPCB averaging (24 h PM/NO₂/SO₂, 8 h O₃/CO). The hourly plan uses that hour's PM/NO₂/SO₂. |
| Dose | `Σ (concentration ÷ NAAQS limit) × breathing rate × minutes`. Linear in concentration, so different times compare fairly. |
| Breathing | US EPA Exposure Factors Handbook 2011 (Table 6-2), by age group and effort |
| Heat | Outdoor WBGT = 0.7·Tw + 0.2·Tg + 0.1·Ta, with Stull wet-bulb and a solar globe estimate. Flags adapted from AAP/ACSM youth-sport guidance, stricter for harder play and for under-6s. |
| Search | Every 30-minute start in children's outdoor hours. Pick the lowest flag, then the lowest dose plus heat strain. |

Full write-up, with known limitations, is on the in-app **How it works** page.

## Built on AWS open source

- **Strands Agents SDK**: the Ask Chiku agent and its tools (`api/baharkhelo/agent.py`)

## Project layout

```
api/                 Python, FastAPI
  baharkhelo/
    data.py          Open-Meteo client (CAMS air quality + weather), cached
    aqi.py           CPCB AQI, NAAQS air factor
    heat.py          wet-bulb, WBGT, heat flags
    exposure.py      child breathing rates, activity profiles
    planner.py       parent + school planners
    agent.py         Strands agent ("Ask Chiku")
  main.py            REST API
  tests/             pytest
web/                 Next.js (App Router, TypeScript, CSS modules)
  app/               /, /school, /how-it-works
  components/        Chiku mascot, DayStrip, ExposureBars, planners…
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

Open http://localhost:3000. The planner needs no keys. To turn on the Ask Chiku chat, copy `api/.env.example` to `api/.env` and add a free Gemini key from https://aistudio.google.com/apikey.

Tests:

```powershell
cd api; ..\.venv\Scripts\python -m pytest
```

## Data & credits

- Forecasts: [Open-Meteo](https://open-meteo.com) (Copernicus CAMS air quality, national weather models), CC BY 4.0
- AQI: Central Pollution Control Board, National Air Quality Index (2014)
- Breathing rates: US EPA, Exposure Factors Handbook (2011)

*Bahar Khelo gives guidance, not medical advice.*
