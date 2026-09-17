import logging
from typing import List, Optional, Dict, Any
import pandas as pd
from app.schemas.query import QueryDefinition, FilterItem
from app.services.sap_rfc import sap_gateway

logger = logging.getLogger("smart_report.query_executor")

def build_rfc_where_clauses(clauses: List[str], connector: str = "AND") -> List[str]:
    """
    Formats a list of WHERE conditions into lines strictly <= 70 characters
    complying with SAP RFC_READ_TABLE OPTIONS table constraints (CHAR 72 limit).
    Each line except the last ends with the connector (e.g. ' AND' or ' OR').
    """
    if not clauses:
        return []
    clean_clauses = [c.strip() for c in clauses if c and str(c).strip()]
    if not clean_clauses:
        return []

    formatted_lines: List[str] = []
    for i, clause in enumerate(clean_clauses):
        is_last = (i == len(clean_clauses) - 1)
        clause_with_conn = clause if is_last else f"{clause} {connector}"
        if len(clause_with_conn) <= 70:
            formatted_lines.append(clause_with_conn)
        else:
            # Word-wrap into lines <= 70 characters
            words = clause_with_conn.split(" ")
            current_line = ""
            for word in words:
                if not word:
                    continue
                test_line = f"{current_line} {word}".strip() if current_line else word
                if len(test_line) <= 70:
                    current_line = test_line
                else:
                    if current_line:
                        formatted_lines.append(current_line)
                    current_line = word
            if current_line:
                formatted_lines.append(current_line)

    return formatted_lines

def parse_filter_condition(flt: FilterItem, target_table: str) -> Optional[str]:
    """
    Converts a FilterItem into an Open SQL / RFC WHERE expression if it matches target_table.
    """
    parts = flt.field.split(".")
    tbl_part = parts[0].upper() if len(parts) > 1 else target_table.upper()
    fld_part = parts[1].upper() if len(parts) > 1 else parts[0].upper()

    if tbl_part != target_table.upper():
        return None

    op = (flt.operator or "EQ").upper().strip()
    val = str(flt.value).strip() if flt.value is not None else ""

    if op == "EQ":
        return f"{fld_part} = '{val}'"
    elif op == "NE":
        return f"{fld_part} <> '{val}'"
    elif op == "GT":
        return f"{fld_part} > '{val}'"
    elif op == "LT":
        return f"{fld_part} < '{val}'"
    elif op == "GE":
        return f"{fld_part} >= '{val}'"
    elif op == "LE":
        return f"{fld_part} <= '{val}'"
    elif op == "LIKE":
        return f"{fld_part} LIKE '{val}'"
    elif op == "IN":
        # Check if value is comma-separated
        items = [v.strip().strip("'") for v in val.split(",") if v.strip()]
        if items:
            formatted_items = ", ".join([f"'{item}'" for item in items])
            return f"{fld_part} IN ({formatted_items})"
        return None
    elif op == "BETWEEN" and flt.valueTo:
        val_to = str(flt.valueTo).strip()
        return f"{fld_part} BETWEEN '{val}' AND '{val_to}'"

    return f"{fld_part} = '{val}'"

