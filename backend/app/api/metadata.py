from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.metadata_sync import SapMetadataSync
from app.models.server_profile import SapServerProfile
from app.schemas.metadata import TableFieldItem, TableSummary, AutoJoinRule
from app.services.sap_rfc import sap_gateway

router = APIRouter(prefix="/metadata", tags=["Metadata"])

@router.get("/tables", response_model=List[TableSummary])
def list_available_tables(db: Session = Depends(get_db)):
    """Returns list of cached SAP tables with field counts and primary keys."""
    results = db.query(
        SapMetadataSync.tablename,
        func.count(SapMetadataSync.id).label("field_count")
    ).group_by(SapMetadataSync.tablename).order_by(SapMetadataSync.tablename.asc()).all()

    summaries = []
    for row in results:
        tname = row[0]
        keys = [
            r[0] for r in db.query(SapMetadataSync.fieldname).filter(
                SapMetadataSync.tablename == tname,
                SapMetadataSync.keyflag == "X"
            ).all()
        ]
        summaries.append(TableSummary(
            tablename=tname,
            field_count=row[1],
            key_fields=keys
        ))
    return summaries

@router.get("/tables/{tablename}", response_model=List[TableFieldItem])
def get_table_fields(tablename: str, db: Session = Depends(get_db)):
    fields = db.query(SapMetadataSync).filter(
        SapMetadataSync.tablename == tablename.upper()
    ).order_by(SapMetadataSync.keyflag.desc(), SapMetadataSync.fieldname.asc()).all()
    if not fields:
        raise HTTPException(status_code=404, detail=f"Table {tablename} not found in metadata cache.")
    return fields

@router.get("/autojoin", response_model=List[AutoJoinRule])
def suggest_autojoin(
    table_a: str = Query(..., description="First table name"),
    table_b: str = Query(..., description="Second table name"),
    db: Session = Depends(get_db)
):
    """
    Auto-Join feature (Rule 2):
    Suggests join condition between table_a and table_b based on:
    1. Foreign Key / Check Table relationship from SAP DDIC (DD08L / checktable)
    2. Primary Key matching column names
    """
    ta = table_a.upper()
    tb = table_b.upper()
    suggestions: List[AutoJoinRule] = []

    # 1. Check checktable in metadata sync (DD08L foreign key relationship)
    fk_ab = db.query(SapMetadataSync).filter(
        SapMetadataSync.tablename == ta,
        SapMetadataSync.checktable == tb
    ).all()
    for fk in fk_ab:
        suggestions.append(AutoJoinRule(
            source_table=ta,
            target_table=tb,
            source_field=fk.fieldname,
            target_field=fk.fieldname,
            confidence=1.0,
            join_type="INNER",
            description=f"Foreign Key: {ta}.{fk.fieldname} mereferensi Check Table {tb}"
        ))

    fk_ba = db.query(SapMetadataSync).filter(
        SapMetadataSync.tablename == tb,
        SapMetadataSync.checktable == ta
    ).all()
    for fk in fk_ba:
        suggestions.append(AutoJoinRule(
            source_table=ta,
            target_table=tb,
            source_field=fk.fieldname,
            target_field=fk.fieldname,
            confidence=1.0,
            join_type="INNER",
            description=f"Foreign Key: {tb}.{fk.fieldname} mereferensi Check Table {ta}"
        ))

    # 2. Check identical Primary Key field names between the two tables
    keys_a = {
        r.fieldname: r for r in db.query(SapMetadataSync).filter(
            SapMetadataSync.tablename == ta,
            SapMetadataSync.keyflag == "X"
        ).all()
    }
    fields_b = {
        r.fieldname: r for r in db.query(SapMetadataSync).filter(
            SapMetadataSync.tablename == tb
        ).all()
    }

    for k_name in keys_a:
        if k_name in fields_b and k_name != "MANDT":
            # Avoid duplicate if already found in foreign key
            if not any(s.source_field == k_name and s.target_field == k_name for s in suggestions):
                is_key_in_b = fields_b[k_name].keyflag == "X"
                suggestions.append(AutoJoinRule(
                    source_table=ta,
                    target_table=tb,
                    source_field=k_name,
                    target_field=k_name,
                    confidence=0.95 if is_key_in_b else 0.85,
                    join_type="INNER",
                    description=f"Primary Key Match: {k_name} cocok di kedua tabel"
                ))

    # Sort suggestions by confidence descending
    suggestions.sort(key=lambda x: x.confidence, reverse=True)
    return suggestions

@router.post("/sync/{tablename}")
async def sync_table_metadata_from_sap(
    tablename: str,
    server_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Pulls live field definition from SAP Data Dictionary (DD03L & DD08L)
    and updates the local metadata cache.
    """
    tbl = tablename.upper()
    server = None
    if server_id:
        server = db.query(SapServerProfile).filter(SapServerProfile.id == server_id).first()
    if not server:
        server = db.query(SapServerProfile).filter(SapServerProfile.is_active == True).first()
    if not server:
        raise HTTPException(status_code=400, detail="No active server available for sync")

    # 1. Read DD03L (fields)
    dd03l_res = await sap_gateway.read_table(
        server_profile=server,
        table="DD03L",
        fields=["FIELDNAME", "KEYFLAG", "ROLLNAME", "DATATYPE", "LENG", "CHECKTABLE"],
        where=[f"TABNAME = '{tbl}' AND FIELDNAME NOT LIKE '%.%' AND FIELDNAME <> 'MANDT'"],
        rowcount=200
    )

    rows = dd03l_res.get("rows", [])
    if not rows:
        raise HTTPException(status_code=404, detail=f"No fields found for table {tbl} in SAP DD03L")

    synced_count = 0
    for r in rows:
        fn = r.get("FIELDNAME", "").strip()
        if not fn:
            continue
        try:
            leng_val = int(r.get("LENG", 0))
        except ValueError:
            leng_val = 0

        existing = db.query(SapMetadataSync).filter(
            SapMetadataSync.tablename == tbl,
            SapMetadataSync.fieldname == fn
        ).first()

        if existing:
            existing.keyflag = r.get("KEYFLAG", "").strip()
            existing.datatype = r.get("DATATYPE", "").strip()
            existing.leng = leng_val
            existing.rollname = r.get("ROLLNAME", "").strip()
            existing.checktable = r.get("CHECKTABLE", "").strip() or None
        else:
            item = SapMetadataSync(
                tablename=tbl,
                fieldname=fn,
                keyflag=r.get("KEYFLAG", "").strip(),
                datatype=r.get("DATATYPE", "").strip(),
                leng=leng_val,
                rollname=r.get("ROLLNAME", "").strip(),
                checktable=r.get("CHECKTABLE", "").strip() or None,
                fieldtext=fn
            )
            db.add(item)
        synced_count += 1

    db.commit()
    return {"status": "success", "table": tbl, "synced_fields": synced_count}

