"""Typed JSON-RPC adapter for the existing SAP MCP Server."""

from __future__ import annotations

import json
from typing import Any, Dict

import httpx

from app.core.security import decrypt_password


class McpGatewayError(RuntimeError):
    def __init__(self, code: str, message: str, correlation_id: str, retryable: bool):
        super().__init__(message)
        self.code = code
        self.correlation_id = correlation_id
        self.retryable = retryable


class McpGateway:
    def __init__(
        self,
        gateway_url: str,
        gateway_token: str,
        timeout_seconds: float = 45.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.gateway_url = gateway_url
        self.gateway_token = gateway_token
        self.timeout_seconds = timeout_seconds
        self.transport = transport

    def _headers(self, server_profile: Any, correlation_id: str) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.gateway_token}",
            "Content-Type": "application/json",
            "X-Correlation-ID": correlation_id,
        }
        if server_profile is not None:
            headers["X-SAP-User"] = server_profile.username
            headers["X-SAP-Password"] = decrypt_password(server_profile.encrypted_password)
            if server_profile.client:
                headers["X-SAP-Client"] = str(server_profile.client)
        return headers

    async def call(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        server_profile: Any,
        correlation_id: str,
    ) -> Dict[str, Any]:
        payload = {
            "jsonrpc": "2.0",
            "id": correlation_id,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
        }
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                transport=self.transport,
            ) as client:
                response = await client.post(
                    self.gateway_url,
                    headers=self._headers(server_profile, correlation_id),
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise McpGatewayError("MCP_TIMEOUT", "SAP MCP request timed out", correlation_id, True) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise McpGatewayError("MCP_CONNECTION_ERROR", "SAP MCP connection failed", correlation_id, True) from exc

        if "error" in data:
            error = data["error"]
            message = error.get("message", "SAP MCP returned an error") if isinstance(error, dict) else str(error)
            raise McpGatewayError("MCP_REMOTE_ERROR", message, correlation_id, False)

        result = data.get("result", {})
        content = result.get("content", []) if isinstance(result, dict) else []
        if content and isinstance(content[0], dict):
            text = content[0].get("text", "")
            if text:
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError as exc:
                    raise McpGatewayError("MCP_INVALID_RESPONSE", "SAP MCP returned invalid JSON", correlation_id, False) from exc
                if isinstance(parsed, dict) and parsed.get("error"):
                    raise McpGatewayError("SAP_REMOTE_ERROR", str(parsed["error"]), correlation_id, False)
                if isinstance(parsed, dict):
                    return parsed
        if isinstance(result, dict):
            return result
        raise McpGatewayError("MCP_INVALID_RESPONSE", "SAP MCP returned an unsupported response", correlation_id, False)
