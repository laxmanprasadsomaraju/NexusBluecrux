from app.integrations.base import IntegrationAdapter

POOL = [
    {
        "title": "SKU-114 safety stock at NL warehouse below policy — stockout in 6 days",
        "severity": "high",
        "type": "Inventory drift",
        "company": "Maesa",
        "source_system": "Axon",
        "push_to": "SAP",
        "value_at_risk": 210000,
        "risk_date": "Stockout in 6 days",
        "impact": [
            ["Detected by", "Axon inventory command center", False],
            ["Business impact", "€210K service risk", True],
            ["Current stock", "5.1 days (policy: 14 days)", True],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "SKU-114 safety stock dropped to 5.1 days at NL warehouse. Policy: 14 days.",
    },
    {
        "title": "Site 2 KPI alert — OEE dropped 9pts below target on Line 4",
        "severity": "medium",
        "type": "Performance",
        "company": "Site 2",
        "source_system": "Axon",
        "push_to": "Axon",
        "value_at_risk": 60000,
        "risk_date": "Trending down 3 days",
        "impact": [
            ["Detected by", "Axon performance command center", False],
            ["Business impact", "€60K throughput risk", True],
            ["OEE", "71% vs 80% target", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "OEE on Line 4 at Site 2 dropped 9pts below target over the last 3 days.",
    },
    {
        "title": "SKU-231 forecast vs actual variance breach at BE distribution centre",
        "severity": "medium",
        "type": "Inventory drift",
        "company": "Clariant Catalysts",
        "source_system": "Axon",
        "push_to": "SAP",
        "value_at_risk": 88000,
        "risk_date": "Overstock building over 2 weeks",
        "impact": [
            ["Detected by", "Axon inventory command center", False],
            ["Business impact", "€88K overstock exposure", True],
            ["Variance", "34% above forecast for 2 weeks", False],
            ["Current owner", "Auto-routed on sync", False],
        ],
        "detected_body": "SKU-231 actuals are running 34% above forecast for two consecutive weeks at the BE DC.",
    },
]


class AxonAdapter(IntegrationAdapter):
    system = "Axon"

    def pull_exceptions(self, cursor: int):
        slot = cursor % (len(POOL) + 1)
        if slot == len(POOL):
            return None
        return dict(POOL[slot])

    def push_decision(self, decision: dict) -> dict:
        return {"system": "Axon", "status": "confirmed", "detail": f"Parameter update applied for {decision.get('exception_id')}"}
