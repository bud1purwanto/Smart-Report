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
from app.models.metadata_sync import SapMetadataSync
from app.schemas.query import (
    SavedQueryCreate, SavedQueryUpdate, SavedQueryResponse,
    QueryExecuteRequest, QueryExecuteResponse, QueryDefinition
)
from app.services.sap_rfc import sap_gateway
from app.services.pandas_engine import pandas_engine
from app.services.abap_validator import abap_validator
from app.services.query_executor import fetch_query_dataset

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
        raise HTTPException(status_code=404, detail="Saved query not found.")
    return record

@router.put("/{query_id}", response_model=SavedQueryResponse)
def update_query(query_id: int, data: SavedQueryUpdate, db: Session = Depends(get_db)):
    record = db.query(SavedQuery).filter(SavedQuery.id == query_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Saved query not found.")
    if data.name is not None:
        record.name = data.name
    if data.description is not None:
        record.description = data.description
    if data.query_json is not None:
        val = abap_validator.validate_and_generate_sql(data.query_json)
        record.query_json = data.query_json.model_dump()
        record.abap_sql_preview = val.get("open_sql")
    db.commit()
    db.refresh(record)
    return record

@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_query(query_id: int, db: Session = Depends(get_db)):
    record = db.query(SavedQuery).filter(SavedQuery.id == query_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Saved query not found.")
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
        raise HTTPException(status_code=400, detail="Tidak ada profil server SAP yang aktif atau dipilih.")

    rowcount = (query.options or {}).get("rowcount", 100)

    try:
        df = await fetch_query_dataset(
            server_profile=server,
            query=query,
            rowcount=rowcount
        )
    except Exception as exc:
        err_msg = str(exc)
        raise HTTPException(
            status_code=500,
            detail=f"Gagal mengambil data dari server SAP {server.name} ({server.sid}): {err_msg}"
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
    selected_fields = query.selectedFields
    for col in columns:
        # Match field alias/datatype if present
        sf_match = next((sf for sf in selected_fields if sf.field.upper() == col.upper() or (sf.alias and sf.alias.upper() == col.upper())), None)
        desc = ""
        if sf_match:
            meta = db.query(SapMetadataSync).filter(
                SapMetadataSync.tablename == sf_match.table.upper(),
                SapMetadataSync.fieldname == sf_match.field.upper()
            ).first()
            if meta and meta.fieldtext and meta.fieldtext != meta.fieldname:
                desc = meta.fieldtext
            elif getattr(sf_match, "fieldtext", None):
                desc = sf_match.fieldtext

        if not desc:
            # Check if col is in format TABLE_FIELD or FIELD_TABLE
            if "_" in col:
                parts = col.split("_", 1)
                meta = db.query(SapMetadataSync).filter(
                    SapMetadataSync.tablename == parts[0].upper(),
                    SapMetadataSync.fieldname == parts[1].upper()
                ).first()
                if not meta:
                    parts_r = col.rsplit("_", 1)
                    meta = db.query(SapMetadataSync).filter(
                        SapMetadataSync.tablename == parts_r[1].upper(),
                        SapMetadataSync.fieldname == parts_r[0].upper()
                    ).first()
                if meta and meta.fieldtext and meta.fieldtext != meta.fieldname:
                    desc = meta.fieldtext

            if not desc:
                # Try finding any table in query that has this fieldname
                query_tables = [t.table.upper() for t in query.tables]
                if query_tables:
                    meta = db.query(SapMetadataSync).filter(
                        SapMetadataSync.tablename.in_(query_tables),
                        SapMetadataSync.fieldname == col.upper()
                    ).first()
                    if meta and meta.fieldtext and meta.fieldtext != meta.fieldname:
                        desc = meta.fieldtext
                if not desc:
                    meta = db.query(SapMetadataSync).filter(
                        SapMetadataSync.fieldname == col.upper()
                    ).first()
                    if meta and meta.fieldtext and meta.fieldtext != meta.fieldname:
                        desc = meta.fieldtext

        if desc:
            header_name = f"{desc} ({col})"
        elif sf_match and sf_match.alias:
            header_name = sf_match.alias
        else:
            header_name = col

        column_defs.append({
            "field": col,
            "headerName": header_name,
            "headerTooltip": f"{col} - {desc}" if desc else col,
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

