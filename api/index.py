"""ASGI handler for Vercel serverless functions."""

# Minimal test - just export a simple ASGI app
def app(scope):
    async def asgi(receive, send):
        if scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 200,
                'headers': [[b'content-type', b'text/plain']],
            })
            await send({
                'type': 'http.response.body',
                'body': b'Hello from Vercel!',
            })
    return asgi
