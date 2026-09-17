import time
import asyncio
from typing import List, Dict, Any
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.server_profile import SapServerProfile
from app.schemas.compare import CompareRequest, CompareResponse, CompareSummary, RowDiff
from app.services.sap_rfc import sap_gateway
from app.services.pandas_engine import pandas_engine

router = APIRouter(prefix="/compare", tags=["Cross-Server Compare"])

@router.post("", response_model=CompareResponse)
async def compare_across_servers(
    req: CompareRequest,
    db: Session = Depends(get_db)
):
    """
    Cross-Server Data Compare:
    Fetches data from Server A and Server B strictly in parallel using asyncio.gather (Rule 1).
    Computes visual diffing using Pandas Engine (Rule 1).
    """
    start_time = time.time()

    server_a = db.query(SapServerProfile).filter(SapServerProfile.id == req.server_a_id).first()
    server_b = db.query(SapServerProfile).filter(SapServerProfile.id == req.server_b_id).first()

    if not server_a or not server_b:
        raise HTTPException(status_code=400, detail="Server profile(s) not found.")

    query = req.query
    if not query.tables:
        raise HTTPException(status_code=400, detail="Query has no tables defined.")

    primary_table = query.tables[0].table
    fields = [sf.field for sf in query.selectedFields]
    where = []
    for flt in query.filters:
        fld_name = flt.field.split(".")[-1]
        if flt.operator.upper() == "EQ":
            where.append(f"{fld_name} = '{flt.value}'")

    # RULE 1 COMPLIANCE: Parallel asynchronous execution with asyncio.gather
    task_a = sap_gateway.read_table(
        server_profile=server_a,
        table=primary_table,
        fields=fields,
        where=where,
        rowcount=req.rowcount
    )
    task_b = sap_gateway.read_table(
        server_profile=server_b,
        table=primary_table,
        fields=fields,
        where=where,
        rowcount=req.rowcount
    )

    res_a, res_b = await asyncio.gather(task_a, task_b, return_exceptions=True)

    if isinstance(res_a, Exception):
        raise HTTPException(status_code=500, detail=f"Error reading from Server A ({server_a.name}): {res_a}")
    if isinstance(res_b, Exception):
        raise HTTPException(status_code=500, detail=f"Error reading from Server B ({server_b.name}): {res_b}")

    df_a = pd.DataFrame(res_a.get("rows", []))
    df_b = pd.DataFrame(res_b.get("rows", []))

    # RULE 1 COMPLIANCE: In-memory diffing via Pandas
    summary_raw, diff_rows_raw = pandas_engine.diff_datasets(
        df_a=df_a,
        df_b=df_b,
        key_fields=req.key_fields
    )

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

