"""Chiku on the phone: a Twilio voice flow that asks the parent's questions and reads out the plan.

The flow is stateless. Every answer so far rides along in the query string of the next
webhook URL, so any App Runner instance can serve any step of any call.

    start -> city -> age -> asthma -> activity -> minutes -> day -> report -> menu
                                                                  menu -> ask -> answer -> menu

Questions are answered on the keypad (works on every line); only the city and the optional
follow-up question use speech. Prompts are in English or Hindi with Amazon Polly's Aditi voice.
"""
from __future__ import annotations

import re
from urllib.parse import urlencode

from twilio.twiml.voice_response import Gather, VoiceResponse

from . import agent, data, planner
from .exposure import Profile

VOICE = "Polly.Aditi"
LANG = {"en": "en-IN", "hi": "hi-IN"}

CITIES = {
    "1": ("Delhi", 28.6139, 77.209), "2": ("Mumbai", 19.076, 72.8777), "3": ("Bengaluru", 12.9716, 77.5946),
    "4": ("Kolkata", 22.5726, 88.3639), "5": ("Chennai", 13.0827, 80.2707), "6": ("Hyderabad", 17.385, 78.4867),
    "7": ("Pune", 18.5204, 73.8567), "8": ("Lucknow", 26.8467, 80.9462), "9": ("Patna", 25.5941, 85.1376),
}
AGES = {"1": "3-5", "2": "6-10", "3": "11-15"}
ACTS = {"1": "play", "2": "cycling", "3": "sports", "4": "walk"}
MINS = {"1": 30, "2": 60, "3": 90, "4": 120}

T = {
    "greet": {
        "en": "Namaste! This is Chiku from Bahar Khelo. I'll ask a few quick questions, then tell you the "
              "safest time for your child to play outside.",
        "hi": "नमस्ते! मैं बाहर खेलो से चीकू बोल रहा हूँ। कुछ छोटे सवाल पूछूँगा, फिर बताऊँगा कि आपका बच्चा "
              "बाहर कब सबसे सुरक्षित खेल सकता है।",
    },
    "city": {
        "en": "Which city or area are you in? Please say its name.",
        "hi": "आप किस शहर या इलाके में हैं? कृपया उसका नाम बोलिए।",
    },
    "city_menu": {
        "en": "Press 1 for Delhi, 2 for Mumbai, 3 for Bengaluru, 4 for Kolkata, 5 for Chennai, "
              "6 for Hyderabad, 7 for Pune, 8 for Lucknow, or 9 for Patna.",
        "hi": "दिल्ली के लिए 1 दबाइए, मुंबई 2, बेंगलुरु 3, कोलकाता 4, चेन्नई 5, हैदराबाद 6, पुणे 7, "
              "लखनऊ 8, और पटना के लिए 9।",
    },
    "city_ok": {"en": "Got it, {place}.", "hi": "ठीक है, {place}।"},
    "age": {
        "en": "How old is your child? Press 1 for 3 to 5 years, 2 for 6 to 10 years, or 3 for 11 to 15 years.",
        "hi": "बच्चे की उम्र कितनी है? 3 से 5 साल के लिए 1 दबाइए, 6 से 10 साल के लिए 2, और 11 से 15 साल के लिए 3।",
    },
    "asthma": {
        "en": "Does your child have asthma, or get wheezy when the air is bad? Press 1 for yes, or 2 for no.",
        "hi": "क्या बच्चे को अस्थमा है, या खराब हवा में साँस फूलती है? हाँ के लिए 1, नहीं के लिए 2 दबाइए।",
    },
    "activity": {
        "en": "What will they do outside? Press 1 for park play, 2 for cycling, 3 for a sport like cricket "
              "or football, or 4 for a walk.",
        "hi": "बच्चा बाहर क्या करेगा? पार्क में खेलने के लिए 1, साइकिल के लिए 2, क्रिकेट या फ़ुटबॉल जैसे खेल "
              "के लिए 3, और सैर के लिए 4 दबाइए।",
    },
    "minutes": {
        "en": "For how long? Press 1 for half an hour, 2 for one hour, 3 for an hour and a half, or 4 for two hours.",
        "hi": "कितनी देर के लिए? आधे घंटे के लिए 1, एक घंटे के लिए 2, डेढ़ घंटे के लिए 3, और दो घंटे के लिए 4।",
    },
    "day": {
        "en": "Today or tomorrow? Press 1 for today, or 2 for tomorrow.",
        "hi": "आज या कल? आज के लिए 1, कल के लिए 2 दबाइए।",
    },
    "thinking": {"en": "Thank you. Let me check the sky.", "hi": "धन्यवाद। मैं आसमान देख रहा हूँ।"},
    "retry": {"en": "Sorry, I didn't catch that.", "hi": "माफ़ कीजिए, समझ नहीं आया।"},
    "menu": {
        "en": "Press 1 to hear this again, or 2 to ask me a question. Or simply hang up. Thank you!",
        "hi": "दोबारा सुनने के लिए 1 दबाइए, या मुझसे सवाल पूछने के लिए 2। या फ़ोन रख दीजिए। धन्यवाद!",
    },
    "ask": {"en": "Go ahead, ask your question.", "hi": "अपना सवाल पूछिए।"},
    "one_moment": {"en": "One moment.", "hi": "एक पल।"},
    "no_ai": {
        "en": "Sorry, I can't take questions on this line right now.",
        "hi": "माफ़ कीजिए, अभी इस लाइन पर सवाल नहीं ले पा रहा हूँ।",
    },
    "bye": {"en": "Thank you for calling Bahar Khelo. Stay safe!", "hi": "बाहर खेलो से बात करने के लिए धन्यवाद। ध्यान रखिए!"},
    "error": {
        "en": "Sorry, I couldn't get the forecast just now. Please try again in a little while, or use the website.",
        "hi": "माफ़ कीजिए, अभी मौसम की जानकारी नहीं मिल पाई। थोड़ी देर बाद फिर कोशिश कीजिए, या वेबसाइट देखिए।",
    },
}

