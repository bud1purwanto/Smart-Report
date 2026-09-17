import json
import logging
import re
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("smart_sqvi.ai_prompt")

SAP_METADATA_CONTEXT = """
Daftar Tabel dan Relasi SAP Umum:
1. EKKO (Header PO) & EKPO (Item PO): Relasi pada EBELN (Nomor PO).
   - EKKO fields: EBELN, BUKRS, BSTYP, BSART, LIFNR, EKORG, EKGRP, WAERS, BEDAT.
   - EKPO fields: EBELN, EBELP, MATNR, WERKS, LGORT, MENGE, MEINS, NETPR, NETWR, TXZ01.
2. LFA1 (Vendor Master): Relasi dengan EKKO pada LIFNR.
   - LFA1 fields: LIFNR, NAME1, ORT01, LAND1, STCD1, BANKN.
3. MARA (Material General) & MAKT (Material Text) & MARC (Plant Data):
   - Relasi pada MATNR (Nomor Material).
   - MARA fields: MATNR, MTART, MATKL, MEINS, BRGEW, NTGEW.
   - MAKT fields: MATNR, SPRAS, MAKTX.
   - MARC fields: MATNR, WERKS, EKGRP, DISPO.
4. VBAK (Sales Order Header) & VBAP (Sales Order Item): Relasi pada VBELN.
   - VBAK fields: VBELN, ERDAT, AUART, VKORG, VTWEG, KUNNR, NETWR.
   - VBAP fields: VBELN, POSNR, MATNR, KWMENG, NETPR, NETWR.
5. KNA1 (Customer Master): Relasi dengan VBAK pada KUNNR.
   - KNA1 fields: KUNNR, NAME1, ORT01, LAND1, STCD1.
"""

SYSTEM_PROMPT = f"""
Anda adalah AI Query Specialist untuk SAP SQVI (Smart Report Builder).
Tugas Anda: Terjemahkan permintaan bahasa natural pengguna menjadi susunan query visual (tabel, join, field, dan filter).

{SAP_METADATA_CONTEXT}

Format jawaban WAJIB HANYA berupa JSON valid dengan skema berikut:
{{
  "tables": [
    {{"id": "t1", "table": "EKKO", "position": {{"x": 60, "y": 80}}}},
    {{"id": "t2", "table": "EKPO", "position": {{"x": 420, "y": 80}}}}
  ],
  "joins": [
    {{"id": "j1", "sourceTableId": "t1", "targetTableId": "t2", "sourceField": "EBELN", "targetField": "EBELN", "joinType": "INNER"}}
  ],
  "selectedFields": [
    {{"tableId": "t1", "table": "EKKO", "field": "EBELN", "alias": "PO_Number", "datatype": "CHAR", "isKey": true}},
    {{"tableId": "t1", "table": "EKKO", "field": "LIFNR", "alias": "Vendor", "datatype": "CHAR", "isKey": false}},
    {{"tableId": "t2", "table": "EKPO", "field": "EBELP", "alias": "Item", "datatype": "NUMC", "isKey": true}},
    {{"tableId": "t2", "table": "EKPO", "field": "MATNR", "alias": "Material", "datatype": "CHAR", "isKey": false}},
    {{"tableId": "t2", "table": "EKPO", "field": "MENGE", "alias": "Quantity", "datatype": "QUAN", "isKey": false}},
    {{"tableId": "t2", "table": "EKPO", "field": "NETPR", "alias": "Net_Price", "datatype": "CURR", "isKey": false}}
  ],
  "filters": [
    {{"field": "EKKO.BSART", "operator": "EQ", "value": "NB"}}
  ],
  "explanation": "Penjelasan singkat mengenai tabel dan relasi yang dibuat."
}}
Hanya kembalikan objek JSON murni, jangan sertakan markdown ```json di luar objek.
"""

