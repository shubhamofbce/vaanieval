"""ASGI handler for Vercel serverless functions."""

from __future__ import annotations

import os
import sys

# Ensure `app.*` imports resolve in the Vercel runtime.
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

# Export common names recognized by different Python hosting adapters.
application = app
handler = app
