"""
Common interface every simulated integration adapter implements. Real deployments
would swap the body of `pull_exceptions`/`push_decision` for actual HTTP calls to
Axon/Binocs/Helion/SAP/Anaplan while keeping this same interface — routers never talk
to an adapter's internals directly.
"""
from typing import Optional, List, Dict, Any


class IntegrationAdapter:
    system: str = "base"

    def pull_exceptions(self, cursor: int) -> Optional[Dict[str, Any]]:
        """Return one canned 'next' exception dict for this cursor position, or None
        if there's nothing new this cycle (keeps /sync realistic — not every poll
        finds something)."""
        raise NotImplementedError

    def push_decision(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate pushing an approved decision back to the source system. Returns
        a canned confirmation payload."""
        raise NotImplementedError