NEXT = {"city": "age", "age": "asthma", "asthma": "activity", "activity": "minutes", "minutes": "day"}


def _t(key: str, lang: str, **kw) -> str:
    return T[key][lang].format(**kw)


def _url(base: str, step: str, state: dict) -> str:
    return f"{base}/api/voice/{step}?{urlencode({k: v for k, v in state.items() if v not in (None, '')})}"


def _say(r: VoiceResponse | Gather, text: str, lang: str):
    r.say(text, voice=VOICE, language=LANG[lang])


def _ask_keys(base: str, step: str, state: dict, lang: str, prompt: str, preface: str | None = None,
              again: str | None = None) -> str:
    r = VoiceResponse()
    if preface:
        _say(r, preface, lang)
    g = Gather(input="dtmf", num_digits=1, timeout=7, action=_url(base, step, state), method="POST")
    _say(g, prompt, lang)
    r.append(g)
    # no key pressed: say sorry and ask the same question again
    _say(r, _t("retry", lang), lang)
    r.redirect(_url(base, f"again-{again or step}", state), method="POST")
    return str(r)


def _question(base: str, step: str, state: dict, lang: str, preface: str | None = None) -> str:
    if step == "city":
        r = VoiceResponse()
        if preface:
            _say(r, preface, lang)
        g = Gather(input="speech dtmf", num_digits=1, timeout=6, speech_timeout="auto", language=LANG[lang],
                   hints=", ".join(c[0] for c in CITIES.values()), action=_url(base, "city", state), method="POST")
        _say(g, _t("city", lang), lang)
        r.append(g)
        r.redirect(_url(base, "city-menu", state), method="POST")
        return str(r)
    if step == "city-menu":
        return _ask_keys(base, "city", state, lang, _t("city_menu", lang), preface, again="city-menu")
    return _ask_keys(base, step, state, lang, _t(step, lang), preface)


