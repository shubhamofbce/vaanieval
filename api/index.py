"""ASGI handler for Vercel serverless functions."""

# Minimal ASGI 3.0 app for testing
async def app(scope, receive, send):
    if scope['type'] == 'http':
        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [[b'content-type', b'text/plain']],
        })
        await send({
            'type': 'http.response.body',
            'body': b'Hello from Vercel ASGI!',
        })
