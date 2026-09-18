from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
from app.schemas.query import QueryDefinition

class CompareRequest(BaseModel):
    server_a_id: int
    server_b_id: int
    query: QueryDefinition
    key_fields: Optional[List[str]] = None # Key fields to align rows (default: detected PKs)
    rowcount: int = Field(default=200, ge=1, le=10_000)

    @model_validator(mode="after")
    def require_distinct_servers(self):
        if self.server_a_id == self.server_b_id:
            raise ValueError("Server A and Server B must be different")
        return self

class FieldDiff(BaseModel):
    old_val: Any
    new_val: Any

class RowDiff(BaseModel):
    diff_status: str # "IDENTICAL", "MODIFIED", "ADDED_IN_B", "DELETED_IN_B"
    key_value: str
    data_a: Optional[Dict[str, Any]] = None
    data_b: Optional[Dict[str, Any]] = None
    changed_fields: Dict[str, FieldDiff] = Field(default_factory=dict)

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
