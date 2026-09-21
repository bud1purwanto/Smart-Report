import re
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from datetime import datetime

class TableNodeItem(BaseModel):
    id: str
    table: str
    alias: Optional[str] = None
    position: Optional[Dict[str, float]] = None

    @field_validator("table")
    @classmethod
    def validate_table_name(cls, value: str):
        normalized = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9_/]{1,40}", normalized):
            raise ValueError("Invalid SAP table identifier")
        return normalized

class JoinItem(BaseModel):
    id: Optional[str] = None
    sourceTableId: str
    targetTableId: str
    sourceField: str
    targetField: str
    joinType: Literal["INNER", "LEFT OUTER"] = "INNER"

class FieldSelectionItem(BaseModel):
    tableId: str
    table: str
    field: str
    alias: Optional[str] = None
    datatype: Optional[str] = None
    isKey: Optional[bool] = False
    fieldtext: Optional[str] = None

class FilterItem(BaseModel):
    field: str # e.g. "EKKO.BSART"
    fieldtext: Optional[str] = None
    operator: Literal["EQ", "NE", "GT", "LT", "GE", "LE", "LIKE", "IN", "BETWEEN"] = "EQ"
    value: Any
    valueTo: Optional[Any] = None

    @field_validator("field")
    @classmethod
    def validate_field_name(cls, value: str):
        normalized = value.strip().upper()
        if not re.fullmatch(r"(?:[A-Z0-9_/]{1,40}\.)?[A-Z0-9_]{1,40}", normalized):
            raise ValueError("Invalid SAP field identifier")
        return normalized

class QueryDefinition(BaseModel):
    tables: List[TableNodeItem] = Field(default_factory=list)
    joins: List[JoinItem] = Field(default_factory=list)
    selectedFields: List[FieldSelectionItem] = Field(default_factory=list)
    filters: List[FilterItem] = Field(default_factory=list)
    customColumns: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    pivotConfig: Optional[Dict[str, Any]] = None
    anonymize: Optional[bool] = False
    deduplicate: Optional[bool] = False
    options: Optional[Dict[str, Any]] = Field(default_factory=lambda: {"rowcount": 100})

    @model_validator(mode="after")
    def validate_execution_limits(self):
        rowcount = (self.options or {}).get("rowcount", 100)
        if isinstance(rowcount, bool) or not isinstance(rowcount, int) or not 1 <= rowcount <= 10_000:
            raise ValueError("rowcount must be an integer between 1 and 10000")
        return self

class SavedQueryBase(BaseModel):
    name: str
    description: Optional[str] = None
    query_json: QueryDefinition
    abap_sql_preview: Optional[str] = None
    created_by: Optional[str] = "abap_user"

class SavedQueryCreate(SavedQueryBase):
    pass

class SavedQueryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    query_json: Optional[QueryDefinition] = None
    abap_sql_preview: Optional[str] = None

class SavedQueryResponse(SavedQueryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QueryExecuteRequest(BaseModel):
    server_id: Optional[int] = None
    server_name: Optional[str] = None
    query: QueryDefinition
    apply_variant_id: Optional[int] = None
    anonymize: bool = False
    deduplicate: bool = False

class QueryExecuteResponse(BaseModel):
    columns: List[str]
    column_defs: List[Dict[str, Any]]
    rows: List[Dict[str, Any]]
    total_rows: int
    execution_time_ms: float
    server_info: Dict[str, Any]
    abap_sql: Optional[str] = None
