"""Walk the phone flow the way Twilio would, without Twilio."""
from urllib.parse import parse_qsl, urlparse

import pytest

from chiku import phone, voice
from tests.test_core import make_forecast


@pytest.fixture(autouse=True)
def fake_forecast(monkeypatch):
    fc = make_forecast(lambda h: 25 if h < 12 else 140, now_hour=5)
    monkeypatch.setattr(voice.data, "fetch_forecast", lambda lat, lon: fc)
    monkeypatch.setattr(voice.data, "geocode", lambda q, limit=1: [{"name": "Noida", "region": "UP",
                                                                      "lat": 28.53, "lon": 77.39}])


def follow(twiml: str) -> tuple[str, dict]:
    """The step and state of the action URL in a TwiML response."""
    import re

    url = re.search(r'(?:action="|<Redirect method="POST">)([^"<]+)', twiml).group(1).replace("&amp;", "&")
    u = urlparse(url)
    return u.path.rsplit("/", 1)[1], dict(parse_qsl(u.query))


@pytest.mark.parametrize("lang", ["en", "hi"])
def test_full_call(lang):
    tw = voice.handle("start", {"lang": lang}, {}, "")
    assert "Polly.Aditi" in tw and "Gather" in tw
    step, state = follow(tw)
    tw = voice.handle(step, state, {"SpeechResult": "Noida."}, "")
    for key in ("2", "2", "1", "2", "1"):  # age 6-10, no asthma, park play, 1 hour, today
        step, state = follow(tw)
        tw = voice.handle(step, state, {"Digits": key}, "")
    step, state = follow(tw)
    assert step == "report" and state["place"] == "Noida" and state["day"] == "today"
    tw = voice.handle(step, state, {}, "")
    assert ("best time" in tw) if lang == "en" else ("सबसे अच्छा समय" in tw)
    assert "<Hangup" in tw  # menu ends politely if nothing is pressed


def test_wrong_key_asks_again():
    tw = voice.handle("age", {"lang": "en", "place": "Delhi", "lat": "28.6", "lon": "77.2"}, {"Digits": "9"}, "")
    assert "didn't catch that" in tw and "How old" in tw


def test_unknown_city_falls_back_to_keypad(monkeypatch):
    monkeypatch.setattr(voice.data, "geocode", lambda q, limit=1: [])
    monkeypatch.setattr(voice.agent, "enabled", lambda: False)
    tw = voice.handle("city", {"lang": "en"}, {"SpeechResult": "mumble"}, "")
    assert "Press 1 for Delhi" in tw


def test_hindi_time_words():
    assert voice.hi_time(6 * 60) == "सुबह 6 बजे"
    assert voice.hi_time(17 * 60 + 30) == "शाम साढ़े 5 बजे"
    assert voice.hi_time(14 * 60 + 30) == "दोपहर ढाई बजे"


@pytest.mark.parametrize("raw,ok", [("98765 43210", "+919876543210"), ("+91 98765-43210", "+919876543210"),
                                    ("09876543210", "+919876543210"), ("12345", None), ("+14155550100", None)])
def test_phone_numbers(raw, ok):
    assert phone.normalise(raw) == ok


def test_same_number_is_not_called_twice_in_a_row():
    assert phone.check_limits("+919000000001", "1.1.1.1") is None
    assert phone.check_limits("+919000000001", "1.1.1.1") is not None