def _find_place(said: str) -> tuple[str, float, float] | None:
    text = re.sub(r"[^\w\s,]", " ", said).strip()
    if not text:
        return None
    try:
        hits = data.geocode(text, limit=1)
        if not hits and agent.enabled():  # e.g. Hindi speech: let the model normalise the name
            match = agent.intake(f"I live in {text}").get("place_match")
            hits = [match] if match else []
    except Exception:
        hits = []
    if not hits:
        return None
    h = hits[0]
    return h["name"], h["lat"], h["lon"]


def handle(step: str, state: dict, params: dict, base: str) -> str:
    """Return TwiML for one webhook hit. `state` is the query string, `params` Twilio's form fields."""
    lang = state.get("lang", "en") if state.get("lang") in LANG else "en"
    state = {**state, "lang": lang}
    digits = params.get("Digits", "")
    speech = params.get("SpeechResult", "")

    if step == "start":
        return _question(base, "city", state, lang, preface=_t("greet", lang))

    if step.startswith("again-"):
        return _question(base, step[len("again-"):], state, lang)

    if step == "city-menu":
        return _question(base, "city-menu", state, lang, preface=_t("retry", lang))

    if step == "city":
        found = None
        if digits in CITIES:
            found = CITIES[digits]
        elif speech:
            found = _find_place(speech)
        if not found:
            return _question(base, "city-menu", state, lang, preface=_t("retry", lang))
        name, lat, lon = found
        state |= {"place": name, "lat": round(lat, 4), "lon": round(lon, 4)}
        return _question(base, "age", state, lang, preface=_t("city_ok", lang, place=name))

    choices = {"age": AGES, "asthma": {"1": "1", "2": "0"}, "activity": ACTS, "minutes": MINS, "day": {"1": "today",
                                                                                                         "2": "tomorrow"}}
    if step in choices:
        if digits not in choices[step]:
            return _question(base, step, state, lang, preface=_t("retry", lang))
        state[step] = choices[step][digits]
        if step == "day":
            r = VoiceResponse()
            _say(r, _t("thinking", lang), lang)
            r.redirect(_url(base, "report", state), method="POST")
            return str(r)
        return _question(base, NEXT[step], state, lang)

    if step in ("report", "repeat"):
        try:
            text = report_text(state, lang)
        except Exception:
            r = VoiceResponse()
            _say(r, _t("error", lang), lang)
            r.hangup()
            return str(r)
        return _menu(base, state, lang, preface=text)

    if step == "menu":
        if digits == "1":
            return handle("repeat", state, {}, base)
        if digits == "2":
            if not agent.enabled():
                return _menu(base, state, lang, preface=_t("no_ai", lang))
            r = VoiceResponse()
            g = Gather(input="speech", timeout=6, speech_timeout="auto", language=LANG[lang],
                       action=_url(base, "question", state), method="POST")
            _say(g, _t("ask", lang), lang)
            r.append(g)
            r.redirect(_url(base, "menu-again", state), method="POST")
            return str(r)
        r = VoiceResponse()
        _say(r, _t("bye", lang), lang)
        r.hangup()
        return str(r)

    if step == "menu-again":
        return _menu(base, state, lang)

    if step == "question":
        if not speech:
            return _menu(base, state, lang, preface=_t("retry", lang))
        # Answering can take a few seconds; acknowledge first, then fetch on a fresh webhook.
        r = VoiceResponse()
        _say(r, _t("one_moment", lang), lang)
        r.redirect(_url(base, "answer", state | {"q": speech[:300]}), method="POST")
        return str(r)

    if step == "answer":
        q = state.pop("q", "")
        try:
            reply = agent.ask(q, {"place": state.get("place"), "lat": state.get("lat"), "lon": state.get("lon"),
                                  "age": state.get("age"), "asthma": state.get("asthma") == "1",
                                  "day": state.get("day"), "channel": "phone call, keep it to 2 sentences"})
        except Exception:
            reply = _t("no_ai", lang)
        return _menu(base, state, lang, preface=reply)

    r = VoiceResponse()
    _say(r, _t("bye", lang), lang)
    r.hangup()
    return str(r)


