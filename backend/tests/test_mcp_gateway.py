from types import SimpleNamespace

import httpx
import pytest

from app.core.security import encrypt_password
from app.services.mcp_gateway import McpGateway, McpGatewayError


@pytest.mark.asyncio
async def test_gateway_sends_dynamic_credentials_and_correlation_id():
    captured = {}

    def handler(request: httpx.Request):
        captured["headers"] = request.headers
        return httpx.Response(
            200,
            json={"result": {"content": [{"type": "text", "text": '{"rows": [{"MATNR": "1"}]}'}]}},
        )

    profile = SimpleNamespace(
        username="SAPUSER",
        encrypted_password=encrypt_password("secret"),
        client="100",
    )
    gateway = McpGateway(
        gateway_url="https://mcp.internal/gateway",
        gateway_token="token",
        transport=httpx.MockTransport(handler),
    )

    result = await gateway.call("custom_read", {"table": "MARA"}, profile, "corr-123")

    assert result["rows"] == [{"MATNR": "1"}]
    assert captured["headers"]["x-correlation-id"] == "corr-123"
    assert captured["headers"]["x-sap-user"] == "SAPUSER"
    assert captured["headers"]["x-sap-password"] == "secret"


@pytest.mark.asyncio
async def test_gateway_normalizes_remote_mcp_errors():
    def handler(_request: httpx.Request):
        return httpx.Response(200, json={"error": {"code": -32000, "message": "SAP unavailable"}})

    gateway = McpGateway(
        gateway_url="https://mcp.internal/gateway",
        gateway_token="token",
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(McpGatewayError) as exc:
        await gateway.call("custom_read", {}, None, "corr-456")

    assert exc.value.code == "MCP_REMOTE_ERROR"
    assert exc.value.correlation_id == "corr-456"
    assert exc.value.retryable is False
