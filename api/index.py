"""
Vercel serverless entry: forwards /api/* to FastAPI app with path stripped to /*.
"""
from backend.main import app as fastapi_app


async def strip_api_prefix(scope, receive, send):
    if scope.get("type") == "http" and scope.get("path", "").startswith("/api"):
        path = scope["path"][4:] or "/"
        scope = dict(scope)
        scope["path"] = path
    await fastapi_app(scope, receive, send)


app = strip_api_prefix
