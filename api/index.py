"""ASGI handler for Vercel serverless functions."""

import sys
import os

# Add backend directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app

__all__ = ["app"]
