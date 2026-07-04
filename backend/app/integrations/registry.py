from app.integrations.axon import AxonAdapter
from app.integrations.binocs import BinocsAdapter
from app.integrations.helion import HelionAdapter
from app.integrations.sap import SapAdapter
from app.integrations.anaplan import AnaplanAdapter

# Maps integrations.id (slug) -> adapter instance. Only systems with a pull/push
# adapter appear here; Teams/Entra/Slack/Outlook/OMP/Partner-portal are represented
# in the `integrations` table but don't participate in the exception-pulling sync loop.
ADAPTERS = {
    "axon": AxonAdapter(),
    "binocs": BinocsAdapter(),
    "helion": HelionAdapter(),
    "sap": SapAdapter(),
    "anaplan": AnaplanAdapter(),
}
