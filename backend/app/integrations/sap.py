from app.integrations.base import IntegrationAdapter

POOL = [
    {
        "title": "PO 4500129950 lead time drift +5 days from supplier Evonik",
        "severity": "high",
        "type": "Lead time drift",
        "company": "Evonik",
        "source_system": "SAP",
        "push_to": "SAP",
        "value_at_risk": 150000,
        "risk_date": "+5 days vs contracted lead time",
        "impact": [
            ["Detected by", "SAP S/4HANA", False],
            ["Business impact", "€150K expedite exposure", True],
            ["Affected order", "PO 4500129950 · 9t excipient", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "Lead time drift of +5 days detected on PO 4500129950.",
    },
    {
        "title": "Temperature excursion on shipment SHP-2404 in transit to EU DC",
        "severity": "high",
        "type": "Cold chain",
        "company": "Catalent",
        "source_system": "SAP",
        "push_to": "SAP",
        "value_at_risk": 190000,
        "risk_date": "Excursion +3.6°C for 38 min",
        "impact": [
            ["Detected by", "SAP shipment telemetry", False],
            ["Business impact", "€190K product value exposed", True],
            ["Excursion", "+3.6°C above range for 38 min", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "Temperature excursion detected on shipment SHP-2404: +3.6°C above range for 38 min.",
    },
]


class SapAdapter(IntegrationAdapter):
    system = "SAP"

    def pull_exceptions(self, cursor: int):
        slot = cursor % (len(POOL) + 2)
        if slot >= len(POOL):
            return None
        return dict(POOL[slot])

    def push_decision(self, decision: dict) -> dict:
        return {"system": "SAP", "status": "confirmed", "detail": f"PO change confirmed for {decision.get('exception_id')}"}
