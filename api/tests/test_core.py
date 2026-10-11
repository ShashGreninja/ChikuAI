from datetime import datetime, timedelta

import pytest

from baharkhelo import aqi, budget, heat, planner, prevention, report
from baharkhelo.data import Forecast, Hour
from baharkhelo.exposure import Profile, segments

CLEAN = {"pm2_5": 20, "pm10": 40, "nitrogen_dioxide": 20, "ozone": 40,
         "carbon_monoxide": 500, "sulphur_dioxide": 10}


def make_forecast(pm25_by_hour, temp_by_hour=None, now_hour=5, ozone_by_hour=None):
    """Three days of synthetic hours (yesterday for rolling means, today, tomorrow)."""
    start = datetime(2026, 10, 10, 0)
    hours = []
    for d in range(3):
        for h in range(24):
            o3 = (ozone_by_hour or (lambda _: CLEAN["ozone"]))(h)
            hours.append(Hour(time=start + timedelta(days=d, hours=h),
                              conc=CLEAN | {"pm2_5": pm25_by_hour(h), "ozone": o3},
                              temp=(temp_by_hour or (lambda _: 26.0))(h), rh=50, feels=26,
                              uv=3, rain=0, sw=0))
    return Forecast(lat=28.6, lon=77.2, timezone="Asia/Kolkata",
                    now=datetime(2026, 10, 11, now_hour, 0), hours=hours)


@pytest.mark.parametrize("conc,expected", [(0, 0), (30, 50), (60, 100), (90, 200),
                                            (120, 300), (250, 400), (1000, 500)])
def test_pm25_breakpoints(conc, expected):
    assert aqi.subindex("pm2_5", conc) == pytest.approx(expected)


def test_co_is_converted_to_mg():
    assert aqi.subindex("carbon_monoxide", 2000) == pytest.approx(100)


def test_aqi_takes_dominant_pollutant():
    value, dom, _ = aqi.aqi(CLEAN | {"pm10": 300})
    assert dom == "pm10" and value == 250


def test_category():
    assert aqi.category(42) == "Good"
    assert aqi.category(150) == "Moderate"
    assert aqi.category(420) == "Severe"


def test_wet_bulb_matches_stull_reference():
    assert heat.wet_bulb(20, 50) == pytest.approx(13.7, abs=0.1)


def test_heat_flags_stricter_for_harder_play():
    assert heat.level(27.5, "light", "6-10") == 1
    assert heat.level(27.5, "high", "6-10") == 2
    assert heat.level(27.5, "high", "3-5") == 2
    assert heat.level(28.5, "high", "3-5") == 3


def test_segments_split_across_hours():
    assert list(segments(17 * 60 + 30, 60)) == [(17, 30), (18, 30)]


def test_children_breathe_more_per_kg_than_adults():
    assert Profile(age="3-5").per_kg_vs_adult > 1.8


def test_profile_rejects_bad_input():
    with pytest.raises(ValueError):
        Profile(age="40")


def test_parent_pick_avoids_polluted_evening():
    # Clean morning, filthy evening.
    fc = make_forecast(lambda h: 25 if h < 12 else 140)
    plan = planner.plan_parent(fc, Profile(minutes=60), "today", usual=17 * 60)
    assert plan["pick"]["start"] < 12 * 60
    assert plan["pick"]["status"]["key"] == "go"
    assert plan["saved_vs_usual_pct"] > 70


def test_parent_pick_avoids_heat():
    fc = make_forecast(lambda h: 25, temp_by_hour=lambda h: 42 if 10 <= h <= 17 else 27)
    plan = planner.plan_parent(fc, Profile(activity="sports", minutes=60), "today")
    assert not 10 * 60 <= plan["pick"]["start"] < 18 * 60


def test_asthma_is_stricter():
    fc = make_forecast(lambda h: 50)  # AQI ~83 all day
    normal = planner.plan_parent(fc, Profile(asthma=False), "today")
    asthma = planner.plan_parent(fc, Profile(asthma=True), "today")
    assert normal["pick"]["level"] == 0 and asthma["pick"]["level"] == 1


def test_today_never_picks_the_past():
    fc = make_forecast(lambda h: 25 if h < 9 else 80, now_hour=14)
    plan = planner.plan_parent(fc, Profile(), "today")
    assert plan["pick"]["start"] >= 14 * 60


def test_heat_makes_children_breathe_harder():
    assert budget.heat_vent_factor(20) == 1.0
    assert budget.heat_vent_factor(30) == pytest.approx(1.24)
    assert budget.heat_vent_factor(45) == budget.HEAT_VENT_CAP


def test_uncertainty_grows_with_lead_time_and_spikes():
    calm_soon = budget.uncertainty(2, 1.0, 1.0, 1.0)
    calm_later = budget.uncertainty(40, 1.0, 1.0, 1.0)
    spiky = budget.uncertainty(2, 3.0, 1.0, 1.0)
    assert calm_soon < calm_later < spiky


def test_budget_scales_with_air_and_time():
    clean = make_forecast(lambda h: 15)  # exactly the WHO guideline (other pollutants lower)
    plan = planner.plan_parent(clean, Profile(minutes=60), "today")
    # 1 h of moderate play at the guideline ~= 22 L/min * 60 / 12,000 L = 11% of the day
    assert plan["pick"]["budget_pct"] == pytest.approx(11.0, abs=1.0)


def test_steady_clean_hour_beats_one_between_spikes():
    # 9 AM is clean but sits between two dirty hours; 15 h onwards is a little worse but steady.
    def pm(h):
        if h == 9:
            return 30
        if h in (8, 10):
            return 140
        return 36 if h >= 14 else 140
    plan = planner.plan_parent(make_forecast(pm), Profile(minutes=60), "today")
    assert plan["pick"]["start"] >= 14 * 60


def test_split_offered_when_two_short_sessions_are_cleaner():
    # Clean at 7 AM and 6 PM only.
    fc = make_forecast(lambda h: 20 if h in (7, 18) else 110)
    plan = planner.plan_parent(fc, Profile(minutes=120), "today")
    assert plan["split"] is not None
    starts = [s["start"] for s in plan["split"]["sessions"]]
    assert starts == [7 * 60, 18 * 60]


def test_ozone_day_never_suggests_a_mask():
    fc = make_forecast(lambda h: 20, ozone_by_hour=lambda h: 260)
    plan = planner.plan_parent(fc, Profile(), "today")
    ids = {s["id"] for s in plan["prevention"]}
    assert "ozone" in ids and "mask" not in ids


def test_water_plan_grows_with_heat():
    p = Profile(activity="sports", minutes=60)
    assert prevention.water_plan(p, 30, 60)[1] > prevention.water_plan(p, 20, 60)[1]


def test_report_text_is_safe_for_pdf_fonts():
    assert report.clean("NO₂ ≈ 3 → ok — done") == "NO2 ~ 3 -> ok, done"
    assert report.clean("आरव") == ""


def test_parent_report_is_a_pdf():
    fc = make_forecast(lambda h: 25 if h < 12 else 140)
    plan = planner.plan_parent(fc, Profile(), "today")
    assert report.parent_pdf(plan, "Delhi", "Aarav", "note").startswith(b"%PDF")