class AiPromptService:
    def __init__(self):
        self.ollama_url = settings.OLLAMA_BASE_URL
        self.ollama_model = settings.OLLAMA_MODEL
        self.openai_key = settings.OPENAI_API_KEY

    async def translate_prompt_to_query(self, user_prompt: str) -> Dict[str, Any]:
        """
        Translates natural language text to query canvas graph.
        Prioritizes local Ollama, falls back to OpenAI if configured, or smart heuristic parser.
        """
        # 1. Try Ollama (Local LLM)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.ollama_model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ],
                        "stream": False,
                        "options": {"temperature": 0.1}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("message", {}).get("content", "")
                    parsed = self._extract_json(content)
                    if parsed and "tables" in parsed:
                        return parsed
        except Exception as e:
            logger.warning(f"Ollama translation failed: {e}. Attempting fallback...")

        # 2. Try OpenAI API if key exists
        if self.openai_key:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {self.openai_key}"},
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {"role": "system", "content": SYSTEM_PROMPT},
                                {"role": "user", "content": user_prompt}
                            ],
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        content = data["choices"][0]["message"]["content"]
                        parsed = json.loads(content)
                        if parsed and "tables" in parsed:
                            return parsed
            except Exception as e:
                logger.warning(f"OpenAI fallback failed: {e}")

        # 3. Smart Heuristic Fallback
        return self._heuristic_fallback(user_prompt)

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        # Remove code blocks if present
        text = text.strip()
        text = re.sub(r"^```json\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"^```\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"```$", "", text, flags=re.MULTILINE)
        try:
            return json.loads(text)
        except Exception:
            # Match outermost JSON braces
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
        return None

    def _heuristic_fallback(self, prompt: str) -> Dict[str, Any]:
        p = prompt.upper()
        # PO query heuristic
        if "PO" in p or "PURCHAS" in p or "EKKO" in p:
            return {
                "tables": [
                    {"id": "t1", "table": "EKKO", "position": {"x": 50, "y": 80}},
                    {"id": "t2", "table": "EKPO", "position": {"x": 400, "y": 80}}
                ],
                "joins": [
                    {"id": "j1", "sourceTableId": "t1", "targetTableId": "t2", "sourceField": "EBELN", "targetField": "EBELN", "joinType": "INNER"}
                ],
                "selectedFields": [
                    {"tableId": "t1", "table": "EKKO", "field": "EBELN", "alias": "PO_Number", "datatype": "CHAR", "isKey": True},
                    {"tableId": "t1", "table": "EKKO", "field": "BUKRS", "alias": "Company_Code", "datatype": "CHAR", "isKey": False},
                    {"tableId": "t1", "table": "EKKO", "field": "LIFNR", "alias": "Vendor", "datatype": "CHAR", "isKey": False},
                    {"tableId": "t2", "table": "EKPO", "field": "EBELP", "alias": "Item", "datatype": "NUMC", "isKey": True},
                    {"tableId": "t2", "table": "EKPO", "field": "MATNR", "alias": "Material", "datatype": "CHAR", "isKey": False},
                    {"tableId": "t2", "table": "EKPO", "field": "MENGE", "alias": "Quantity", "datatype": "QUAN", "isKey": False},
                    {"tableId": "t2", "table": "EKPO", "field": "NETPR", "alias": "Net_Price", "datatype": "CURR", "isKey": False}
                ],
                "filters": [],
                "explanation": "Deteksi otomatis untuk analisa Purchasing Order (EKKO dan EKPO)."
            }
        
        # Sales Order heuristic
        if "SO" in p or "SALES" in p or "VBAK" in p:
            return {
                "tables": [
                    {"id": "t1", "table": "VBAK", "position": {"x": 50, "y": 80}},
                    {"id": "t2", "table": "VBAP", "position": {"x": 400, "y": 80}}
                ],
                "joins": [
                    {"id": "j1", "sourceTableId": "t1", "targetTableId": "t2", "sourceField": "VBELN", "targetField": "VBELN", "joinType": "INNER"}
                ],
                "selectedFields": [
                    {"tableId": "t1", "table": "VBAK", "field": "VBELN", "alias": "Sales_Order", "datatype": "CHAR", "isKey": True},
                    {"tableId": "t1", "table": "VBAK", "field": "KUNNR", "alias": "Customer", "datatype": "CHAR", "isKey": False},
                    {"tableId": "t2", "table": "VBAP", "field": "POSNR", "alias": "Item", "datatype": "NUMC", "isKey": True},
                    {"tableId": "t2", "table": "VBAP", "field": "MATNR", "alias": "Material", "datatype": "CHAR", "isKey": False},
                    {"tableId": "t2", "table": "VBAP", "field": "KWMENG", "alias": "Order_Qty", "datatype": "QUAN", "isKey": False},
                    {"tableId": "t2", "table": "VBAP", "field": "NETWR", "alias": "Net_Value", "datatype": "CURR", "isKey": False}
                ],
                "filters": [],
                "explanation": "Deteksi otomatis untuk Sales Order (VBAK dan VBAP)."
            }

        # Material master heuristic
        return {
            "tables": [
                {"id": "t1", "table": "MARA", "position": {"x": 50, "y": 80}},
                {"id": "t2", "table": "MAKT", "position": {"x": 400, "y": 80}}
            ],
            "joins": [
                {"id": "j1", "sourceTableId": "t1", "targetTableId": "t2", "sourceField": "MATNR", "targetField": "MATNR", "joinType": "INNER"}
            ],
            "selectedFields": [
                {"tableId": "t1", "table": "MARA", "field": "MATNR", "alias": "Material", "datatype": "CHAR", "isKey": True},
                {"tableId": "t1", "table": "MARA", "field": "MTART", "alias": "Type", "datatype": "CHAR", "isKey": False},
                {"tableId": "t2", "table": "MAKT", "field": "MAKTX", "alias": "Description", "datatype": "CHAR", "isKey": False}
            ],
            "filters": [],
            "explanation": "Deteksi otomatis untuk Material Master (MARA dan MAKT)."
        }

ai_prompt_service = AiPromptService()

