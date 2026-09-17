from typing import Dict, Any, List, Optional
from app.schemas.query import QueryDefinition

class AbapValidator:
    """
    ABAP Smart Validator:
    - Validates join logic before executing to SAP
    - Prevents cartesian products and invalid joins that cause DB timeouts
    - Generates standard ABAP Open SQL preview
    """

    @classmethod
    def validate_and_generate_sql(
        cls,
        query: QueryDefinition
    ) -> Dict[str, Any]:
        errors: List[str] = []
        warnings: List[str] = []

        tables = query.tables
        joins = query.joins
        selected_fields = query.selectedFields
        filters = query.filters

        if not tables:
            return {
                "is_valid": False,
                "errors": ["Minimal satu tabel harus dipilih di kanvas."],
                "warnings": [],
                "open_sql": "",
                "table_count": 0,
                "field_count": 0
            }

        table_id_map = {t.id: t.table.upper() for t in tables}
        table_aliases = {}
        alias_counts = {}
        for t in tables:
            tbl_name = t.table.upper()
            alias_counts[tbl_name] = alias_counts.get(tbl_name, 0) + 1
            table_aliases[t.id] = f"{tbl_name.lower()}{alias_counts[tbl_name] if alias_counts[tbl_name] > 1 else ''}"

        # 1. Check Graph Connectivity (Cartesian Product Prevention)
        if len(tables) > 1:
            adj = {t.id: set() for t in tables}
            for j in joins:
                if j.sourceTableId in adj and j.targetTableId in adj:
                    adj[j.sourceTableId].add(j.targetTableId)
                    adj[j.targetTableId].add(j.sourceTableId)
                else:
                    errors.append(f"Garis join menghubungkan node yang tidak valid ({j.sourceTableId} -> {j.targetTableId}).")

            # BFS from first table
            visited = set()
            queue = [tables[0].id]
            while queue:
                curr = queue.pop(0)
                if curr not in visited:
                    visited.add(curr)
                    for neighbor in adj.get(curr, []):
                        if neighbor not in visited:
                            queue.append(neighbor)

            unconnected = [t.table for t in tables if t.id not in visited]
            if unconnected:
                errors.append(
                    f"Peringatan Cartesian Product! Tabel {', '.join(unconnected)} belum dihubungkan dengan relasi (Join). "
                    f"Hal ini dapat menyebabkan timeout di database SAP."
                )

        # 2. Check Selected Fields
        if not selected_fields:
            warnings.append("Belum ada kolom yang dipilih untuk output. Sistem akan memilih kolom primary key secara otomatis.")

        # 3. Check Join Keys
        for j in joins:
            src_tbl = table_id_map.get(j.sourceTableId, j.sourceTableId)
            tgt_tbl = table_id_map.get(j.targetTableId, j.targetTableId)
            if not j.sourceField or not j.targetField:
                errors.append(f"Field relasi kosong pada join antara {src_tbl} dan {tgt_tbl}.")
            elif j.sourceField.upper() != j.targetField.upper():
                warnings.append(
                    f"Join antara {src_tbl}.{j.sourceField} dan {tgt_tbl}.{j.targetField} menggunakan nama kolom yang berbeda. "
                    f"Pastikan tipe data dan panjang field kompatibel di Kamus Data SAP."
                )

        # 4. Generate Open SQL Preview
        fields_clause = []
        if selected_fields:
            for sf in selected_fields:
                alias = table_aliases.get(sf.tableId, sf.table.lower())
                fields_clause.append(f"{alias}~{sf.field.lower()}")
        else:
            first_alias = table_aliases.get(tables[0].id, tables[0].table.lower())
            fields_clause.append(f"{first_alias}~*")

        select_part = "SELECT " + ", ".join(fields_clause)

        # Build FROM and JOIN clauses
        primary_node = tables[0]
        from_part = f"FROM {primary_node.table.lower()} AS {table_aliases[primary_node.id]}"

        joined_table_ids = {primary_node.id}
        remaining_joins = list(joins)

        join_clauses = []
        while remaining_joins:
            progress = False
            for j in list(remaining_joins):
                if j.sourceTableId in joined_table_ids and j.targetTableId not in joined_table_ids:
                    src_alias = table_aliases[j.sourceTableId]
                    tgt_alias = table_aliases[j.targetTableId]
                    tgt_table = table_id_map[j.targetTableId]
                    j_type = "LEFT OUTER JOIN" if "LEFT" in j.joinType.upper() else "INNER JOIN"
                    join_clauses.append(
                        f"{j_type} {tgt_table.lower()} AS {tgt_alias} ON {src_alias}~{j.sourceField.lower()} = {tgt_alias}~{j.targetField.lower()}"
                    )
                    joined_table_ids.add(j.targetTableId)
                    remaining_joins.remove(j)
                    progress = True
                    break
                elif j.targetTableId in joined_table_ids and j.sourceTableId not in joined_table_ids:
                    src_alias = table_aliases[j.sourceTableId]
                    tgt_alias = table_aliases[j.targetTableId]
                    src_table = table_id_map[j.sourceTableId]
                    j_type = "LEFT OUTER JOIN" if "LEFT" in j.joinType.upper() else "INNER JOIN"
                    join_clauses.append(
                        f"{j_type} {src_table.lower()} AS {src_alias} ON {tgt_alias}~{j.targetField.lower()} = {src_alias}~{j.sourceField.lower()}"
                    )
                    joined_table_ids.add(j.sourceTableId)
                    remaining_joins.remove(j)
                    progress = True
                    break
            if not progress:
                # Disconnected joins remaining
                break

        # Build WHERE clause
        where_clauses = []
        for flt in filters:
            fld_parts = flt.field.split(".")
            if len(fld_parts) == 2:
                tbl_part, field_part = fld_parts
                # Find matching alias
                matching_alias = tbl_part.lower()
                for tid, tname in table_id_map.items():
                    if tname == tbl_part.upper():
                        matching_alias = table_aliases[tid]
                        break
                col_ref = f"{matching_alias}~{field_part.lower()}"
            else:
                col_ref = flt.field.lower()

            op = flt.operator.upper()
            val = flt.value
            if op == "EQ":
                where_clauses.append(f"{col_ref} = '{val}'")
            elif op == "NE":
                where_clauses.append(f"{col_ref} <> '{val}'")
            elif op == "GT":
                where_clauses.append(f"{col_ref} > '{val}'")
            elif op == "LT":
                where_clauses.append(f"{col_ref} < '{val}'")
            elif op == "GE":
                where_clauses.append(f"{col_ref} >= '{val}'")
            elif op == "LE":
                where_clauses.append(f"{col_ref} <= '{val}'")
            elif op == "LIKE":
                where_clauses.append(f"{col_ref} LIKE '{val}'")
            elif op == "BETWEEN" and flt.valueTo:
                where_clauses.append(f"{col_ref} BETWEEN '{val}' AND '{flt.valueTo}'")
            elif op == "IN":
                if isinstance(val, list):
                    in_vals = ", ".join([f"'{v}'" for v in val])
                else:
                    in_vals = f"'{val}'"
                where_clauses.append(f"{col_ref} IN ({in_vals})")

        sql_parts = [select_part, from_part]
        if join_clauses:
            sql_parts.extend(join_clauses)
        if where_clauses:
            sql_parts.append("WHERE " + " AND ".join(where_clauses))

        open_sql = "\n  ".join(sql_parts) + "."

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "open_sql": open_sql,
            "table_count": len(tables),
            "field_count": len(selected_fields)
        }

abap_validator = AbapValidator()

