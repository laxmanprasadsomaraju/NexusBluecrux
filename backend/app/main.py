import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app import models  # noqa: F401 — ensures all tables are registered on Base.metadata
from app.routers import (
    auth_router, exceptions, actions, analytics, partners, integrations, sync,
    rules, users, settings as settings_router, notifications, assistant, reports, audit_log, teams,
)

app = FastAPI(title="NEXUS by Bluecrux — Supply Chain Exception & Escalation Hub", version="1.0.0")

# Permissive CORS for local dev — the React/Vite frontend runs on a different port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_reports")
    os.makedirs(reports_dir, exist_ok=True)


@app.get("/health")
def health():
    return {"status": "ok", "service": "nexus-backend"}


app.include_router(auth_router.router)
app.include_router(exceptions.router)
app.include_router(actions.router)
app.include_router(analytics.router)
app.include_router(partners.router)
app.include_router(integrations.router)
app.include_router(sync.router)
app.include_router(rules.router)
app.include_router(users.router)
app.include_router(settings_router.router)
app.include_router(notifications.router)
app.include_router(assistant.router)
app.include_router(reports.router)
app.include_router(audit_log.router)
app.include_router(teams.router)

# Serve generated PDF reports for direct download — stands in for an Azure Blob
# Storage signed URL (see routers/reports.py).
_reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_reports")
os.makedirs(_reports_dir, exist_ok=True)
app.mount("/reports/files", StaticFiles(directory=_reports_dir), name="reports-files")
