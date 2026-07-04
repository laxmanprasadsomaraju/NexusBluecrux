from app.integrations.base import IntegrationAdapter

POOL = [
    {
        "title": "1,400-unit capacity gap at Samsung Biologics — Wk 30-31",
        "severity": "high",
        "type": "Capacity gap",
        "company": "Samsung Biologics",
        "source_system": "Helion",
        "push_to": "Helion",
        "value_at_risk": 540000,
        "risk_date": "Wk 30-31, 10 weeks out",
        "impact": [
            ["Detected by", "Helion capacity model", False],
            ["Business impact", "€540K launch revenue at risk", True],
            ["Affected volume", "1,400 units · Wk 30-31", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "Capacity gap of 1,400 units detected at Samsung Biologics for Wk 30-31.",
    },
]


class HelionAdapter(IntegrationAdapter):
    system = "Helion"

    def pull_exceptions(self, cursor: int):
        slot = cursor % (len(POOL) + 3)
        if slot >= len(POOL):
            return None
        return dict(POOL[slot])

    def push_decision(self, decision: dict) -> dict:
        return {"system": "Helion", "status": "confirmed", "detail": f"Capacity decision confirmed for {decision.get('exception_id')}"}
