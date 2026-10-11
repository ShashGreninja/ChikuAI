# Submission draft: Chiku.AI (Air track)

> Draft text for the submission form and the 3-minute video. Run it through /humanize once your voice profile exists, then edit freely.

## One-liner

Chiku the sparrow asks a parent a few questions, reads the hourly air and heat forecast for their neighbourhood, and tells them the safest time for their child to play outside, plus exactly what to do to stay safe.

## Problem

The AQI on a phone is one number for the whole day, made for an adult standing still. Children breathe about twice as much air per kilo, they play hardest in the afternoon when ozone and heat peak, and a Delhi day can swing from Satisfactory at 7 AM to Poor at 5 PM. Parents and PE teachers still decide "outside or not?" by looking at the sky.

## What we built

- **A guided conversation.** Chiku greets you on a park scene and asks one question at a time (or you type everything in one line). The sky in the scene changes with the verdict.
- **A verdict and a checklist.** One of four verdicts, the best window, a personal note in English or Hindi, and precautions that depend on what's in the air: no mask advice on ozone days, water in millilitres, when to air out the house.
- **The full picture.** Hour-by-hour air and heat, lung budget rings for Chiku's pick vs. the usual and worst times, forecast confidence, and a WhatsApp-ready message.
- **For schools.** Paste the outdoor periods from the timetable. It moves what can move, keeps fixed periods (indoors if needed), never double-books, and writes the parent circular.

## The decision model

- **Guardrails:** CPCB National AQI bands (stricter with asthma) and outdoor WBGT heat flags by effort and age. A lower flag always wins.
- **Lung budget:** each outing spends part of a daily allowance, defined as a full day at the WHO 2021 guideline, using EPA breathing rates by age and effort.
- **Heat-driven breathing:** about +3% breathing per °C of WBGT above 22°C, so hot hours cost more.
- **Uncertainty:** ranking uses a risk-adjusted spend that grows with lead time and forecast volatility.
- **Split sessions:** two shorter outings are offered when they save 20% or more of the budget.
- 29 unit tests cover the AQI maths, heat, budget, prevention and both planners.

## Where AI is used

Strands Agents (AWS open source) does three narrow jobs: turning free text into the planner's inputs (structured output), writing Chiku's note from the planner's numbers, and answering follow-up questions by calling the planner as a tool. The AI never picks the time or sets a flag. Without a key, notes fall back to templates.

## Impact

On the Mumbai forecast for 12 Oct, moving an hour of park play from 5 PM (flagged "Stay indoors") to 7 AM cut the child's lung budget use from 46% to 24%, about half. For a 600-student school, shifting PE and recess earlier keeps milligrams of PM2.5 out of children's lungs on every bad-air day, for free. It's just a timetable change.

## What's next

Blend live CPCB station readings into the model forecast, send a nudge the night before, and pilot with two Delhi NCR schools during stubble-burning season.

---

## 3-minute demo video script

**0:00 to 0:20, hook.** A phone AQI app showing one number. "This is all parents get. One number for the whole day. But my kid plays at 5 PM. Is 5 PM okay?"

**0:20 to 0:55, meet Chiku.** Open Chiku.AI. Chiku asks: where, name (Aarav), age, asthma, park play, 1 hour, tomorrow, usually 5 PM. Show the trail of answers you can tap to change.

**0:55 to 1:25, the verdict.** The sky turns hazy. "Aarav can go, but gently: 6 to 7 AM." Read the note, then Chiku's checklist: park not roadside, 110 ml of water every 20 minutes, open windows at 3 PM.

**1:25 to 1:55, under the hood.** Scroll to the full picture. Hover the hour strip: air and heat scored separately. Lung budget rings. "At 5 PM ozone is flagged Poor. Chiku won't break a flag for a few percent of budget." Point at forecast confidence and breathing with the heat boost.

**1:55 to 2:25, schools.** For schools, default timetable, plan. The sky turns hot. "PE moves out of the heat, assembly is fixed so it stays, nothing overlaps." Switch the circular to Hindi.

**2:25 to 2:45, AI, used carefully.** Type "my 4 year old has asthma, cycling tomorrow evening in Noida" into the free-text box and watch the answers fill in. "The AI listens and explains. The planner decides."

**2:45 to 3:00, close.** How it works page. "CPCB AQI, WHO guidelines, EPA breathing rates, WBGT heat. Any city in India. Chiku.AI. The right time to play outside."
