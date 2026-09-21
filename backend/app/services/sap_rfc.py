import asyncio
import logging
import uuid
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.mcp_gateway import McpGateway

logger = logging.getLogger("smart_sqvi.sap_rfc")

class SapGatewayClient:
    def __init__(self):
        self.gateway_url = settings.SAP_GATEWAY_URL
        self.gateway_token = settings.SAP_GATEWAY_TOKEN
        self.mcp = McpGateway(
            gateway_url=self.gateway_url,
            gateway_token=self.gateway_token,
            timeout_seconds=settings.SAP_MCP_TIMEOUT_SECONDS,
        )

    async def _call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any], server_profile=None) -> Dict[str, Any]:
        return await self.mcp.call(
            tool_name=tool_name,
            arguments=arguments,
            server_profile=server_profile,
            correlation_id=str(uuid.uuid4()),
        )

    async def test_server_connection(self, server_profile) -> Dict[str, Any]:
        """Calls get_system_info for the specified server profile."""
        try:
            res = await self._call_mcp_tool(
                tool_name=settings.SAP_MCP_SYSTEM_INFO_TOOL,
                arguments={"server": server_profile.name},
                server_profile=server_profile
            )
            return {
                "success": True,
                "mode": res.get("mode", "UNKNOWN"),
                "system_info": res.get("system_info", {}),
                "sid": res.get("sid", server_profile.sid)
            }
        except Exception as e:
            logger.warning(f"Connection test failed for {server_profile.name}: {e}")
            return {
                "success": False,
                "mode": "ERROR",
                "error": str(e)
            }

    async def read_table(
        self,
        server_profile,
        table: str,
        fields: Optional[List[str]] = None,
        where: Optional[List[str]] = None,
        rowcount: int = 100
    ) -> Dict[str, Any]:
        """Read a SAP table through the MCP Server's configured custom Function Module."""
        table_name = table.upper()
        clean_where = where or []
        if isinstance(clean_where, str):
            clean_where = [clean_where]

        return await self._call_mcp_tool(
            tool_name=settings.SAP_MCP_READ_TOOL,
            arguments={
                "table": table_name,
                "fields": fields or [],
                "where": clean_where,
                "rowcount": rowcount,
                "server": server_profile.name if server_profile else None,
            },
            server_profile=server_profile,
        )

    async def execute_multi_server_parallel(
        self,
        profiles_with_specs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Executes data retrieval from multiple SAP servers strictly in parallel using asyncio.gather.
        Rule 1 compliance: async def + non-blocking asyncio.gather.
        """
        tasks = []
        for item in profiles_with_specs:
            profile = item["profile"]
            table = item["table"]
            fields = item.get("fields", [])
            where = item.get("where", [])
            rowcount = item.get("rowcount", 100)
            tasks.append(self.read_table(profile, table, fields, where, rowcount))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        final_results = []
        for r in results:
            if isinstance(r, Exception):
                final_results.append({"error": str(r), "rows": [], "row_count": 0, "fields": []})
            else:
                final_results.append(r)
        return final_results

sap_gateway = SapGatewayClient()
