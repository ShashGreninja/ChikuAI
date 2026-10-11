import type { Metadata } from "next";
import Chiku from "@/components/Chiku";
import home from "../page.module.css";
import styles from "./how.module.css";

export const metadata: Metadata = {
  title: "How it works — Bahar Khelo",
  description: "Data sources, the India AQI calculation, the child breathing model, heat stress and the planner.",
};

const PIPELINE = [
  {
    step: "1",
    title: "Forecast",
    body: "Hourly PM2.5, PM10, NO₂, O₃, CO, SO₂ (CAMS) plus temperature, humidity, UV, rain and sunlight for the next 3 days, and yesterday for rolling averages.",
    tag: "Open-Meteo",
  },
  {
    step: "2",
    title: "Score every hour",
    body: "India AQI from CPCB breakpoints, a NAAQS-relative air factor, and outdoor WBGT. Each hour gets an air flag and a heat flag, tuned to the child's age, activity and asthma.",
    tag: "Python",
  },
  {
    step: "3",
    title: "Search the day",
    body: "Slide the outing across every 30-minute start time. Keep the safest flag, then the lowest pollution dose and heat strain. For schools: no double-booking, fixed periods stay put.",
    tag: "Planner",
  },
  {
    step: "4",
    title: "Explain it",
    body: "One verdict from Chiku, an hour-by-hour strip, the dose you avoid, and a message in English or Hindi. Ask Chiku answers free-form questions by calling the same planner.",
    tag: "Next.js + Strands",
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
          Simple on the outside, careful on the inside. Every number on screen comes from a public forecast, a
          published standard or a reference dataset. Nothing is guessed by an AI.
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

      <div className={styles.cols}>
        <article className={styles.block}>
          <h2>India AQI, done the CPCB way</h2>
          <p>
            Each pollutant&apos;s concentration is mapped to a sub-index through the official CPCB breakpoint table
            (0–50 Good, up to 401–500 Severe). The AQI is the highest sub-index. The day&apos;s headline AQI uses
            CPCB averaging: 24-hour means for PM, NO₂ and SO₂, and 8-hour means for O₃ and CO.
          </p>
          <p>
            For planning hour by hour, PM, NO₂ and SO₂ use the value for that hour, because that&apos;s what a child
            actually breathes during that hour. O₃ and CO keep their 8-hour mean.
          </p>
        </article>

        <article className={styles.block}>
          <h2>Children breathe more</h2>
          <p>
            Breathing rates come from the US EPA Exposure Factors Handbook (2011, Table 6-2), by age group and effort
            level. A 6–10 year old at play breathes about 22 litres of air a minute. Per kilogram of body weight
            that&apos;s about twice what an adult takes in, so the same air does more harm.
          </p>
          <pre className={styles.code}>dose = Σ (C ÷ NAAQS limit) × litres/min × minutes</pre>
          <p>
            Using India&apos;s legal limit as the unit makes the dose linear in concentration, which AQI is not, so
            doses for different times can be compared fairly.
          </p>
        </article>

        <article className={styles.block}>
          <h2>Heat, the way a body feels it</h2>
          <p>
            Thermometers miss humidity and sun. We estimate outdoor Wet Bulb Globe Temperature:
          </p>
          <pre className={styles.code}>WBGT = 0.7·Tw + 0.2·Tg + 0.1·Ta</pre>
          <p>
            Tw is the Stull (2011) wet-bulb temperature, and Tg is a globe-temperature estimate from incoming
            sunlight. Flag lines for caution, limit and stop follow youth-sport heat guidance (AAP, ACSM). They are
            stricter for harder play and 1°C stricter for under-6s.
          </p>
        </article>

        <article className={styles.block}>
          <h2>The four verdicts</h2>
          <ul className={styles.levels}>
            <li>
              <b>Go play</b> AQI ≤ 100 and heat below the caution line
            </li>
            <li>
              <b>Go easy</b> AQI 101–200 (children are a sensitive group at Moderate), or mild heat
            </li>
            <li>
              <b>Keep it short</b> AQI 201–300, or heat above the limit line
            </li>
            <li>
              <b>Stay indoors</b> AQI above 300, or heat past the stop line
            </li>
          </ul>
          <p>With asthma, every air threshold drops one category.</p>
        </article>
      </div>

      <section className={styles.honest}>
        <Chiku mood="careful" size={110} />
        <div>
          <h2>What Chiku can&apos;t do (yet)</h2>
          <ul>
            <li>
              Forecasts come from a global model (CAMS) at about 10 km resolution, not from the CPCB ground station
              down your road. Model ozone over India can run high. Next step: blend in live CPCB station readings.
            </li>
            <li>
              Indoor air isn&apos;t clean air. We assume classrooms carry about 60% of outdoor PM2.5, which is typical of
              naturally ventilated Indian buildings.
            </li>
            <li>Bahar Khelo gives guidance, not medical advice. Symptoms always beat forecasts.</li>
          </ul>
        </div>
      </section>

      <section className={styles.stack}>
        <h2>Built with</h2>
        <ul>
          <li>
            <b>Strands Agents</b> (AWS open source): the Ask Chiku agent and its tools
          </li>
          <li>
            <b>FastAPI + Python</b>: AQI, heat, exposure and the planner, with unit tests
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
