from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.schemas.query import QueryDefinition

class CompareRequest(BaseModel):
    server_a_id: int
    server_b_id: int
    query: QueryDefinition
    key_fields: Optional[List[str]] = None # Key fields to align rows (default: detected PKs)
    rowcount: int = 200

class FieldDiff(BaseModel):
    old_val: Any
    new_val: Any

class RowDiff(BaseModel):
    diff_status: str # "IDENTICAL", "MODIFIED", "ADDED_IN_B", "DELETED_IN_B"
    key_value: str
    data_a: Optional[Dict[str, Any]] = None
    data_b: Optional[Dict[str, Any]] = None
    changed_fields: Dict[str, FieldDiff] = {}

class CompareSummary(BaseModel):
    server_a_name: str
    server_b_name: str
    total_a: int
    total_b: int
    identical_count: int
    modified_count: int
    added_count: int
    deleted_count: int

class CompareResponse(BaseModel):
    summary: CompareSummary
    columns: List[str]
    diff_rows: List[RowDiff]
    execution_time_ms: float

