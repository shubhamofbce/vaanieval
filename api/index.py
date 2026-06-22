"""ASGI handler for Vercel serverless functions."""

import sys
import os

# Add both sys.path entries: backend for app.* imports, project root for future flexibility
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(project_root, 'backend')

sys.path.insert(0, backend_dir)
sys.path.insert(0, project_root)

# Import the FastAPI application with error handling
try:
    from app.main import app
except Exception as e:
    # Create a fallback app that shows the error
    async def app(scope, receive, send):
        error_msg = f"Import Error: {str(e)}".encode()
        await send({
            'type': 'http.response.start',
            'status': 500,
            'headers': [[b'content-type', b'text/plain']],
        })
        await send({
            'type': 'http.response.body',
            'body': error_msg,
        })
