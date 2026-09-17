from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class TableNodeItem(BaseModel):
    id: str
    table: str
    alias: Optional[str] = None
    position: Optional[Dict[str, float]] = None

class JoinItem(BaseModel):
    id: Optional[str] = None
    sourceTableId: str
    targetTableId: str
    sourceField: str
    targetField: str
    joinType: str = "INNER" # INNER, LEFT OUTER

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
    operator: str = "EQ" # EQ, NE, GT, LT, GE, LE, LIKE, IN, BETWEEN
    value: Any
    valueTo: Optional[Any] = None

class QueryDefinition(BaseModel):
    tables: List[TableNodeItem] = []
    joins: List[JoinItem] = []
    selectedFields: List[FieldSelectionItem] = []
    filters: List[FilterItem] = []
    options: Optional[Dict[str, Any]] = Field(default_factory=lambda: {"rowcount": 100})

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
