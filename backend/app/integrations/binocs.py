from app.integrations.base import IntegrationAdapter

POOL = [
    {
        "title": "Binocs analyst utilisation over 95% at Site 1 lab — Wk 27",
        "severity": "medium",
        "type": "QC capacity",
        "company": "Site 1",
        "source_system": "Binocs",
        "push_to": "Binocs",
        "value_at_risk": 75000,
        "risk_date": "Release delays likely Wk 27",
        "impact": [
            ["Detected by", "Binocs utilisation model", False],
            ["Business impact", "Release delays likely Wk 27", True],
            ["Utilisation", "96% vs 85% target", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "Analyst utilisation projected at 96% for Wk 27 at Site 1 lab.",
    },
    {
        "title": "Batch Y-7710 QC hold at Site 2 — release window at risk by 2 days",
        "severity": "critical",
        "type": "QC hold",
        "company": "AstraZeneca",
        "source_system": "Binocs",
        "push_to": "Binocs",
        "value_at_risk": 640000,
        "risk_date": "Release window at risk by 2 days",
        "impact": [
            ["Detected by", "Axon (QC signal via Binocs)", False],
            ["Business impact", "€640K revenue at risk", True],
            ["Affected volume", "1 batch · 22,000 units", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "QC hold detected on Batch Y-7710 at Site 2. Release window at risk by 2 days.",
    },
]


class BinocsAdapter(IntegrationAdapter):
    system = "Binocs"

    def pull_exceptions(self, cursor: int):
        slot = cursor % (len(POOL) + 2)
        if slot >= len(POOL):
            return None
        return dict(POOL[slot])

    def push_decision(self, decision: dict) -> dict:
        return {"system": "Binocs", "status": "confirmed", "detail": f"Re-slot confirmed for {decision.get('exception_id')}"}
