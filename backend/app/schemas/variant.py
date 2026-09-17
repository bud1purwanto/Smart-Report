from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class CustomColumnFormula(BaseModel):
    name: str
    formula: str # e.g. "row['NETPR'] * row['MENGE']" or "row.Quantity * row.Net_Price"
    datatype: Optional[str] = "number"

class VariantBase(BaseModel):
    name: str
    column_order: List[str] = []
    hidden_columns: List[str] = []
    filter_parameters: Dict[str, Any] = {}
    sort_parameters: List[Dict[str, Any]] = []
    custom_columns: List[CustomColumnFormula] = []
    is_default: bool = False

class VariantCreate(VariantBase):
    query_id: int

class VariantUpdate(BaseModel):
    name: Optional[str] = None
    column_order: Optional[List[str]] = None
    hidden_columns: Optional[List[str]] = None
    filter_parameters: Optional[Dict[str, Any]] = None
    sort_parameters: Optional[List[Dict[str, Any]]] = None
    custom_columns: Optional[List[CustomColumnFormula]] = None
    is_default: Optional[bool] = None

class VariantResponse(VariantBase):
    id: int
    query_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