async def fetch_query_dataset(
    server_profile,
    query: QueryDefinition,
    rowcount: int = 100
) -> pd.DataFrame:
    """
    Executes a visual query definition against an SAP server profile:
    - Reads primary table with table-specific fields and selection filters.
    - Sequentially fetches secondary tables using join-key propagation and joins them in Pandas.
    - Returns a unified pandas DataFrame.
    """
    tables = query.tables
    if not tables:
        return pd.DataFrame()

    joins = query.joins
    selected_fields = query.selectedFields
    filters = query.filters

    # 1. Primary table
    primary_table = tables[0].table.upper()
    primary_node_id = tables[0].id

    # Gather selected fields for primary table
    primary_fields = [
        sf.field.upper() for sf in selected_fields
        if (sf.tableId == primary_node_id or sf.table.upper() == primary_table)
    ]

    # Ensure join fields from primary table are included so pandas can merge
    for j in joins:
        src_tbl = next((t.table.upper() for t in tables if t.id == j.sourceTableId), "")
        tgt_tbl = next((t.table.upper() for t in tables if t.id == j.targetTableId), "")
        if (j.sourceTableId == primary_node_id or src_tbl == primary_table) and j.sourceField.upper() not in primary_fields:
            primary_fields.append(j.sourceField.upper())
        if (j.targetTableId == primary_node_id or tgt_tbl == primary_table) and j.targetField.upper() not in primary_fields:
            primary_fields.append(j.targetField.upper())

    # Build primary table WHERE conditions
    raw_primary_filters = []
    for flt in filters:
        cond = parse_filter_condition(flt, primary_table)
        if cond:
            raw_primary_filters.append(cond)

    formatted_primary_where = build_rfc_where_clauses(raw_primary_filters, connector="AND")

    logger.info(f"Fetching primary table {primary_table} from {server_profile.name} (fields: {primary_fields}, where: {formatted_primary_where})")
    res_primary = await sap_gateway.read_table(
        server_profile=server_profile,
        table=primary_table,
        fields=primary_fields if primary_fields else None,
        where=formatted_primary_where,
        rowcount=rowcount
    )

    df = pd.DataFrame(res_primary.get("rows", []))
    if df.empty or len(tables) == 1:
        return df

    # 2. Secondary tables
    for t in tables[1:]:
        sec_table = t.table.upper()
        sec_node_id = t.id

        sec_fields = [
            sf.field.upper() for sf in selected_fields
            if (sf.tableId == sec_node_id or sf.table.upper() == sec_table)
        ]

        # Find join connecting to this table
        join_cond = next((j for j in joins if j.sourceTableId == sec_node_id or j.targetTableId == sec_node_id), None)
        if not join_cond:
            join_cond = next((j for j in joins if (j.sourceField and j.targetField)), None)

        if join_cond:
            if join_cond.sourceTableId == sec_node_id:
                sec_join_field = join_cond.sourceField.upper()
                prim_join_field = join_cond.targetField.upper()
            else:
                sec_join_field = join_cond.targetField.upper()
                prim_join_field = join_cond.sourceField.upper()

            if sec_join_field not in sec_fields:
                sec_fields.append(sec_join_field)

            # User-defined filters for secondary table
            sec_user_filters = []
            for flt in filters:
                cond = parse_filter_condition(flt, sec_table)
                if cond:
                    sec_user_filters.append(cond)

            # Key propagation filter from primary table
            key_clauses = []
            if prim_join_field in df.columns:
                unique_vals = [str(v).strip() for v in df[prim_join_field].dropna().unique() if str(v).strip()][:25]
                for v in unique_vals:
                    key_clauses.append(f"{sec_join_field} = '{v}'")
                    # SAP Alpha conversion & Object Key padding handling (e.g. AUSP-OBJEK 18 chars, MATNR, CHARG)
                    if sec_join_field in ("OBJEK", "MATNR", "CHARG", "KUNNR", "LIFNR", "VBELN", "EBELN", "BELNR"):
                        if len(v) < 18 and v.isdigit():
                            zfilled18 = v.zfill(18)
                            if f"{sec_join_field} = '{zfilled18}'" not in key_clauses:
                                key_clauses.append(f"{sec_join_field} = '{zfilled18}'")
                        if len(v) < 10 and v.isdigit():
                            zfilled10 = v.zfill(10)
                            if f"{sec_join_field} = '{zfilled10}'" not in key_clauses:
                                key_clauses.append(f"{sec_join_field} = '{zfilled10}'")

            formatted_sec_where = []
            if sec_user_filters:
                formatted_sec_where.extend(build_rfc_where_clauses(sec_user_filters, connector="AND"))
            if key_clauses:
                formatted_key_where = build_rfc_where_clauses(key_clauses, connector="OR")
                if formatted_sec_where:
                    formatted_sec_where[-1] = f"{formatted_sec_where[-1]} AND"
                formatted_sec_where.extend(formatted_key_where)

            # Read secondary table with try/except fallback
            df_sec = pd.DataFrame()
            try:
                res_sec = await sap_gateway.read_table(
                    server_profile=server_profile,
                    table=sec_table,
                    fields=sec_fields if sec_fields else None,
                    where=formatted_sec_where if formatted_sec_where else None,
                    rowcount=rowcount * 5
                )
                df_sec = pd.DataFrame(res_sec.get("rows", []))
            except Exception as sec_err:
                logger.warning(f"Failed to read {sec_table} with key propagation: {sec_err}. Falling back to user filters only.")
                fallback_where = build_rfc_where_clauses(sec_user_filters, connector="AND") if sec_user_filters else None
                try:
                    res_sec = await sap_gateway.read_table(
                        server_profile=server_profile,
                        table=sec_table,
                        fields=sec_fields if sec_fields else None,
                        where=fallback_where,
                        rowcount=rowcount * 5
                    )
                    df_sec = pd.DataFrame(res_sec.get("rows", []))
                except Exception as fallback_err:
                    logger.error(f"Fallback read for {sec_table} also failed: {fallback_err}")
                    df_sec = pd.DataFrame()

            if not df_sec.empty and prim_join_field in df.columns and sec_join_field in df_sec.columns:
                how_type = "left" if "LEFT" in (join_cond.joinType or "").upper() else "inner"
                
                # Check direct match
                merged_test = pd.merge(
                    df,
                    df_sec,
                    left_on=prim_join_field,
                    right_on=sec_join_field,
                    how=how_type,
                    suffixes=('', f'_{sec_table}')
                )
                
                # If direct match succeeded and found rows
                if not merged_test.empty and (how_type == "inner" or merged_test[sec_join_field].notna().any()):
                    df = merged_test
                else:
                    # Match with stripped leading zeros (handles alpha padding mismatch like CHARG 10 vs OBJEK 18)
                    df['_k_prim'] = df[prim_join_field].astype(str).str.strip().str.lstrip('0')
                    df_sec['_k_sec'] = df_sec[sec_join_field].astype(str).str.strip().str.lstrip('0')
                    
                    df = pd.merge(
                        df,
                        df_sec,
                        left_on='_k_prim',
                        right_on='_k_sec',
                        how=how_type,
                        suffixes=('', f'_{sec_table}')
                    )
                    df.drop(columns=['_k_prim', '_k_sec'], inplace=True, errors='ignore')

    return df

