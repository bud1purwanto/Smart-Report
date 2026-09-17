import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings
from app.core.security import decrypt_password

logger = logging.getLogger("smart_sqvi.sap_rfc")

class SapGatewayClient:
    def __init__(self):
        self.gateway_url = settings.SAP_GATEWAY_URL
        self.gateway_token = settings.SAP_GATEWAY_TOKEN

    def _get_headers(self, server_profile) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.gateway_token}",
            "Content-Type": "application/json"
        }
        if server_profile:
            headers["X-SAP-User"] = server_profile.username
            raw_password = decrypt_password(server_profile.encrypted_password)
            headers["X-SAP-Password"] = raw_password
            if server_profile.client:
                headers["X-SAP-Client"] = str(server_profile.client)
        return headers

    async def _call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any], server_profile=None) -> Dict[str, Any]:
        headers = self._get_headers(server_profile)
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            try:
                response = await client.post(self.gateway_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                if "error" in data:
                    err_msg = data["error"].get("message", str(data["error"]))
                    raise RuntimeError(f"SAP MCP Error: {err_msg}")
                result = data.get("result", {})
                content = result.get("content", [])
                if content and isinstance(content, list) and len(content) > 0:
                    text = content[0].get("text", "")
                    try:
                        parsed = json.loads(text)
                        if isinstance(parsed, dict) and parsed.get("error"):
                            raise RuntimeError(f"SAP Error: {parsed['error']}")
                        return parsed
                    except json.JSONDecodeError:
                        return {"raw_text": text}
                return result
            except httpx.HTTPError as exc:
                logger.error(f"HTTP error calling SAP gateway: {exc}")
                raise RuntimeError(f"Gateway connection error: {str(exc)}")

    async def test_server_connection(self, server_profile) -> Dict[str, Any]:
        """Calls get_system_info for the specified server profile."""
        try:
            res = await self._call_mcp_tool(
                tool_name="sap-leader-mcp__get_system_info",
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
        """
        Reads SAP table. If requested fields list is large, chunks it to avoid the 512-byte RFC_READ_TABLE limit.
        """
        table_name = table.upper()
        clean_where = where or []
        if isinstance(clean_where, str):
            clean_where = [clean_where]

        # Single read if fields <= 10 or empty
        if not fields or len(fields) <= 12:
            return await self._call_mcp_tool(
                tool_name="sap-leader-mcp__read_table",
                arguments={
                    "table": table_name,
                    "fields": fields or [],
                    "where": clean_where,
                    "rowcount": rowcount,
                    "server": server_profile.name if server_profile else None
                },
                server_profile=server_profile
            )

        # Large field count: chunk fields into chunks of 10
        chunk_size = 10
        chunks = [fields[i:i + chunk_size] for i in range(0, len(fields), chunk_size)]
        
        chunk_tasks = []
        for ch in chunks:
            chunk_tasks.append(
                self._call_mcp_tool(
                    tool_name="sap-leader-mcp__read_table",
                    arguments={
                        "table": table_name,
                        "fields": ch,
                        "where": clean_where,
                        "rowcount": rowcount,
                        "server": server_profile.name if server_profile else None
                    },
                    server_profile=server_profile
                )
            )

        # Parallel chunk fetching
        chunk_results = await asyncio.gather(*chunk_tasks, return_exceptions=True)
        
        merged_rows = []
        all_fields = []
        for idx, res in enumerate(chunk_results):
            if isinstance(res, Exception):
                logger.error(f"Error fetching chunk {idx} of table {table_name}: {res}")
                continue
            if not isinstance(res, dict):
                continue
            res_fields = res.get("fields", [])
            for f in res_fields:
                if f not in all_fields:
                    all_fields.append(f)
            res_rows = res.get("rows", [])
            if not merged_rows:
                merged_rows = res_rows
            else:
                for i, r in enumerate(res_rows):
                    if i < len(merged_rows):
                        merged_rows[i].update(r)

        return {
            "mode": "LIVE",
            "active_server": server_profile.name if server_profile else None,
            "sid": server_profile.sid if server_profile else None,
            "tool": "read_table",
            "table": table_name,
            "row_count": len(merged_rows),
            "fields": all_fields,
            "rows": merged_rows
        }

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

