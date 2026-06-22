"""ASGI handler for Vercel serverless functions."""

import sys
import os

# Add backend directory to sys.path so app.* imports work
backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_dir)

from app.main import app

__all__ = ["app"]
