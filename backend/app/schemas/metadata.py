from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class TableFieldItem(BaseModel):
    tablename: str
    fieldname: str
    keyflag: str
    datatype: Optional[str]
    leng: Optional[int]
    rollname: Optional[str]
    fieldtext: Optional[str]
    checktable: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class TableSummary(BaseModel):
    tablename: str
    field_count: int
    key_fields: List[str]

class AutoJoinRule(BaseModel):
    source_table: str
    target_table: str
    source_field: str
    target_field: str
    confidence: float # 1.0 for checktable/DD08L, 0.9 for exact PK name match
    join_type: str = "INNER"
    description: str
