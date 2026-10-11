import type { Metadata } from "next";
import Chiku from "@/components/Chiku";
import home from "../page.module.css";
import styles from "./how.module.css";

export const metadata: Metadata = {
  title: "How it works | Bahar Khelo",
  description:
    "The lung budget model behind Bahar Khelo: India AQI, WHO-relative dose, heat-driven breathing, forecast uncertainty, and where AI is and isn't used.",
};

const PIPELINE = [
  {
    step: "1",
    title: "Forecast",
    body: "Hourly PM2.5, PM10, NO₂, O₃, CO and SO₂ (CAMS), plus temperature, humidity, UV, rain and sunlight. Three days ahead, and yesterday for rolling averages.",
    tag: "Open-Meteo",
  },
  {
    step: "2",
    title: "Flag every hour",
    body: "India AQI from CPCB breakpoints and outdoor WBGT. Each hour gets an air flag and a heat flag, tuned to the child's age, activity and asthma.",
    tag: "Guardrails",
  },
  {
    step: "3",
    title: "Price it in lung budget",
    body: "How much of a healthy day's pollution allowance each half-hour costs, with heat raising breathing and forecast uncertainty raising the price.",
    tag: "Lung budget",
  },
  {
    step: "4",
    title: "Search and explain",
    body: "Every 30-minute start is tried, plus split sessions. Then pollutant-aware precautions, and Chiku's note in English or Hindi.",
    tag: "Planner + AI",
  },
];

export default function HowItWorks() {
  return (
    <div className={home.page}>
      <section className={home.hero}>
        <h1>
          How Chiku <span className={home.out}>decides</span>
        </h1>
        <p>
          A simple answer on the outside and a careful model on the inside. Every number comes from a public forecast,
          a published standard or a reference dataset. The AI writes and listens, but it never decides.
        </p>
      </section>

      <ol className={styles.pipeline} aria-label="How a plan is made">
        {PIPELINE.map((p) => (
          <li key={p.step} className={styles.stage}>
            <span className={styles.step}>{p.step}</span>
            <h2>{p.title}</h2>
            <p>{p.body}</p>
            <span className={styles.tag}>{p.tag}</span>
          </li>
        ))}
      </ol>

      <section className={styles.feature}>
        <div>
          <p className={styles.kicker}>The core idea</p>
          <h2>A lung budget, not just an AQI number</h2>
          <p>
            AQI tells you how dirty the air is. It doesn&apos;t tell you how much of it ends up in a child. Bahar Khelo
            gives every child a daily <b>lung budget</b>: the pollution they would inhale in a full day of air at the
            WHO 2021 guideline. Each outing spends part of it.
          </p>
          <pre className={styles.code}>
{`spend  = Σ (C ÷ WHO guideline) × L/min × heat factor × minutes
budget = spend ÷ daily inhalation volume × 100%`}
          </pre>
        </div>
        <ul className={styles.facts}>
          <li>
            <b>Kids breathe more.</b> Breathing rates by age and effort come from the US EPA Exposure Factors
            Handbook (2011). A 6 to 10 year old at play takes in about twice an adult&apos;s air per kilogram.
          </li>
          <li>
            <b>Heat makes them breathe harder.</b> Breathing rises about 3% for every °C of WBGT above 22°C, capped at
            35%. So a hot afternoon costs more lung budget than a cool morning with the same AQI.
          </li>
          <li>
            <b>Uncertain hours cost more.</b> Forecast error grows with lead time and with how jumpy the forecast is
            around an hour. Windows are ranked on a risk-adjusted spend, so a steady clean hour beats a clean-looking
            hour wedged between two spikes.
          </li>
          <li>
            <b>Two short sessions can beat one long one.</b> For outings of an hour or more, the planner also tries
            two halves at least two hours apart and offers the split when it saves 20% or more.
          </li>
        </ul>
      </section>

      <div className={styles.cols}>
        <article className={styles.block}>
          <h2>Guardrails: India AQI and heat flags</h2>
          <p>
            Before any budget maths, every hour is flagged. Air uses CPCB&apos;s National AQI bands (stricter by one
            band with asthma). Heat uses outdoor WBGT, <code>0.7·Tw + 0.2·Tg + 0.1·Ta</code>, with the Stull wet-bulb
            and a solar globe estimate, against youth-sport lines that are stricter for harder play and for
            under-6s.
          </p>
          <p>A lower flag always wins. Chiku won&apos;t pick a flagged hour to save a few percent of budget.</p>
        </article>

        <article className={styles.block}>
          <h2>Precautions that depend on what&apos;s in the air</h2>
          <p>
            Generic advice is often wrong. Masks do nothing for ozone, and a hard run in an N95 is a bad idea for a
            small child. So each tip is triggered by the dominant pollutant, the heat and the child:
          </p>
          <ul className={styles.list}>
            <li>PM days: choose parks away from roads, N95 for the walk there.</li>
            <li>Ozone days: earlier hours and shade, and no mask advice.</li>
            <li>NO₂ days: one lane away from traffic is enough.</li>
            <li>Water in millilitres from a sweat-rate estimate, and when to open home windows.</li>
          </ul>
        </article>
      </div>

      <section className={styles.ai}>
        <h2>Where AI is used, and where it isn&apos;t</h2>
        <div className={styles.aiGrid}>
          <div>
            <h3>The AI does</h3>
            <ul>
              <li>
                <b>Listen.</b> &quot;My 7 yr old has mild asthma, cricket after school in Noida&quot; becomes the
                planner&apos;s inputs (structured output from a Strands agent).
              </li>
              <li>
                <b>Explain.</b> It writes Chiku&apos;s short note from the planner&apos;s numbers, in English or Hindi.
              </li>
              <li>
                <b>Answer follow-ups.</b> &quot;Is 5 PM okay?&quot; The agent can only answer by calling the planner as
                a tool, so its numbers match the page.
              </li>
            </ul>
          </div>
          <div>
            <h3>The AI never</h3>
            <ul>
              <li>picks the time, sets a flag or estimates a pollution level;</li>
              <li>changes the lung budget or the checklist.</li>
            </ul>
            <p className={styles.aiNote}>
              No API key? Notes fall back to a template and everything else works the same.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.honest}>
        <Chiku mood="careful" size={110} />
        <div>
          <h2>What Chiku can&apos;t do (yet)</h2>
          <ul>
            <li>
              Forecasts come from a global model (CAMS) at about 10 km resolution, not from the CPCB station down your
              road. Model ozone over India can run high. Next step: blend in live CPCB station readings.
            </li>
            <li>
              The heat-breathing slope and the uncertainty terms are reasoned approximations, not fitted to Indian
              children. They are easy to recalibrate as data comes in.
            </li>
            <li>Bahar Khelo gives guidance, not medical advice. Symptoms always beat forecasts.</li>
          </ul>
        </div>
      </section>

      <section className={styles.stack}>
        <h2>Built with</h2>
        <ul>
          <li>
            <b>Strands Agents</b> (AWS open source): intake, Chiku&apos;s note and the Ask Chiku agent
          </li>
          <li>
            <b>Python + FastAPI</b>: AQI, heat, lung budget, prevention and the planners, with unit tests
          </li>
          <li>
            <b>Next.js</b>: the web app
          </li>
          <li>
            <b>Open-Meteo</b>: free CAMS air-quality and weather forecasts
          </li>
        </ul>
      </section>
    </div>
  );
}
