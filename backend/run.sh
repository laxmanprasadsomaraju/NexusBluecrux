#!/usr/bin/env bash
# Sets up a local venv (if missing), installs deps, seeds the DB (only if it doesn't
# already exist), and starts the API on http://localhost:8000 with auto-reload.
set -e
cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo "Creating virtualenv..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f nexus.db ]; then
  echo "No nexus.db found — seeding demo data..."
  python seed.py
fi

echo "Starting NEXUS backend on http://localhost:8000 ..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
