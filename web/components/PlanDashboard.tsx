import { childWord, type Answers } from "@/lib/answers";
import { clock, nf } from "@/lib/format";
import { parentMessage } from "@/lib/messages";
import type { ParentPlan } from "@/lib/types";
import AskChiku from "./AskChiku";
import BudgetRings, { type BudgetRow } from "./BudgetRings";
import DayStrip, { type Marker } from "./DayStrip";
import ShareBox from "./ShareBox";
import WhyPanel from "./WhyPanel";
import ui from "./ui.module.css";
import styles from "./PlanDashboard.module.css";

export default function PlanDashboard({ plan, answers }: { plan: ParentPlan; answers: Answers }) {
  const who = childWord(answers);
  const pick = plan.pick;
  const place = answers.place!;

  return (
    <section id="full-picture" className={styles.wrap} aria-label="The full picture">
      <header className={styles.head}>
        <p className={ui.eyebrow}>The full picture</p>
        <h2>
          How {who}&apos;s {plan.day === "today" ? "day" : "tomorrow"} looks, hour by hour
        </h2>
      </header>

      <div className={styles.tiles}>
        <Tile
          label="Day's peak AQI (CPCB)"
          value={String(plan.day_aqi.peak)}
          sub={`${plan.day_aqi.peak_cat}, mostly ${plan.day_aqi.dominant}, around ${clock(plan.day_aqi.peak_hour * 60)}`}
        />
        {pick && (
          <Tile
            label="Forecast confidence"
            value={cap(pick.confidence)}
            sub="for the picked window, from lead time and how steady the forecast is"
          />
        )}
        {pick && (
          <Tile
            label="Breathing during play"
            value={`${Math.round(plan.profile.litres_per_min * pick.vent_x)} L/min`}
            sub={pick.vent_x > 1.01 ? `includes +${Math.round((pick.vent_x - 1) * 100)}% from heat` : "no extra load from heat"}
          />
        )}
        <Tile
          label="Air per kg vs an adult"
          value={`${plan.profile.per_kg_vs_adult}×`}
          sub={`why the same AQI hits a ${plan.profile.age} year old harder`}
        />
      </div>

      <div className={styles.grid}>
        <article className={`${ui.card} ${styles.full}`}>
          <h3 className={ui.cardTitle}>Hour by hour</h3>
          <p className={ui.cardSub}>Hover or tab through the hours. Air and heat are scored separately, then combined.</p>
          <DayStrip hours={plan.hours} nowMin={plan.now_min} markers={markersFor(plan)} />
        </article>

        {pick && (
          <article className={`${ui.card} ${styles.wide}`}>
            <h3 className={ui.cardTitle}>{who.charAt(0).toUpperCase() + who.slice(1)}&apos;s lung budget</h3>
            <p className={styles.budgetHead}>{budgetHeadline(plan)}</p>
            <BudgetRings rows={budgetRows(plan)} />
            <p className={styles.caption}>
              100% is the pollution {who} would breathe in a whole day of air at the WHO guideline
              ({nf.format(plan.profile.daily_litres)} litres at this age). One outing shouldn&apos;t use most of it.
            </p>
          </article>
        )}

        <article className={`${ui.card} ${styles.narrow}`}>
          <AskChiku
            bare
            context={{
              place: place.name, lat: place.lat, lon: place.lon, child: answers.name ?? null,
              age: plan.profile.age, asthma: plan.profile.asthma, day: plan.day,
            }}
          />
        </article>

        <div className={styles.full}>
          <WhyPanel plan={plan} />
        </div>

        <div className={styles.full}>
          <ShareBox
            title="Send it to the family group"
            sub="Grandparents, the driver, the coach: everyone on the same page."
            build={(lang) => parentMessage(plan, place.name, answers.name ?? null, lang)}
          />
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <b className={styles.tileValue}>{value}</b>
      <span className={styles.tileSub}>{sub}</span>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function markersFor(plan: ParentPlan): Marker[] {
  const out: Marker[] = [];
  if (plan.usual && (!plan.pick || plan.usual.start !== plan.pick.start)) {
    out.push({ start: plan.usual.start, end: plan.usual.end, label: "usual", kind: "usual" });
  }
  if (plan.pick) out.push({ start: plan.pick.start, end: plan.pick.end, label: "Chiku's pick", kind: "pick" });
  return out;
}

function budgetRows(plan: ParentPlan): BudgetRow[] {
  const { pick, usual, worst } = plan;
  if (!pick) return [];
  const rows: BudgetRow[] = [
    { key: "pick", label: "Chiku's pick", when: pick.label, pct: pick.budget_pct, pm25: pick.pm25_ug, highlight: true },
  ];
  if (usual && usual.start !== pick.start)
    rows.push({ key: "usual", label: "Usual time", when: usual.label, pct: usual.budget_pct, pm25: usual.pm25_ug });
  if (worst && worst.start !== pick.start && worst.start !== usual?.start)
    rows.push({ key: "worst", label: "Worst time", when: worst.label, pct: worst.budget_pct, pm25: worst.pm25_ug });
  return rows;
}

function budgetHeadline(plan: ParentPlan): string {
  const { pick, usual } = plan;
  if (!pick || !usual) return "";
  if (usual.start === pick.start) return "Your usual time is already the best one.";
  const saved = plan.saved_vs_usual_pct ?? 0;
  const flag = `${usual.start_label} is flagged "${usual.status.label}" for ${usual.dominant} (AQI ${usual.aqi})`;
  if (saved >= 5) return `${saved}% less of the budget than going at ${usual.start_label}.`;
  if (usual.level > pick.level) {
    return saved > -5
      ? `About the same budget as ${usual.start_label}, but ${flag}.`
      : `A trade-off: ${usual.start_label} uses a little less budget, but ${flag}. Chiku doesn't break a flag for a few percent.`;
  }
  return "The air is similar across the day, so Chiku picked the gentlest slot.";
}
