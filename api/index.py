"""ASGI handler for Vercel serverless functions."""

import sys
import os

# Add both sys.path entries: backend for app.* imports, project root for future flexibility
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(project_root, 'backend')

sys.path.insert(0, backend_dir)
sys.path.insert(0, project_root)

# Import the FastAPI application
from app.main import app