def _menu(base: str, state: dict, lang: str, preface: str | None = None) -> str:
    r = VoiceResponse()
    if preface:
        _say(r, preface, lang)
    g = Gather(input="dtmf", num_digits=1, timeout=8, action=_url(base, "menu", state), method="POST")
    _say(g, _t("menu", lang), lang)
    r.append(g)
    _say(r, _t("bye", lang), lang)
    r.hangup()
    return str(r)


# ------------------------------------------------------------------ the spoken report

POLLUTANT = {
    "en": {"PM2.5": "fine dust, P M 2.5", "PM10": "dust, P M 10", "O₃": "ozone", "NO₂": "traffic fumes",
           "SO₂": "sulphur dioxide", "CO": "carbon monoxide"},
    "hi": {"PM2.5": "बारीक धूल, पी एम 2.5", "PM10": "धूल, पी एम 10", "O₃": "ओज़ोन", "NO₂": "गाड़ियों का धुआँ",
           "SO₂": "सल्फ़र डाइऑक्साइड", "CO": "कार्बन मोनोऑक्साइड"},
}
CAT_HI = {"Good": "अच्छी", "Satisfactory": "संतोषजनक", "Moderate": "मध्यम", "Poor": "खराब",
          "Very Poor": "बहुत खराब", "Severe": "गंभीर"}
VERDICT = {
    "en": ["It's a good time to play outside.", "They can go, but gently, with rest breaks.",
           "Keep it short and calm.", "It's better to stay indoors. If they must go out, this is the least risky time."],
    "hi": ["बाहर खेलने का अच्छा समय है।", "बाहर जा सकते हैं, पर आराम से, बीच बीच में रुककर।",
           "थोड़ी देर ही, और हल्का खेल।", "आज घर के अंदर रहना बेहतर है। बहुत ज़रूरी हो तो यही सबसे कम जोखिम वाला समय है।"],
}


def hi_time(minute: int) -> str:
    h, m = divmod(minute, 60)
    part = "सुबह" if 4 <= h < 12 else "दोपहर" if h < 16 else "शाम" if h < 20 else "रात"
    h12 = h % 12 or 12
    if m == 30:
        word = {1: "डेढ़", 2: "ढाई"}.get(h12, f"साढ़े {h12}")
        return f"{part} {word} बजे"
    return f"{part} {h12} बजे"


def hi_window(w: dict) -> str:
    return f"{hi_time(w['start'])} से {hi_time(w['end'])} तक"


def _hi_tip(s: dict) -> str | None:
    title = s["title"]
    if s["id"] == "water":
        ml = re.search(r"(\d+) ml", title)
        return f"हर 20 मिनट में लगभग {ml.group(1)} मिलीलीटर पानी पिलाइए।" if ml else None
    if s["id"] == "windows":
        m = re.search(r"around (\d+) (AM|PM), shut them by (\d+) (AM|PM)", title)
        if not m:
            return None
        to_min = lambda h, ap: ((int(h) % 12) + (12 if ap == "PM" else 0)) * 60  # noqa: E731
        return (f"घर की खिड़कियाँ {hi_time(to_min(m.group(1), m.group(2)))} खोलिए, "
                f"और {hi_time(to_min(m.group(3), m.group(4)))} तक बंद कर दीजिए।")
    return {
        "route": "भीड़ वाली सड़क से दूर, किसी पार्क में खेलें।",
        "mask": "वहाँ तक जाते समय बच्चों वाला N95 मास्क पहनाइए।",
        "ozone": "आज ओज़ोन ज़्यादा है, जो धूप में बनती है। छाँव और सुबह का समय बेहतर है।",
        "traffic": "मुख्य सड़क से थोड़ा दूर खेलें।",
        "shade": "हर 20 मिनट में 5 मिनट छाँव में आराम कीजिए।",
        "uv": "टोपी और सनस्क्रीन लगाइए।",
        "asthma": "इनहेलर साथ रखिए, और खाँसी या साँस फूलने पर तुरंत रुकिए।",
        "rain": "बारिश हो सकती है, रेनकोट साथ रखिए।",
        "indoor": "घर के अंदर खेलने का प्लान भी तैयार रखिए।",
    }.get(s["id"])


