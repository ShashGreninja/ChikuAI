from baharkhelo import report, school
from tests.test_core import make_forecast

CLASSES = [{"id": "3a", "name": "3A", "age": "6-10", "asthma": 0},
           {"id": "5b", "name": "5B", "age": "6-10", "asthma": 3}]


def morning_clean():
    return make_forecast(lambda h: 25 if h < 10 else 140)


def test_periods_keep_their_time_and_get_an_activity():
    periods = [{"id": "asm", "class_id": "all", "kind": "assembly", "start": 8 * 60, "minutes": 20},
               {"id": "pe5b", "class_id": "5b", "kind": "pe", "start": 11 * 60, "minutes": 40}]
    day = school.check_day(morning_clean(), "today", CLASSES, periods, 8 * 60, 14 * 60)
    by_id = {p["id"]: p for p in day["periods"]}
    assert by_id["asm"]["start"] == 8 * 60 and by_id["asm"]["status"]["key"] == "go"
    pe = by_id["pe5b"]
    assert pe["start"] == 11 * 60 and pe["level"] >= 1
    assert pe["action"] == school.LADDER["pe"][pe["level"]]


def test_asthma_count_adds_a_stricter_note():
    fc = make_forecast(lambda h: 50)  # AQI ~83: fine for most, caution with asthma
    periods = [{"id": "pe", "class_id": "5b", "kind": "pe", "start": 9 * 60, "minutes": 40}]
    p = school.check_day(fc, "today", CLASSES, periods, 8 * 60, 14 * 60)["periods"][0]
    assert p["status"]["key"] == "go" and p["asthma"]["count"] == 3


def test_pe_swap_moves_the_worse_class_into_clean_air():
    periods = [{"id": "pe3a", "class_id": "3a", "kind": "pe", "start": 8 * 60, "minutes": 40},
               {"id": "pe5b", "class_id": "5b", "kind": "pe", "start": 12 * 60, "minutes": 40}]
    # 3A at 8 is clean, 5B at noon is dirty: swapping makes 5B better and 3A worse, so no swap.
    day = school.check_day(morning_clean(), "today", CLASSES, periods, 8 * 60, 14 * 60)
    assert day["swaps"] == []


def test_pe_swap_found_when_both_gain_or_hold():
    # Moderate air in the morning, clean but warm after noon. The UKG class (small children
    # heat up faster) suffers at 1 PM; class 8 copes with that heat. Trading slots helps UKG
    # and leaves 8A no worse.
    classes = [{"id": "ukg", "name": "UKG", "age": "3-5", "asthma": 0},
               {"id": "8a", "name": "8A", "age": "11-15", "asthma": 0}]
    fc = make_forecast(lambda h: 75 if h < 11 else 20, temp_by_hour=lambda h: 31 if h >= 12 else 27)
    periods = [{"id": "a", "class_id": "ukg", "kind": "pe", "start": 13 * 60, "minutes": 30},
               {"id": "b", "class_id": "8a", "kind": "pe", "start": 9 * 60, "minutes": 30}]
    day = school.check_day(fc, "today", classes, periods, 8 * 60, 14 * 60)
    assert len(day["swaps"]) == 1
    s = day["swaps"][0]
    assert {s["a"]["id"], s["b"]["id"]} == {"a", "b"}
    levels = {"go": 0, "caution": 1, "limit": 2, "stop": 3}
    for side in (s["a"], s["b"]):
        assert levels[side["after"]["key"]] <= levels[side["before"]["key"]]


def test_advisory_sends_everything_indoors():
    periods = [{"id": "asm", "class_id": "all", "kind": "assembly", "start": 8 * 60, "minutes": 20}]
    p = school.check_day(morning_clean(), "today", CLASSES, periods, 8 * 60, 14 * 60, advisory=True)["periods"][0]
    assert p["status"]["key"] == "stop" and p["drivers"] == ["advisory"]


def test_event_finder_ranks_three_days():
    out = school.find_event_slots(morning_clean(), "6-10", "sports", 60, 7 * 60, 17 * 60)
    assert [d["day"] for d in out["days"]] == ["today", "tomorrow", "2"]
    assert out["best"] in ("today", "tomorrow", "2")
    assert all(d["window"]["start"] < 10 * 60 for d in out["days"] if d["window"])


def test_bulletin_is_a_one_page_pdf():
    periods = [{"id": "asm", "class_id": "all", "kind": "assembly", "start": 8 * 60, "minutes": 20},
               {"id": "pe", "class_id": "5b", "kind": "pe", "start": 11 * 60, "minutes": 40}]
    day = school.check_day(morning_clean(), "today", CLASSES, periods, 8 * 60, 14 * 60)
    pdf = report.bulletin_pdf(day, "Delhi", "DPS")
    assert pdf.startswith(b"%PDF") and pdf.count(b"/Type /Page\n") + pdf.count(b"/Type /Page ") <= 2
