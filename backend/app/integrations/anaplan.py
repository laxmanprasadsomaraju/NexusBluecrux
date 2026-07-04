from app.integrations.base import IntegrationAdapter

POOL = [
    {
        "title": "Forecast accuracy drop of 14pts on D-Line SKU family, APAC",
        "severity": "medium",
        "type": "Forecast",
        "company": "APAC region",
        "source_system": "Anaplan",
        "push_to": "Anaplan",
        "value_at_risk": 70000,
        "risk_date": "Trending down 2 weeks",
        "impact": [
            ["Detected by", "Anaplan forecast module", False],
            ["Business impact", "Overstock risk €70K", True],
            ["Accuracy", "64% (target: 80%)", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "Forecast accuracy on D-Line family dropped 14pts below target in APAC.",
    },
]


class AnaplanAdapter(IntegrationAdapter):
    system = "Anaplan"

    def pull_exceptions(self, cursor: int):
        slot = cursor % (len(POOL) + 3)
        if slot >= len(POOL):
            return None
        return dict(POOL[slot])

    def push_decision(self, decision: dict) -> dict:
        # Anaplan is read-only in MVP per spec — this is here only for interface symmetry.
        return {"system": "Anaplan", "status": "not_supported", "detail": "Anaplan is read-only in MVP"}