def _spoken(text: str) -> str:
    """Screen text to something Polly reads naturally."""
    text = re.sub(r"(\d+) ml\b", r"\1 millilitres", text)
    text = re.sub(r"every 20$", "every 20 minutes", text)
    return text.replace("N95", "N 95").replace("UV", "U V")


def plan_from_state(state: dict) -> dict:
    p = Profile(age=state["age"], activity=state["activity"], minutes=int(state["minutes"]),
                asthma=state.get("asthma") == "1")
    fc = data.fetch_forecast(float(state["lat"]), float(state["lon"]))
    return planner.plan_parent(fc, p, state["day"])


def report_text(state: dict, lang: str) -> str:
    plan = plan_from_state(state)
    pick = plan["pick"]
    place = state.get("place", "")
    if lang == "hi":
        day = "आज" if plan["day"] == "today" else "कल"
        if not pick:
            return "आज बाहर खेलने का सुरक्षित समय निकल चुका है। कल के लिए फिर से कॉल कीजिए।"
        parts = [
            f"{place} में {day} के लिए सबसे अच्छा समय है {hi_window(pick)}।",
            VERDICT["hi"][pick["level"]],
            f"उस समय हवा की गुणवत्ता {CAT_HI.get(pick['aqi_cat'], pick['aqi_cat'])} रहेगी, ए क्यू आई लगभग "
            f"{pick['aqi']}, ज़्यादातर {POLLUTANT['hi'].get(pick['dominant'], pick['dominant'])} की वजह से।",
        ]
        if (plan.get("saved_vs_worst_pct") or 0) >= 10:
            parts.append(f"दिन के सबसे खराब समय के मुकाबले बच्चे के फेफड़ों में {plan['saved_vs_worst_pct']} प्रतिशत "
                         "कम प्रदूषण जाएगा।")
        if plan.get("split"):
            a, b = plan["split"]["sessions"]
            parts.append(f"चाहें तो दो हिस्सों में खेलें: {hi_window(a)}, और {hi_window(b)}।")
        tips = [t for t in (_hi_tip(s) for s in plan["prevention"]) if t][:2]
        if tips:
            parts.append("ध्यान रखिए: " + " ".join(tips))
        if plan.get("tomorrow_hint"):
            parts.append(f"कल बेहतर रहेगा: {hi_window(plan['tomorrow_hint'])}।")
        return " ".join(parts)

    day = "today" if plan["day"] == "today" else "tomorrow"
    if not pick:
        return "Today's safe time to play outside has passed. Please call again for tomorrow."
    parts = [
        f"Here's the plan for {day} in {place}. The best time is {pick['label']}.",
        VERDICT["en"][pick["level"]],
        f"The air quality index then is about {pick['aqi']}, which is {pick['aqi_cat'].lower()}, "
        f"mostly from {POLLUTANT['en'].get(pick['dominant'], pick['dominant'])}.",
    ]
    if (plan.get("saved_vs_worst_pct") or 0) >= 10:
        parts.append(f"Compared with the worst time of the day, your child breathes in "
                     f"{plan['saved_vs_worst_pct']} percent less pollution.")
    if plan.get("split"):
        a, b = plan["split"]["sessions"]
        parts.append(f"Or split it into two shorter sessions: {a['label']}, and {b['label']}.")
    tips = [_spoken(s["title"]) for s in plan["prevention"][:2]]
    if tips:
        parts.append("A few things to remember. " + ". ".join(tips) + ".")
    if plan.get("tomorrow_hint"):
        parts.append(f"Tomorrow looks better, at {plan['tomorrow_hint']['label']}.")
    return " ".join(parts)
