"""ASGI handler for Vercel serverless functions."""

import sys
import os

# Try multiple paths to find backend directory
possible_paths = [
    os.path.join(os.path.dirname(__file__), '..', 'backend'),  # Relative path
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'),  # Absolute then relative
    '/var/task/backend',  # Vercel function root  
    '/tmp/backend',  # Temp directory
]

for backend_path in possible_paths:
    if os.path.exists(backend_path) and os.path.isdir(backend_path):
        sys.path.insert(0, backend_path)
        break
else:
    # If no backend found, add current directory and parent
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except ImportError as e:
    # Debug: print import error
    import traceback
    print(f"Failed to import app: {e}", file=sys.stderr)
    traceback.print_exc()
    raise

__all__ = ["app"]
