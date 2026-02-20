"""
Vercel serverless entry: /api/* is rewritten to /api/index?path=<rest>.
We set scope["path"] from the path query param so FastAPI sees /analyze, etc.
"""
from urllib.parse import parse_qs, unquote
from backend.main import app as fastapi_app


async def handler(scope, receive, send):
    if scope.get("type") == "http":
        scope = dict(scope)
        query_string = scope.get("query_string", b"").decode("latin-1")
        params = parse_qs(query_string)
        path_list = params.get("path", [])
        if path_list:
            raw = unquote(path_list[0].strip())
            scope["path"] = "/" + raw if raw and not raw.startswith("/") else (raw or "/")
            scope["query_string"] = b""
        else:
            scope["path"] = "/"
    await fastapi_app(scope, receive, send)


app = handler
