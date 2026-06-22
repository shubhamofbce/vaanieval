"""ASGI handler for Vercel serverless functions."""

from backend.api.index import app

application = app
handler = app
