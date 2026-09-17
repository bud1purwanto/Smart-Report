import time
from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.saved_query import SavedQuery
from app.models.server_profile import SapServerProfile
from app.models.variant import ReportVariant
from app.schemas.query import (
    SavedQueryCreate, SavedQueryUpdate, SavedQueryResponse,
    QueryExecuteRequest, QueryExecuteResponse, QueryDefinition
)
from app.services.sap_rfc import sap_gateway
from app.services.pandas_engine import pandas_engine
from app.services.abap_validator import abap_validator

router = APIRouter(prefix="/queries", tags=["Queries"])

@router.post("", response_model=SavedQueryResponse)
def create_query(data: SavedQueryCreate, db: Session = Depends(get_db)):
    val = abap_validator.validate_and_generate_sql(data.query_json)
    record = SavedQuery(
        name=data.name,
        description=data.description,
        query_json=data.query_json.model_dump(),
        abap_sql_preview=val.get("open_sql"),
        created_by=data.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("", response_model=List[SavedQueryResponse])
def list_queries(db: Session = Depends(get_db)):
    return db.query(SavedQuery).order_by(SavedQuery.updated_at.desc()).all()

@router.get("/{query_id}", response_model=SavedQueryResponse)
def get_query(query_id: int, db: Session = Depends(get_db)):
    record = db.query(SavedQuery).filter(SavedQuery.id == query_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Saved query not found")
    return record

@router.put("/{query_id}", response_model=SavedQueryResponse)
def update_query(query_id: int, data: SavedQueryUpdate, db: Session = Depends(get_db)):
    record = db.query(SavedQuery).filter(SavedQuery.id == query_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Saved query not found")
    if data.name is not None:
        record.name = data.name
    if data.description is not None:
        record.description = data.description
    if data.query_json is not None:
        record.query_json = data.query_json.model_dump()
        val = abap_validator.validate_and_generate_sql(data.query_json)
        record.abap_sql_preview = val.get("open_sql")
    db.commit()
    db.refresh(record)
    return record

@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_query(query_id: int, db: Session = Depends(get_db)):
    record = db.query(SavedQuery).filter(SavedQuery.id == query_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Saved query not found")
    db.delete(record)
    db.commit()
    return None

@router.post("/validate")
def validate_query(query: QueryDefinition):
    """Validates join logic and generates ABAP Open SQL preview."""
    return abap_validator.validate_and_generate_sql(query)

@router.post("/execute", response_model=QueryExecuteResponse)
async def execute_query(req: QueryExecuteRequest, db: Session = Depends(get_db)):
    """
    Executes visual query against SAP server, executes join logic,
    evaluates custom column formulas, applies anonymization/deduplication,
    and returns AG Grid compatible columns and rows.
    """
    start_time = time.time()
    query = req.query

    # Validate joins first (Rule 1 & Smart Validator)
    val = abap_validator.validate_and_generate_sql(query)
    if not val["is_valid"]:
        raise HTTPException(status_code=400, detail={"validation_errors": val["errors"]})

    # Resolve server profile
    server = None
    if req.server_id:
        server = db.query(SapServerProfile).filter(SapServerProfile.id == req.server_id).first()
    elif req.server_name:
        server = db.query(SapServerProfile).filter(SapServerProfile.name == req.server_name).first()
    if not server:
        # Default to first active server
        server = db.query(SapServerProfile).filter(SapServerProfile.is_active == True).first()
    if not server:
        raise HTTPException(status_code=400, detail="No active SAP server profile available.")

    tables = query.tables
    joins = query.joins
    selected_fields = query.selectedFields
    filters = query.filters
    rowcount = (query.options or {}).get("rowcount", 100)

    # Primary table execution
    primary_table = tables[0].table
    # Extract fields for primary table
    primary_fields = [sf.field for sf in selected_fields if sf.table == primary_table]
    # Ensure join fields from primary table are included
    for j in joins:
        src_tbl = next((t.table for t in tables if t.id == j.sourceTableId), "")
        tgt_tbl = next((t.table for t in tables if t.id == j.targetTableId), "")
        if src_tbl == primary_table and j.sourceField not in primary_fields:
            primary_fields.append(j.sourceField)
        if tgt_tbl == primary_table and j.targetField not in primary_fields:
            primary_fields.append(j.targetField)

    # Build primary where clause
    where_clauses = []
    for flt in filters:
        parts = flt.field.split(".")
        tbl_part = parts[0] if len(parts) > 1 else primary_table
        fld_part = parts[1] if len(parts) > 1 else parts[0]
        if tbl_part.upper() == primary_table.upper():
            if flt.operator.upper() == "EQ":
                where_clauses.append(f"{fld_part} = '{flt.value}'")
            elif flt.operator.upper() == "LIKE":
                where_clauses.append(f"{fld_part} LIKE '{flt.value}'")

    res_primary = await sap_gateway.read_table(
        server_profile=server,
        table=primary_table,
        fields=primary_fields if primary_fields else None,
        where=where_clauses,
        rowcount=rowcount
    )

    df = pd.DataFrame(res_primary.get("rows", []))

    # If secondary tables exist in query, fetch and merge using Pandas
    if len(tables) > 1 and not df.empty:
        for t in tables[1:]:
            sec_table = t.table
            sec_fields = [sf.field for sf in selected_fields if sf.table == sec_table]
            # Find join matching this table
            join_cond = next((j for j in joins if j.sourceTableId == t.id or j.targetTableId == t.id), None)
            if join_cond:
                if join_cond.sourceTableId == t.id:
                    sec_join_field = join_cond.sourceField
                    prim_join_field = join_cond.targetField
                else:
                    sec_join_field = join_cond.targetField
                    prim_join_field = join_cond.sourceField

                if sec_join_field not in sec_fields:
                    sec_fields.append(sec_join_field)

                # Filter secondary table using keys from primary if feasible
                sec_where = []
                if prim_join_field in df.columns:
                    unique_vals = [str(v) for v in df[prim_join_field].dropna().unique()][:25]
                    if unique_vals:
                        cond = " OR ".join([f"{sec_join_field} = '{v}'" for v in unique_vals])
                        sec_where.append(cond)

                res_sec = await sap_gateway.read_table(
                    server_profile=server,
                    table=sec_table,
                    fields=sec_fields if sec_fields else None,
                    where=sec_where,
                    rowcount=rowcount * 2
                )
                df_sec = pd.DataFrame(res_sec.get("rows", []))
                if not df_sec.empty:
                    how_type = "left" if "LEFT" in (join_cond.joinType or "").upper() else "inner"
                    df = pd.merge(
                        df, df_sec,
                        left_on=prim_join_field,
                        right_on=sec_join_field,
                        how=how_type,
                        suffixes=('', f'_{sec_table}')
                    )

    # Apply variant custom columns if specified
    if req.apply_variant_id:
        variant = db.query(ReportVariant).filter(ReportVariant.id == req.apply_variant_id).first()
        if variant and variant.custom_columns:
            df = pandas_engine.apply_custom_formulas(df, variant.custom_columns)

    # Apply deduplication and anonymization
    if req.deduplicate:
        df = pandas_engine.deduplicate(df)
    if req.anonymize:
        df = pandas_engine.anonymize(df)

    execution_time_ms = round((time.time() - start_time) * 1000, 2)

    # Prepare AG Grid column defs
    columns = list(df.columns)
    column_defs = []
    for col in columns:
        # Match field alias/datatype if present
        sf_match = next((sf for sf in selected_fields if sf.field == col or sf.alias == col), None)
        header_name = sf_match.alias if sf_match and sf_match.alias else col
        column_defs.append({
            "field": col,
            "headerName": header_name,
            "sortable": True,
            "filter": True,
            "resizable": True
        })

    rows = df.fillna("").to_dict(orient="records")

    return QueryExecuteResponse(
        columns=columns,
        column_defs=column_defs,
        rows=rows,
        total_rows=len(rows),
        execution_time_ms=execution_time_ms,
        server_info={
            "id": server.id,
            "name": server.name,
            "sid": server.sid,
            "environment": server.environment
        },
        abap_sql=val.get("open_sql")
    )

@router.post("/export")
async def export_query_results(
    req: QueryExecuteRequest,
    db: Session = Depends(get_db)
):
    """
    Exports visual query data directly to styled Excel (.xlsx).
    Strictly applies anonymization (Rule 4) and deduplication.
    """
    exec_res = await execute_query(req, db)
    df = pd.DataFrame(exec_res.rows)
    excel_bytes = pandas_engine.export_to_excel(
        df=df,
        title="Smart_SQVI_Report",
        anonymize=req.anonymize, # Rule 4 enforcement
        deduplicate=req.deduplicate
    )
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Smart_SQVI_Export.xlsx"}
    )

