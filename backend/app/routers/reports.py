import os
from datetime import datetime

from fastapi import APIRouter, Depends
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, scope_exceptions_query
from app.routers.analytics import resolution_trend, by_source, team_response, value_at_risk, on_time_rate

router = APIRouter(prefix="/reports", tags=["reports"])

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "generated_reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def _money(v: float, currency: str) -> str:
    symbol = "EUR " if currency == "EUR" else (currency + " ")
    return f"{symbol}{v:,.0f}"


# fpdf2's built-in core fonts (Helvetica etc) only support the Latin-1 codepage, but
# our data/labels use em-dashes, arrows and middots freely. Rather than embed a
# Unicode TTF font for a demo PDF, normalize to ASCII-safe punctuation before writing.
_ASCII_REPLACEMENTS = {
    "—": "-", "–": "-", "·": "-", "→": "->", "’": "'", "‘": "'",
    "“": '"', "”": '"', "…": "...", "€": "EUR ",
}


def _s(text) -> str:
    text = str(text)
    for k, v in _ASCII_REPLACEMENTS.items():
        text = text.replace(k, v)
    return text.encode("latin-1", "ignore").decode("latin-1")


@router.post("/executive-pdf")
def executive_pdf(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    settings = utils.get_settings(db)
    var = value_at_risk(db=db, user=user)
    otr = on_time_rate(db=db, user=user)
    trend = resolution_trend(weeks=4, db=db, user=user)
    source = by_source(db=db, user=user)
    team = team_response(db=db, user=user)
    stats = {
        "critical_open": scope_exceptions_query(db.query(models.Exception_), user).filter(
            models.Exception_.severity == "critical", models.Exception_.status.notin_(["action_taken", "resolved"])
        ).count()
    }

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(13, 27, 42)
    pdf.cell(0, 12, _s("NEXUS by Bluecrux - Executive View"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 8, _s(f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} for {user.name} ({user.title or user.role})"), ln=True)
    pdf.ln(4)

    def h2(text):
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(13, 27, 42)
        pdf.cell(0, 10, _s(text), ln=True)
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(20, 20, 20)

    h2("Headline metrics")
    pdf.cell(0, 7, _s(f"Critical open exceptions: {stats['critical_open']}"), ln=True)
    pdf.cell(0, 7, _s(f"Value at risk (open): {_money(var['total_value_at_risk'], settings.currency)}  "
                   f"(delta vs last week: {_money(var['delta_vs_last_week'], settings.currency)})"), ln=True)
    if var["biggest_contributor"]:
        pdf.cell(0, 7, _s(f"Biggest contributor: {var['biggest_contributor']['title']} - "
                       f"{_money(var['biggest_contributor']['value_at_risk'], settings.currency)}"), ln=True)
    pdf.cell(0, 7, _s(f"Value protected (resolved): {_money(var['value_protected_resolved'], settings.currency)}"), ln=True)
    otr_pct = otr["on_time_rate_pct"]
    pdf.cell(0, 7, _s(f"Actions completed on time: {otr_pct if otr_pct is not None else 'n/a'}% "
                   f"(target {otr['target_pct']}%, sample {otr['sample_size']})"), ln=True)
    pdf.ln(4)

    h2("Exception resolution trend (last 4 weeks)")
    for w in trend["weeks"]:
        pdf.cell(0, 6, _s(f"  {w['week_start']} to {w['week_end']}: opened {w['opened']}, resolved {w['resolved']}"), ln=True)
    pdf.ln(4)

    h2("Exceptions by source system")
    for s in source["items"]:
        pdf.cell(0, 6, _s(f"  {s['source_system']}: {s['count']}"), ln=True)
    pdf.ln(4)

    h2("Team response times (avg hours to first action)")
    if team["items"]:
        for t in team["items"]:
            pdf.cell(0, 6, _s(f"  {t['team']}: {t['avg_response_hours']}h (n={t['sample_size']})"), ln=True)
    else:
        pdf.cell(0, 6, _s("  No completed first-actions recorded yet."), ln=True)

    filename = f"executive_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    pdf.output(filepath)

    utils.audit(db, user, "export_executive_pdf", entity_type="report", entity_id=filename, after={"path": filepath})

    return {
        "filename": filename,
        # Mock "Azure Blob Storage signed URL" — a real deployment uploads the file and
        # returns a time-limited SAS URL instead of a local static path.
        "download_url": f"/reports/files/{filename}",
    }
