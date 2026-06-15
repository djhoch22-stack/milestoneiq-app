"""Standalone MCP client for the Robinhood trading server (Path B execution).

This lets the bot call the Robinhood order tools from a plain Python process
(cron/launchd) with no Claude session involved — the execution path is
deterministic code, not an LLM.

It authenticates with its OWN OAuth flow (independent of the token Claude Code
stored). The first call opens your browser once to authorize; the tokens are
cached under data/mcp_tokens.json and refreshed automatically afterward, so
scheduled runs are non-interactive.

⚠️ This module could not be tested in the environment it was written in (no
Robinhood network access there). Validate it on your machine with the staged
gates in the README: `--review-only` first (places nothing), then one tiny
real order, before unattended use.

Requires:  pip install "mcp>=1.2"
"""
from __future__ import annotations

import asyncio
import json
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    from mcp import ClientSession
    from mcp.client.auth import OAuthClientProvider, TokenStorage
    from mcp.client.streamable_http import streamablehttp_client
    from mcp.shared.auth import (
        OAuthClientInformationFull,
        OAuthClientMetadata,
        OAuthToken,
    )
    _MCP_AVAILABLE = True
except Exception:  # pragma: no cover - import guarded so dry-run needs no mcp dep
    _MCP_AVAILABLE = False


CALLBACK_PORT = 41789
CALLBACK_PATH = "/callback"


class _FileTokenStorage(TokenStorage):
    """Persists OAuth tokens + dynamic client registration to a JSON file."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _read(self) -> dict:
        if self.path.exists():
            return json.loads(self.path.read_text())
        return {}

    def _write(self, data: dict) -> None:
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2))
        tmp.replace(self.path)

    async def get_tokens(self) -> "OAuthToken | None":
        raw = self._read().get("tokens")
        return OAuthToken(**raw) if raw else None

    async def set_tokens(self, tokens: "OAuthToken") -> None:
        data = self._read()
        data["tokens"] = tokens.model_dump(mode="json")
        self._write(data)

    async def get_client_info(self) -> "OAuthClientInformationFull | None":
        raw = self._read().get("client_info")
        return OAuthClientInformationFull(**raw) if raw else None

    async def set_client_info(self, info: "OAuthClientInformationFull") -> None:
        data = self._read()
        data["client_info"] = info.model_dump(mode="json")
        self._write(data)


def _wait_for_callback() -> tuple[str, str | None]:
    """Run a one-shot localhost server to capture the OAuth redirect."""
    result: dict[str, str | None] = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            qs = parse_qs(urlparse(self.path).query)
            result["code"] = qs.get("code", [None])[0]
            result["state"] = qs.get("state", [None])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h3>Authorized. You can close this tab.</h3>")

        def log_message(self, *_):  # silence the default logging
            pass

    server = HTTPServer(("localhost", CALLBACK_PORT), Handler)
    server.handle_request()  # blocks until the single redirect arrives
    server.server_close()
    if not result.get("code"):
        raise RuntimeError("OAuth callback did not include an authorization code")
    return result["code"], result.get("state")


class RobinhoodMCP:
    """Synchronous facade: call_tool(name, args) -> parsed JSON result.

    A fresh session is opened per call. After the first (interactive) auth the
    cached token makes reconnects fast and non-interactive.
    """

    def __init__(self, url: str, token_file: Path):
        if not _MCP_AVAILABLE:
            raise RuntimeError(
                "The 'mcp' package is not installed. Run: pip install 'mcp>=1.2'"
            )
        self.url = url
        self.storage = _FileTokenStorage(token_file)

    def _provider(self) -> "OAuthClientProvider":
        async def redirect_handler(authorization_url: str) -> None:
            print(f"\n  Opening browser to authorize Robinhood:\n    {authorization_url}\n")
            webbrowser.open(authorization_url)

        async def callback_handler() -> tuple[str, str | None]:
            # Runs the blocking localhost server in a thread so the event loop
            # stays responsive.
            return await asyncio.to_thread(_wait_for_callback)

        return OAuthClientProvider(
            server_url=self.url,
            client_metadata=OAuthClientMetadata(
                client_name="momentum-trading-bot",
                redirect_uris=[f"http://localhost:{CALLBACK_PORT}{CALLBACK_PATH}"],
                grant_types=["authorization_code", "refresh_token"],
                response_types=["code"],
            ),
            storage=self.storage,
            redirect_handler=redirect_handler,
            callback_handler=callback_handler,
        )

    async def _call_async(self, name: str, arguments: dict) -> dict:
        async with streamablehttp_client(self.url, auth=self._provider()) as (r, w, _):
            async with ClientSession(r, w) as session:
                await session.initialize()
                result = await session.call_tool(name, arguments=arguments)
                return self._parse(result)

    async def _list_tools_async(self) -> list[dict]:
        async with streamablehttp_client(self.url, auth=self._provider()) as (r, w, _):
            async with ClientSession(r, w) as session:
                await session.initialize()
                tools = await session.list_tools()
                return [{
                    "name": t.name,
                    "description": (t.description or "").strip(),
                    "required": (t.inputSchema or {}).get("required", []),
                    "properties": list(((t.inputSchema or {}).get("properties") or {})),
                } for t in tools.tools]

    def list_tools(self) -> list[dict]:
        return asyncio.run(self._list_tools_async())

    @staticmethod
    def _parse(result) -> dict:
        """Extract the tool's JSON payload from an MCP CallToolResult.

        MCP returns content blocks; trading tools return JSON text. We return
        structuredContent when present, else parse the first text block, else
        return the raw text under {"_text": ...} so nothing is lost. The result's
        isError flag is always propagated so the caller can detect failures —
        error bodies (e.g. "API error 400: ...") are not valid JSON and surface
        as {"_text": ..., "isError": ...}.
        """
        is_error = bool(getattr(result, "isError", False))
        sc = getattr(result, "structuredContent", None)
        if sc:
            out = dict(sc)
            out.setdefault("isError", is_error)
            return out
        for block in getattr(result, "content", []) or []:
            text = getattr(block, "text", None)
            if text:
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    return {"_text": text, "isError": is_error}
                if isinstance(parsed, dict):
                    parsed.setdefault("isError", is_error)
                    return parsed
                return {"data": parsed, "isError": is_error}
        return {"_raw": str(result), "isError": is_error}

    def call_tool(self, name: str, arguments: dict) -> dict:
        return asyncio.run(self._call_async(name, arguments))
