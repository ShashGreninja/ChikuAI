"""Printable PDF reports for parents and schools.

Built from the same plan dictionaries the web app shows, so the PDF, the screen and the
WhatsApp message never disagree.
"""
from __future__ import annotations

import io
import re
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (Flowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

INK = colors.HexColor("#2a1f14")
INK2 = colors.HexColor("#5c4a38")
INK3 = colors.HexColor("#8a7763")
PAPER = colors.HexColor("#fbf4e6")
PAPER2 = colors.HexColor("#f5ead3")
MARIGOLD = colors.HexColor("#f4a62a")
MARIGOLD_SOFT = colors.HexColor("#fde7b8")
LEAF = colors.HexColor("#2f6b45")
HAIR = colors.HexColor("#e6d9bf")
STATUS = {
    "go": colors.HexColor("#0ca30c"),
    "caution": colors.HexColor("#fab219"),
    "limit": colors.HexColor("#ec835a"),
    "stop": colors.HexColor("#d03b3b"),
}
STATUS_TINT = {
    "go": colors.HexColor("#d9f0d6"),
    "caution": colors.HexColor("#fdefc6"),
    "limit": colors.HexColor("#fbdccd"),
    "stop": colors.HexColor("#f6d2d2"),
}
STATUS_LABEL = {"go": "Go play", "caution": "Go easy", "limit": "Keep it short", "stop": "Stay indoors"}
LEVEL_KEY = ("go", "caution", "limit", "stop")

_SUBS = str.maketrans({"₂": "2", "₃": "3", "≈": "~", "→": "->", "–": "-", "×": "x", "…": "..."})


def clean(text: str) -> str:
    """Core PDF fonts are Latin-1 only: map the few symbols we use and drop the rest."""
    text = re.sub(r"\s*—\s*", ", ", str(text)).translate(_SUBS)
    return text.encode("latin-1", "ignore").decode("latin-1")


def esc(text: str) -> str:
    return clean(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def fmt_hour(h: int) -> str:
    return f"{h % 12 or 12} {'AM' if h < 12 else 'PM'}"


def pretty_date(iso: str) -> str:
    return date.fromisoformat(iso).strftime("%A, %d %b %Y")


# ------------------------------------------------------------------ styles

def _styles() -> dict[str, ParagraphStyle]:
    base = dict(fontName="Helvetica", textColor=INK, leading=13, fontSize=9.5, alignment=TA_LEFT)
    return {
        "h1": ParagraphStyle("h1", **(base | {"fontName": "Helvetica-Bold", "fontSize": 20, "leading": 24})),
        "h2": ParagraphStyle("h2", **(base | {"fontName": "Helvetica-Bold", "fontSize": 12.5, "leading": 16,
                                               "spaceBefore": 10, "spaceAfter": 5})),
        "eyebrow": ParagraphStyle("eyebrow", **(base | {"fontName": "Helvetica-Bold", "fontSize": 7.5,
                                                         "textColor": INK3, "leading": 10})),
        "body": ParagraphStyle("body", **base),
        "muted": ParagraphStyle("muted", **(base | {"textColor": INK2})),
        "small": ParagraphStyle("small", **(base | {"fontSize": 7.5, "leading": 10, "textColor": INK3})),
        "big": ParagraphStyle("big", **(base | {"fontName": "Helvetica-Bold", "fontSize": 17, "leading": 21})),
        "cell": ParagraphStyle("cell", **(base | {"fontSize": 8.5, "leading": 11})),
        "cellb": ParagraphStyle("cellb", **(base | {"fontSize": 8.5, "leading": 11, "fontName": "Helvetica-Bold"})),
        "stat": ParagraphStyle("stat", **(base | {"fontName": "Helvetica-Bold", "fontSize": 15, "leading": 18})),
    }


S = _styles()


class ChikuMark(Flowable):
    """A small vector Chiku for the report header."""

    def __init__(self, size: float = 22 * mm):
        super().__init__()
        self.size = size
        self.width = self.height = size

    def draw(self):
        c = self.canv
        k = self.size / 160.0
        c.saveState()
        c.scale(k, k)
        c.translate(0, 160)
        c.scale(1, -1)  # draw in the same top-left coordinates as the web SVG
        c.setStrokeColor(INK)
        c.setLineWidth(2.5)
        c.setFillColor(colors.HexColor("#6b4a2f"))
        p = c.beginPath()
        for i, (x, y) in enumerate([(38, 104), (8, 90), (14, 106), (6, 120), (40, 118)]):
            p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
        p.close()
        c.drawPath(p, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#b07a4f"))
        c.ellipse(30, 70, 118, 142, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#f1e2c6"))
        c.ellipse(74, 96, 116, 138, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#7b5236"))
        c.ellipse(38, 84, 94, 116, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#b07a4f"))
        c.circle(100, 62, 32, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#8e8a84"))
        c.ellipse(72, 30, 128, 56, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#f4ebdd"))
        c.ellipse(89, 65, 123, 87, fill=1, stroke=0)
        c.setFillColor(MARIGOLD)
        p = c.beginPath()
        p.moveTo(128, 60)
        p.lineTo(148, 67)
        p.lineTo(128, 74)
        p.close()
        c.drawPath(p, fill=1, stroke=1)
        c.setFillColor(INK)
        c.circle(114, 58, 5.5, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.circle(116, 56, 1.8, fill=1, stroke=0)
        c.restoreState()


def _header(title: str, sub: str) -> Table:
    t = Table([[ChikuMark(), [Paragraph("BAHAR KHELO", S["eyebrow"]), Paragraph(esc(title), S["h1"]),
                              Paragraph(esc(sub), S["muted"])]]],
              colWidths=[26 * mm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), MARIGOLD_SOFT),
        ("BOX", (0, 0), (-1, -1), 1.5, INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def _stats(items: list[tuple[str, str, str]]) -> Table:
    cells = [[Paragraph(esc(label.upper()), S["eyebrow"]), Paragraph(esc(value), S["stat"]),
              Paragraph(esc(sub), S["small"])] for label, value, sub in items]
    t = Table([cells], colWidths=[None] * len(cells))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 1, INK),
        ("INNERGRID", (0, 0), (-1, -1), 0.75, HAIR),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _hour_table(hours: list[dict], start: int = 6, end: int = 20, marks: dict[int, str] | None = None) -> Table:
    marks = marks or {}
    head = ["Hour", "Verdict", "AQI", "Main pollutant", "WBGT °C", "Temp °C", "Rain %", ""]
    rows = [[Paragraph(h, S["cellb"]) for h in head]]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), PAPER2),
        ("LINEBELOW", (0, 0), (-1, 0), 1, INK),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, HAIR),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ]
    for h in hours:
        if not start <= h["hour"] < end:
            continue
        r = len(rows)
        key = h["status"]
        rows.append([
            Paragraph(fmt_hour(h["hour"]), S["cellb"]),
            Paragraph(STATUS_LABEL[key], S["cell"]),
            Paragraph(f"{h['aqi']} <font color='#8a7763'>{esc(h['aqi_cat'])}</font>", S["cell"]),
            Paragraph(esc(h["dominant"]), S["cell"]),
            Paragraph(str(h["wbgt"]), S["cell"]),
            Paragraph(str(h["temp"]), S["cell"]),
            Paragraph(str(h["rain"]), S["cell"]),
            Paragraph(f"<b>{esc(marks[h['hour']])}</b>" if h["hour"] in marks else "", S["cell"]),
        ])
        style += [("BACKGROUND", (1, r), (1, r), STATUS_TINT[key]),
                  ("LINEBEFORE", (1, r), (1, r), 3, STATUS[key])]
    t = Table(rows, colWidths=[15 * mm, 25 * mm, 28 * mm, 22 * mm, 17 * mm, 16 * mm, 14 * mm, None],
              repeatRows=1)
    t.setStyle(TableStyle(style))
    return t


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(INK3)
    canvas.drawString(18 * mm, 10 * mm,
                      "Guidance, not medical advice. Sources: Open-Meteo (CAMS), CPCB National AQI, "
                      "WHO 2021 guidelines, US EPA Exposure Factors Handbook.")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def _build(story: list, title: str, top: float = 16 * mm) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=top, bottomMargin=16 * mm, title=clean(title), author="Bahar Khelo")
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()


# ------------------------------------------------------------------ parent

def parent_pdf(plan: dict, place: str, name: str | None, note: str | None = None) -> bytes:
    who = name or "your child"
    pr = plan["profile"]
    day_word = "Today" if plan["day"] == "today" else "Tomorrow"
    story: list = [
        _header(f"Outdoor plan for {who}",
                f"{place} · {day_word}, {pretty_date(plan['date'])} · {pr['activity']}, {pr['minutes']} min"
                f"{' · asthma' if pr['asthma'] else ''}"),
        Spacer(1, 10),
    ]

    pick = plan.get("pick")
    if pick:
        key = pick["status"]["key"]
        verdict = Table([[
            [Paragraph("CHIKU'S PICK", S["eyebrow"]), Paragraph(esc(pick["label"]), S["big"]),
             Paragraph(f"AQI {pick['aqi']} ({esc(pick['aqi_cat'])}, mostly {esc(pick['dominant'])}) · "
                       f"heat stress {pick['wbgt']}°C WBGT · forecast confidence {pick['confidence']}", S["muted"])],
            Paragraph(f"<b>{STATUS_LABEL[key]}</b>", S["body"]),
        ]], colWidths=[None, 34 * mm])
        verdict.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 1.5, INK),
            ("BACKGROUND", (1, 0), (1, 0), STATUS_TINT[key]),
            ("LINEBEFORE", (1, 0), (1, 0), 4, STATUS[key]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (1, 0), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story += [verdict, Spacer(1, 8)]
        if note:
            story += [Paragraph(esc(note), S["body"]), Spacer(1, 8)]

        usual = plan.get("usual")
        stats = [("Lung budget used", f"{pick['budget_pct']}%", "of a healthy day's allowance")]
        if usual and usual["start"] != pick["start"]:
            stats.append((f"At {usual['start_label']} instead", f"{usual['budget_pct']}%",
                          f"flagged {STATUS_LABEL[usual['status']['key']].lower()}"))
        stats += [
            ("Day's peak AQI", str(plan["day_aqi"]["peak"]),
             f"{plan['day_aqi']['peak_cat']}, mostly {plan['day_aqi']['dominant']}"),
            ("Breathing", f"{round(pr['litres_per_min'] * pick['vent_x'])} L/min",
             f"{pr['per_kg_vs_adult']}x an adult per kg"),
        ]
        story += [_stats(stats), Spacer(1, 4)]

        if plan.get("split"):
            s = plan["split"]
            story.append(Paragraph(
                f"<b>Or split it:</b> {esc(s['sessions'][0]['label'])} and {esc(s['sessions'][1]['label'])}, "
                f"using {s['saved_vs_single_pct']}% less of the lung budget than one long session.", S["body"]))
    else:
        story.append(Paragraph("Today's safe outdoor window has passed. Check tomorrow morning.", S["big"]))

    if plan.get("prevention"):
        items = [[Paragraph("[  ]", S["cellb"]),
                  [Paragraph(f"<b>{esc(s['title'])}</b>", S["body"]), Paragraph(esc(s["detail"]), S["muted"])]]
                 for s in plan["prevention"]]
        t = Table(items, colWidths=[10 * mm, None])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LINEBELOW", (0, 0), (-1, -2), 0.4, HAIR),
                               ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story += [KeepTogether([Paragraph("Chiku's checklist", S["h2"]), t])]

    marks = {}
    if pick:
        for hh in range(pick["start"] // 60, (pick["end"] - 1) // 60 + 1):
            marks[hh] = "Chiku's pick"
    if plan.get("usual") and (not pick or plan["usual"]["start"] != pick["start"]):
        marks.setdefault(plan["usual"]["start"] // 60, "usual time")
    story += [Paragraph(f"{day_word}, hour by hour", S["h2"]),
              Paragraph("Each hour gets an air flag (India AQI, stricter with asthma) and a heat flag (WBGT for the "
                        "activity), and the worse one is the verdict. The lung budget is the share of a healthy day's "
                        "pollution allowance, a full day at the WHO guideline, that the outing uses.", S["small"]),
              Spacer(1, 4),
              _hour_table(plan["hours"], marks=marks)]
    return _build(story, f"Bahar Khelo plan for {who}", top=12 * mm)


# ------------------------------------------------------------------ school bulletin

DRIVER_TEXT = {"air": "air", "heat": "heat", "advisory": "govt. advisory"}


def bulletin_pdf(day: dict, place: str, school: str) -> bytes:
    """The morning bulletin: one page for the staff room notice board."""
    day_word = {"today": "Today", "tomorrow": "Tomorrow"}.get(day["day"], "")
    periods = day["periods"]
    story: list = [
        _header(f"Outdoor plan: {school}",
                f"{place} · {day_word + ', ' if day_word else ''}{pretty_date(day['date'])} · "
                f"school hours {day['school_hours']['label']}"),
        Spacer(1, 8),
    ]
    if day["advisory"]:
        banner = Table([[Paragraph("<b>Government air quality advisory in force.</b> All outdoor activity moves "
                                   "indoors today.", S["body"])]], colWidths=[None])
        banner.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), STATUS_TINT["stop"]),
                                    ("LINEBEFORE", (0, 0), (0, 0), 4, STATUS["stop"]),
                                    ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story += [banner, Spacer(1, 6)]

    c = day["counts"]
    a = day["day_aqi"]
    story += [_stats([
        ("Outdoor as usual", str(c.get("go", 0)), "periods"),
        ("Adjusted", str(len(periods) - c.get("go", 0)), "periods with a change of activity"),
        ("Class swaps", str(len(day["swaps"])), "suggested below"),
        ("Peak AQI", str(a.get("peak", "-")), f"{a.get('peak_cat', '')}, mostly {a.get('dominant', '')}"),
    ]), Paragraph("Period by period", S["h2"])]

    head = ["Time", "Class", "Period", "Status", "Do this", "Why"]
    rows = [[Paragraph(h, S["cellb"]) for h in head]]
    style = [("BACKGROUND", (0, 0), (-1, 0), PAPER2), ("LINEBELOW", (0, 0), (-1, 0), 1, INK),
             ("LINEBELOW", (0, 1), (-1, -1), 0.4, HAIR), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
             ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    for p in periods:
        i = len(rows)
        key = p["status"]["key"]
        todo = f"<b>{esc(p['action'])}</b>"
        if p.get("asthma"):
            todo += (f"<br/><font color='#5c4a38'>{p['asthma']['count']} with asthma: "
                     f"{esc(p['asthma']['action'].lower())}</font>")
        why = ", ".join(DRIVER_TEXT.get(d, d) for d in p["drivers"]) or "-"
        rows.append([
            Paragraph(f"<b>{esc(p['label'])}</b>", S["cell"]),
            Paragraph(esc(p["class_name"]), S["cell"]),
            Paragraph(esc(p["kind_label"]), S["cell"]),
            Paragraph(STATUS_LABEL[key], S["cell"]),
            Paragraph(todo, S["cell"]),
            Paragraph(f"{esc(why)}<br/><font color='#8a7763'>AQI {p['aqi']}, WBGT {p['wbgt']}</font>", S["cell"]),
        ])
        style += [("BACKGROUND", (3, i), (3, i), STATUS_TINT[key]), ("LINEBEFORE", (3, i), (3, i), 3, STATUS[key])]
    t = Table(rows, colWidths=[30 * mm, 22 * mm, 24 * mm, 22 * mm, None, 28 * mm], repeatRows=1)
    t.setStyle(TableStyle(style))
    story.append(t)

    if day["swaps"]:
        lines = []
        for s in day["swaps"]:
            lines.append(Paragraph(
                f"<b>{esc(s['a']['class_name'])}</b> PE {esc(s['a']['from'])} &lt;-&gt; "
                f"<b>{esc(s['b']['class_name'])}</b> PE {esc(s['b']['from'])}. "
                f"{esc(s['a']['class_name'])}: {STATUS_LABEL[s['a']['before']['key']].lower()} -&gt; "
                f"{STATUS_LABEL[s['a']['after']['key']].lower()}; {esc(s['b']['class_name'])}: "
                f"{STATUS_LABEL[s['b']['before']['key']].lower()} -&gt; {STATUS_LABEL[s['b']['after']['key']].lower()}.",
                S["body"]))
        story += [KeepTogether([Paragraph("Suggested PE swaps", S["h2"]),
                                Paragraph("The two classes trade PE slots (and the subjects in those slots). The ground "
                                          "and PE teacher are used exactly as before.", S["small"]), Spacer(1, 3),
                                *lines])]

    story += [Paragraph("The school day, hour by hour", S["h2"]),
              _hour_table(day["hours"], start=max(6, day["school_hours"]["start"] // 60 - 1),
                          end=min(20, -(-day["school_hours"]["end"] // 60) + 1))]
    return _build(story, f"Bahar Khelo bulletin for {school}", top=12 * mm)


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", clean(text).lower()).strip("-") or "report"
