import time
import asyncio
from typing import List, Dict, Any
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.server_profile import SapServerProfile
from app.schemas.compare import CompareRequest, CompareResponse, CompareSummary, RowDiff
from app.services.pandas_engine import pandas_engine, DuplicateComparisonKeyError
from app.services.query_executor import fetch_query_dataset

router = APIRouter(prefix="/compare", tags=["Cross-Server Compare"])

@router.post("", response_model=CompareResponse)
async def compare_across_servers(
    req: CompareRequest,
    db: Session = Depends(get_db)
):
    """
    Cross-Server Data Compare:
    Fetches visual query data from Server A and Server B strictly in parallel using asyncio.gather (Rule 1).
    Supports multi-table joins on both servers.
    Computes visual diffing using Pandas Engine (Rule 1).
    """
    start_time = time.time()

    server_a = db.query(SapServerProfile).filter(SapServerProfile.id == req.server_a_id).first()
    server_b = db.query(SapServerProfile).filter(SapServerProfile.id == req.server_b_id).first()

    if not server_a or not server_b:
        raise HTTPException(status_code=400, detail="Profil server SAP tidak ditemukan.")

    query = req.query
    if not query.tables:
        raise HTTPException(status_code=400, detail="Kanvas komparasi belum memiliki tabel.")

    # RULE 1 COMPLIANCE: Parallel asynchronous execution with asyncio.gather
    task_a = fetch_query_dataset(server_a, query, rowcount=req.rowcount)
    task_b = fetch_query_dataset(server_b, query, rowcount=req.rowcount)

    res_a, res_b = await asyncio.gather(task_a, task_b, return_exceptions=True)

    if isinstance(res_a, Exception):
        raise HTTPException(status_code=500, detail=f"Gagal mengambil data dari Server A ({server_a.name}): {res_a}")
    if isinstance(res_b, Exception):
        raise HTTPException(status_code=500, detail=f"Gagal mengambil data dari Server B ({server_b.name}): {res_b}")

    df_a = res_a if isinstance(res_a, pd.DataFrame) else pd.DataFrame()
    df_b = res_b if isinstance(res_b, pd.DataFrame) else pd.DataFrame()

    # Determine key fields for diffing
    key_fields = req.key_fields or []
    if not key_fields:
        # Extract from selectedFields marked as key
        key_fields = [sf.field for sf in query.selectedFields if sf.isKey]
    if not key_fields and not df_a.empty:
        key_fields = [df_a.columns[0]]
    elif not key_fields and not df_b.empty:
        key_fields = [df_b.columns[0]]

    # RULE 1 COMPLIANCE: In-memory diffing via Pandas
    try:
        summary_raw, diff_rows_raw = pandas_engine.diff_datasets(
            df_a=df_a,
            df_b=df_b,
            key_fields=key_fields
        )
    except DuplicateComparisonKeyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    summary = CompareSummary(
        server_a_name=server_a.name,
        server_b_name=server_b.name,
        total_a=summary_raw["total_a"],
        total_b=summary_raw["total_b"],
        identical_count=summary_raw["identical_count"],
        modified_count=summary_raw["modified_count"],
        added_count=summary_raw["added_count"],
        deleted_count=summary_raw["deleted_count"]
    )

    columns = sorted(list(set(df_a.columns).union(set(df_b.columns))))
    if "_diff_key_" in columns:
        columns.remove("_diff_key_")

    execution_time_ms = round((time.time() - start_time) * 1000, 2)

    return CompareResponse(
        summary=summary,
        columns=columns,
        diff_rows=diff_rows_raw,
        execution_time_ms=execution_time_ms
    )
