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
    ).order_by(SapMetadataSync.position.asc(), SapMetadataSync.id.asc()).all()
    if not fields:
        raise HTTPException(status_code=404, detail=f"Table {tablename} not found in metadata cache.")
    return fields

# Domain & Entity Primary Keys (High Priority)
HIGH_PRIORITY_KEYS = {
    "ATINN", "MATNR", "CHARG", "EBELN", "VBELN", "BELNR", "LIFNR", "KUNNR",
    "AUFNR", "OBJEK", "WERKS", "LGORT", "BUKRS", "VKORG", "VTWEG", "SPART",
    "EKORG", "EKGRP", "KOKRS", "PRCTR", "KOSTL", "ANLN1", "POSID", "PSPNR",
    "EQUNR", "TPLNR", "MBLNR", "BANFN", "KLART", "CLASS", "CLINT", "ATNAM"
}

# Technical Sequence / Counter / Language Keys (Low Priority for joins)
LOW_PRIORITY_KEYS = {
    "ADZHL", "ZEILE", "POSNR", "EBELP", "VBPOS", "SPRAS", "MANDT",
    "ZAEHL", "COUNTER", "STUFE", "PAGENO", "LINENO", "LFDNR", "KAPAR", "AENNR"
}

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
    3. Common cross-table semantic key pairs (e.g. MCH1.CHARG -> AUSP.OBJEK)
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
        fld = fk.fieldname.upper()
        if fld == "MANDT":
            continue
        conf = 0.75 if fld in LOW_PRIORITY_KEYS else (1.0 if fld in HIGH_PRIORITY_KEYS else 0.98)
        suggestions.append(AutoJoinRule(
            source_table=ta,
            target_table=tb,
            source_field=fk.fieldname,
            target_field=fk.fieldname,
            confidence=conf,
            join_type="INNER",
            description=f"Foreign Key: {ta}.{fk.fieldname} mereferensi Check Table {tb}"
        ))

    fk_ba = db.query(SapMetadataSync).filter(
        SapMetadataSync.tablename == tb,
        SapMetadataSync.checktable == ta
    ).all()
    for fk in fk_ba:
        fld = fk.fieldname.upper()
        if fld == "MANDT":
            continue
        conf = 0.75 if fld in LOW_PRIORITY_KEYS else (1.0 if fld in HIGH_PRIORITY_KEYS else 0.98)
        suggestions.append(AutoJoinRule(
            source_table=ta,
            target_table=tb,
            source_field=fk.fieldname,
            target_field=fk.fieldname,
            confidence=conf,
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
        k_upper = k_name.upper()
        if k_name in fields_b and k_upper != "MANDT":
            # Avoid duplicate if already found in foreign key
            if not any(s.source_field == k_name and s.target_field == k_name for s in suggestions):
                is_key_in_b = fields_b[k_name].keyflag == "X"
                if is_key_in_b:
                    if k_upper in HIGH_PRIORITY_KEYS:
                        conf = 0.99
                    elif k_upper in LOW_PRIORITY_KEYS:
                        conf = 0.70
                    else:
                        conf = 0.95
                else:
                    if k_upper in HIGH_PRIORITY_KEYS:
                        conf = 0.92
                    elif k_upper in LOW_PRIORITY_KEYS:
                        conf = 0.60
                    else:
                        conf = 0.85

                suggestions.append(AutoJoinRule(
                    source_table=ta,
                    target_table=tb,
                    source_field=k_name,
                    target_field=k_name,
                    confidence=conf,
                    join_type="INNER",
                    description=f"Primary Key Match: {k_name} cocok di kedua tabel"
                ))

    # 3. Known cross-table domain key joins (e.g. MCH1/MCHA/MARA -> AUSP classification)
    if (ta in ("MCH1", "MCHA") and tb == "AUSP") or (tb in ("MCH1", "MCHA") and ta == "AUSP"):
        src_t, tgt_t = (ta, tb) if ta in ("MCH1", "MCHA") else (tb, ta)
        if not any(s.source_field in ("CHARG", "OBJEK") and s.target_field in ("CHARG", "OBJEK") for s in suggestions):
            suggestions.append(AutoJoinRule(
                source_table=src_t,
                target_table=tgt_t,
                source_field="CHARG",
                target_field="OBJEK",
                confidence=0.96,
                join_type="INNER",
                description="Classification Match: Batch CHARG -> AUSP.OBJEK"
            ))

    if (ta == "MARA" and tb == "AUSP") or (tb == "MARA" and ta == "AUSP"):
        src_t, tgt_t = (ta, tb) if ta == "MARA" else (tb, ta)
        if not any(s.source_field in ("MATNR", "OBJEK") and s.target_field in ("MATNR", "OBJEK") for s in suggestions):
            suggestions.append(AutoJoinRule(
                source_table=src_t,
                target_table=tgt_t,
                source_field="MATNR",
                target_field="OBJEK",
                confidence=0.96,
                join_type="INNER",
                description="Classification Match: Material MATNR -> AUSP.OBJEK"
            ))

    # Sort suggestions by confidence descending, then by priority key bonus
    suggestions.sort(
        key=lambda x: (
            x.confidence,
            1 if x.source_field.upper() in HIGH_PRIORITY_KEYS else 0,
            0 if x.source_field.upper() in LOW_PRIORITY_KEYS else 1
        ),
        reverse=True
    )
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

    # 1. Read DD03L (fields & position in DDIC)
    dd03l_res = await sap_gateway.read_table(
        server_profile=server,
        table="DD03L",
        fields=["FIELDNAME", "POSITION", "KEYFLAG", "ROLLNAME", "DATATYPE", "LENG", "CHECKTABLE"],
        where=[f"TABNAME = '{tbl}' AND FIELDNAME NOT LIKE '%.%' AND FIELDNAME <> 'MANDT'"],
        rowcount=300
    )

    rows = dd03l_res.get("rows", [])
    if not rows:
        raise HTTPException(status_code=404, detail=f"No fields found for table {tbl} in SAP DD03L")

    # Sort rows by POSITION integer so insertion order matches SAP DDIC
    try:
        rows.sort(key=lambda r: int(r.get("POSITION", 0) or 0))
    except Exception:
        pass

    # 2. Read DD03M (field descriptions in English)
    text_map = {}
    try:
        dd03m_res = await sap_gateway.read_table(
            server_profile=server,
            table="DD03M",
            fields=["FIELDNAME", "DDLANGUAGE", "DDTEXT", "SCRTEXT_M"],
            where=[f"TABNAME = '{tbl}' AND DDLANGUAGE = 'E'"],
            rowcount=500
        )
        for mr in dd03m_res.get("rows", []):
            m_fn = mr.get("FIELDNAME", "").strip()
            txt = mr.get("DDTEXT", "").strip() or mr.get("SCRTEXT_M", "").strip()
            if m_fn and txt:
                text_map[m_fn] = txt
    except Exception as txt_err:
        pass

    synced_count = 0
    for r in rows:
        fn = r.get("FIELDNAME", "").strip()
        if not fn:
            continue
        try:
            leng_val = int(r.get("LENG", 0))
        except ValueError:
            leng_val = 0

        try:
            pos_val = int(r.get("POSITION", 0))
        except ValueError:
            pos_val = synced_count + 1

        desc = text_map.get(fn) or fn

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
            existing.position = pos_val
            if desc and desc != fn:
                existing.fieldtext = desc
        else:
            item = SapMetadataSync(
                tablename=tbl,
                fieldname=fn,
                keyflag=r.get("KEYFLAG", "").strip(),
                datatype=r.get("DATATYPE", "").strip(),
                leng=leng_val,
                rollname=r.get("ROLLNAME", "").strip(),
                checktable=r.get("CHECKTABLE", "").strip() or None,
                position=pos_val,
                fieldtext=desc
            )
            db.add(item)
        synced_count += 1

    db.commit()
    return {"status": "success", "table": tbl, "synced_fields": synced_count}

