"""
Seed script for smart_report PostgreSQL schema.
- Runs init.sql
- Encrypts passwords for 7 SAP servers from sap-servers.json
- Populates sap_server_profiles and sap_metadata_sync
"""

import json
import os
import sys
from pathlib import Path
from cryptography.fernet import Fernet
import psycopg

# Consistent encryption key for backend
DEFAULT_FERNET_KEY = b"kXwz5yO7fH_W3P81XG_Mh_lq9Jq6zZ7kL8pC9rA3xY0="

SAP_SERVERS_DATA = [
    {
        "name": "Development AIX",
        "sid": "TRD",
        "host": "192.168.2.8",
        "instance": "00",
        "client": "130",
        "environment": "development",
        "user": "TRSTDEV",
        "password": "ronin03",
        "aliases": ["dev", "dev-aix", "development"],
        "description": "Development server on AIX"
    },
    {
        "name": "Development Windows",
        "sid": "TRD",
        "host": "192.168.2.253",
        "instance": "01",
        "client": "130",
        "environment": "development",
        "user": "TRSTDEV",
        "password": "ronin03",
        "aliases": ["dev-win", "dev-windows"],
        "description": "Development server on Windows"
    },
    {
        "name": "Production AIX",
        "sid": "PRT",
        "host": "192.168.1.151",
        "instance": "00",
        "client": "999",
        "environment": "production",
        "user": "TRSTDEV",
        "password": "mysapku",
        "aliases": ["prod", "prod-aix", "production", "prd"],
        "description": "Production server on AIX — requires confirmation"
    },
    {
        "name": "Production Windows",
        "sid": "TRP",
        "host": "192.168.1.251",
        "instance": "00",
        "client": "999",
        "environment": "production",
        "user": "TRSTDEV",
        "password": "mysapku",
        "aliases": ["prod-win", "prod-windows", "prp"],
        "description": "Production server on Windows — requires confirmation"
    },
    {
        "name": "QA",
        "sid": "TRQ",
        "host": "192.168.2.7",
        "instance": "00",
        "client": "320",
        "environment": "qa",
        "user": "TRSTDEV",
        "password": "mysapku",
        "aliases": ["qa", "quality", "test"],
        "description": "Quality Assurance server"
    },
    {
        "name": "Sandbox Build Competence",
        "sid": "TRD",
        "host": "192.168.88.199",
        "instance": "00",
        "client": "140",
        "environment": "sandbox",
        "user": "TRSTDEV",
        "password": "ronin03",
        "aliases": ["sandbox", "sandbox-build", "build-competence"],
        "description": "Sandbox for Build Competence"
    },
    {
        "name": "Sandbox New Company",
        "sid": "TRS",
        "host": "192.168.6.243",
        "instance": "00",
        "client": "130",
        "environment": "sandbox",
        "user": "TRSTDEV",
        "password": "ronin03",
        "aliases": ["sandbox-new", "new-company"],
        "description": "Sandbox for New Company"
    }
]

# Standard SAP table metadata seeds for instant auto-joins
METADATA_SEEDS = [
    # EKKO
    {"tablename": "EKKO", "fieldname": "EBELN", "keyflag": "X", "datatype": "CHAR", "leng": 10, "rollname": "EBELN", "fieldtext": "Purchasing Document Number", "checktable": None},
    {"tablename": "EKKO", "fieldname": "BUKRS", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "BUKRS", "fieldtext": "Company Code", "checktable": "T001"},
    {"tablename": "EKKO", "fieldname": "BSTYP", "keyflag": "", "datatype": "CHAR", "leng": 1, "rollname": "BSTYP", "fieldtext": "Purchasing Document Category", "checktable": None},
    {"tablename": "EKKO", "fieldname": "BSART", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "ESART", "fieldtext": "Purchasing Document Type", "checktable": "T161"},
    {"tablename": "EKKO", "fieldname": "LIFNR", "keyflag": "", "datatype": "CHAR", "leng": 10, "rollname": "ELIFN", "fieldtext": "Vendor Account Number", "checktable": "LFA1"},
    {"tablename": "EKKO", "fieldname": "EKORG", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "EKORG", "fieldtext": "Purchasing Organization", "checktable": "T024E"},
    {"tablename": "EKKO", "fieldname": "EKGRP", "keyflag": "", "datatype": "CHAR", "leng": 3, "rollname": "BKGRP", "fieldtext": "Purchasing Group", "checktable": "T024"},
    {"tablename": "EKKO", "fieldname": "WAERS", "keyflag": "", "datatype": "CUKY", "leng": 5, "rollname": "WAERS", "fieldtext": "Currency Key", "checktable": "TCURC"},
    {"tablename": "EKKO", "fieldname": "BEDAT", "keyflag": "", "datatype": "DATS", "leng": 8, "rollname": "EBDAT", "fieldtext": "Purchasing Document Date", "checktable": None},
    
    # EKPO
    {"tablename": "EKPO", "fieldname": "EBELN", "keyflag": "X", "datatype": "CHAR", "leng": 10, "rollname": "EBELN", "fieldtext": "Purchasing Document Number", "checktable": "EKKO"},
    {"tablename": "EKPO", "fieldname": "EBELP", "keyflag": "X", "datatype": "NUMC", "leng": 5, "rollname": "EBELP", "fieldtext": "Item Number of Purchasing Doc", "checktable": None},
    {"tablename": "EKPO", "fieldname": "MATNR", "keyflag": "", "datatype": "CHAR", "leng": 18, "rollname": "MATNR", "fieldtext": "Material Number", "checktable": "MARA"},
    {"tablename": "EKPO", "fieldname": "WERKS", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "WERKS_D", "fieldtext": "Plant", "checktable": "T001W"},
    {"tablename": "EKPO", "fieldname": "LGORT", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "LGORT_D", "fieldtext": "Storage Location", "checktable": "T001L"},
    {"tablename": "EKPO", "fieldname": "MENGE", "keyflag": "", "datatype": "QUAN", "leng": 13, "rollname": "BSTMG", "fieldtext": "Purchase Order Quantity", "checktable": None},
    {"tablename": "EKPO", "fieldname": "MEINS", "keyflag": "", "datatype": "UNIT", "leng": 3, "rollname": "BSTME", "fieldtext": "Purchase Order Unit of Measure", "checktable": "T006"},
    {"tablename": "EKPO", "fieldname": "NETPR", "keyflag": "", "datatype": "CURR", "leng": 11, "rollname": "BPREI", "fieldtext": "Net Price in Document Currency", "checktable": None},
    {"tablename": "EKPO", "fieldname": "NETWR", "keyflag": "", "datatype": "CURR", "leng": 13, "rollname": "BWERT", "fieldtext": "Net Order Value in PO Currency", "checktable": None},
    {"tablename": "EKPO", "fieldname": "TXZ01", "keyflag": "", "datatype": "CHAR", "leng": 40, "rollname": "TXZ01", "fieldtext": "Short Text", "checktable": None},
    
    # LFA1
    {"tablename": "LFA1", "fieldname": "LIFNR", "keyflag": "X", "datatype": "CHAR", "leng": 10, "rollname": "LIFNR", "fieldtext": "Account Number of Vendor", "checktable": None},
    {"tablename": "LFA1", "fieldname": "NAME1", "keyflag": "", "datatype": "CHAR", "leng": 35, "rollname": "NAME1_GP", "fieldtext": "Name 1", "checktable": None},
    {"tablename": "LFA1", "fieldname": "ORT01", "keyflag": "", "datatype": "CHAR", "leng": 35, "rollname": "ORT01_GP", "fieldtext": "City", "checktable": None},
    {"tablename": "LFA1", "fieldname": "LAND1", "keyflag": "", "datatype": "CHAR", "leng": 3, "rollname": "LAND1_GP", "fieldtext": "Country Key", "checktable": "T005"},
    {"tablename": "LFA1", "fieldname": "STCD1", "keyflag": "", "datatype": "CHAR", "leng": 16, "rollname": "STCD1", "fieldtext": "Tax Number 1", "checktable": None},
    {"tablename": "LFA1", "fieldname": "BANKN", "keyflag": "", "datatype": "CHAR", "leng": 18, "rollname": "BANKN", "fieldtext": "Bank Account Number", "checktable": None},

    # MARA
    {"tablename": "MARA", "fieldname": "MATNR", "keyflag": "X", "datatype": "CHAR", "leng": 18, "rollname": "MATNR", "fieldtext": "Material Number", "checktable": None},
    {"tablename": "MARA", "fieldname": "MTART", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "MTART", "fieldtext": "Material Type", "checktable": "T134"},
    {"tablename": "MARA", "fieldname": "MATKL", "keyflag": "", "datatype": "CHAR", "leng": 9, "rollname": "MATKL", "fieldtext": "Material Group", "checktable": "T023"},
    {"tablename": "MARA", "fieldname": "MEINS", "keyflag": "", "datatype": "UNIT", "leng": 3, "rollname": "MEINS", "fieldtext": "Base Unit of Measure", "checktable": "T006"},
    {"tablename": "MARA", "fieldname": "BRGEW", "keyflag": "", "datatype": "QUAN", "leng": 13, "rollname": "BRGEW", "fieldtext": "Gross Weight", "checktable": None},
    {"tablename": "MARA", "fieldname": "NTGEW", "keyflag": "", "datatype": "QUAN", "leng": 13, "rollname": "NTGEW", "fieldtext": "Net Weight", "checktable": None},

    # MAKT
    {"tablename": "MAKT", "fieldname": "MATNR", "keyflag": "X", "datatype": "CHAR", "leng": 18, "rollname": "MATNR", "fieldtext": "Material Number", "checktable": "MARA"},
    {"tablename": "MAKT", "fieldname": "SPRAS", "keyflag": "X", "datatype": "LANG", "leng": 1, "rollname": "SPRAS", "fieldtext": "Language Key", "checktable": "T002"},
    {"tablename": "MAKT", "fieldname": "MAKTX", "keyflag": "", "datatype": "CHAR", "leng": 40, "rollname": "MAKTX", "fieldtext": "Material Description", "checktable": None},

    # MARC
    {"tablename": "MARC", "fieldname": "MATNR", "keyflag": "X", "datatype": "CHAR", "leng": 18, "rollname": "MATNR", "fieldtext": "Material Number", "checktable": "MARA"},
    {"tablename": "MARC", "fieldname": "WERKS", "keyflag": "X", "datatype": "CHAR", "leng": 4, "rollname": "WERKS_D", "fieldtext": "Plant", "checktable": "T001W"},
    {"tablename": "MARC", "fieldname": "EKGRP", "keyflag": "", "datatype": "CHAR", "leng": 3, "rollname": "EKGRP", "fieldtext": "Purchasing Group", "checktable": "T024"},
    {"tablename": "MARC", "fieldname": "DISPO", "keyflag": "", "datatype": "CHAR", "leng": 3, "rollname": "DISPO", "fieldtext": "MRP Controller", "checktable": "T024D"},

    # VBAK
    {"tablename": "VBAK", "fieldname": "VBELN", "keyflag": "X", "datatype": "CHAR", "leng": 10, "rollname": "VBELN_VA", "fieldtext": "Sales Document", "checktable": None},
    {"tablename": "VBAK", "fieldname": "ERDAT", "keyflag": "", "datatype": "DATS", "leng": 8, "rollname": "ERDAT", "fieldtext": "Date on which record was created", "checktable": None},
    {"tablename": "VBAK", "fieldname": "AUART", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "AUART", "fieldtext": "Sales Document Type", "checktable": "TVAK"},
    {"tablename": "VBAK", "fieldname": "VKORG", "keyflag": "", "datatype": "CHAR", "leng": 4, "rollname": "VKORG", "fieldtext": "Sales Organization", "checktable": "TVKO"},
    {"tablename": "VBAK", "fieldname": "VTWEG", "keyflag": "", "datatype": "CHAR", "leng": 2, "rollname": "VTWEG", "fieldtext": "Distribution Channel", "checktable": "TVTW"},
    {"tablename": "VBAK", "fieldname": "KUNNR", "keyflag": "", "datatype": "CHAR", "leng": 10, "rollname": "KUNAG", "fieldtext": "Sold-to Party", "checktable": "KNA1"},
    {"tablename": "VBAK", "fieldname": "NETWR", "keyflag": "", "datatype": "CURR", "leng": 15, "rollname": "NETWR_AK", "fieldtext": "Net Value of the Sales Order", "checktable": None},

    # VBAP
    {"tablename": "VBAP", "fieldname": "VBELN", "keyflag": "X", "datatype": "CHAR", "leng": 10, "rollname": "VBELN_VA", "fieldtext": "Sales Document", "checktable": "VBAK"},
    {"tablename": "VBAP", "fieldname": "POSNR", "keyflag": "X", "datatype": "NUMC", "leng": 6, "rollname": "POSNR_VA", "fieldtext": "Sales Document Item", "checktable": None},
    {"tablename": "VBAP", "fieldname": "MATNR", "keyflag": "", "datatype": "CHAR", "leng": 18, "rollname": "MATNR", "fieldtext": "Material Number", "checktable": "MARA"},
    {"tablename": "VBAP", "fieldname": "KWMENG", "keyflag": "", "datatype": "QUAN", "leng": 15, "rollname": "KWMENG", "fieldtext": "Cumulative Order Quantity", "checktable": None},
    {"tablename": "VBAP", "fieldname": "NETPR", "keyflag": "", "datatype": "CURR", "leng": 11, "rollname": "NETPR", "fieldtext": "Net Price", "checktable": None},
    {"tablename": "VBAP", "fieldname": "NETWR", "keyflag": "", "datatype": "CURR", "leng": 15, "rollname": "NETWR_AP", "fieldtext": "Net Value of the Item", "checktable": None},

    # KNA1
    {"tablename": "KNA1", "fieldname": "KUNNR", "keyflag": "X", "datatype": "CHAR", "leng": 10, "rollname": "KUNNR", "fieldtext": "Customer Number", "checktable": None},
    {"tablename": "KNA1", "fieldname": "NAME1", "keyflag": "", "datatype": "CHAR", "leng": 35, "rollname": "NAME1_GP", "fieldtext": "Name 1", "checktable": None},
    {"tablename": "KNA1", "fieldname": "ORT01", "keyflag": "", "datatype": "CHAR", "leng": 35, "rollname": "ORT01_GP", "fieldtext": "City", "checktable": None},
    {"tablename": "KNA1", "fieldname": "LAND1", "keyflag": "", "datatype": "CHAR", "leng": 3, "rollname": "LAND1_GP", "fieldtext": "Country Key", "checktable": "T005"},
    {"tablename": "KNA1", "fieldname": "STCD1", "keyflag": "", "datatype": "CHAR", "leng": 16, "rollname": "STCD1", "fieldtext": "Tax Number 1", "checktable": None}
]

def main():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@192.168.1.232:5432/ABAP_DB")
    print(f"Connecting to database {db_url}...")
    
    cipher = Fernet(DEFAULT_FERNET_KEY)
    
    init_sql_path = Path(__file__).parent / "init.sql"
    with open(init_sql_path, "r", encoding="utf-8") as f:
        init_sql = f.read()

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            print("Applying schema DDL (init.sql)...")
            cur.execute(init_sql)
            conn.commit()

            print("Seeding SAP Server Profiles with encrypted passwords...")
            for s in SAP_SERVERS_DATA:
                enc_pass = cipher.encrypt(s["password"].encode("utf-8")).decode("utf-8")
                cur.execute("""
                    INSERT INTO smart_report.sap_server_profiles 
                    (name, sid, host, instance, client, username, encrypted_password, environment, aliases, description, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        sid = EXCLUDED.sid,
                        host = EXCLUDED.host,
                        instance = EXCLUDED.instance,
                        client = EXCLUDED.client,
                        username = EXCLUDED.username,
                        encrypted_password = EXCLUDED.encrypted_password,
                        environment = EXCLUDED.environment,
                        aliases = EXCLUDED.aliases,
                        description = EXCLUDED.description,
                        updated_at = CURRENT_TIMESTAMP;
                """, (
                    s["name"],
                    s["sid"],
                    s["host"],
                    s["instance"],
                    s["client"],
                    s["user"],
                    enc_pass,
                    s["environment"],
                    json.dumps(s["aliases"]),
                    s["description"],
                    True
                ))
            conn.commit()

            print("Seeding SAP Metadata Dictionary...")
            for m in METADATA_SEEDS:
                cur.execute("""
                    INSERT INTO smart_report.sap_metadata_sync
                    (tablename, fieldname, keyflag, datatype, leng, rollname, fieldtext, checktable, synced_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (tablename, fieldname) DO UPDATE SET
                        keyflag = EXCLUDED.keyflag,
                        datatype = EXCLUDED.datatype,
                        leng = EXCLUDED.leng,
                        rollname = EXCLUDED.rollname,
                        fieldtext = EXCLUDED.fieldtext,
                        checktable = EXCLUDED.checktable,
                        synced_at = CURRENT_TIMESTAMP;
                """, (
                    m["tablename"],
                    m["fieldname"],
                    m["keyflag"],
                    m["datatype"],
                    m["leng"],
                    m["rollname"],
                    m["fieldtext"],
                    m["checktable"]
                ))
            conn.commit()

            # Seed a sample query for PO Analysis
            sample_query = {
                "tables": [
                    {"id": "t1", "table": "EKKO", "alias": "EKKO", "position": {"x": 50, "y": 80}},
                    {"id": "t2", "table": "EKPO", "alias": "EKPO", "position": {"x": 420, "y": 80}}
                ],
                "joins": [
                    {
                        "id": "j1",
                        "sourceTableId": "t1",
                        "targetTableId": "t2",
                        "sourceField": "EBELN",
                        "targetField": "EBELN",
                        "joinType": "INNER"
                    }
                ],
                "selectedFields": [
                    {"tableId": "t1", "table": "EKKO", "field": "EBELN", "alias": "PO_Number"},
                    {"tableId": "t1", "table": "EKKO", "field": "BUKRS", "alias": "Company_Code"},
                    {"tableId": "t1", "table": "EKKO", "field": "LIFNR", "alias": "Vendor"},
                    {"tableId": "t2", "table": "EKPO", "field": "EBELP", "alias": "Item"},
                    {"tableId": "t2", "table": "EKPO", "field": "MATNR", "alias": "Material"},
                    {"tableId": "t2", "table": "EKPO", "field": "MENGE", "alias": "Quantity"},
                    {"tableId": "t2", "table": "EKPO", "field": "NETPR", "alias": "Net_Price"}
                ],
                "filters": [
                    {"field": "EKKO.BSTYP", "operator": "EQ", "value": "F"}
                ],
                "options": {"rowcount": 100}
            }

            cur.execute("""
                INSERT INTO smart_report.saved_queries
                (id, name, description, query_json, abap_sql_preview, created_by)
                VALUES (1, 'PO Price & Quantity Analysis', 'Standard PO Header to Item Join', %s, 
                'SELECT ekko~ebeln, ekko~bukrs, ekko~lifnr, ekpo~ebelp, ekpo~matnr, ekpo~menge, ekpo~netpr FROM ekko INNER JOIN ekpo ON ekko~ebeln = ekpo~ebeln WHERE ekko~bstyp = ''F''',
                'SAP Analyst')
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    query_json = EXCLUDED.query_json,
                    abap_sql_preview = EXCLUDED.abap_sql_preview;
            """, (json.dumps(sample_query),))
            conn.commit()

            # Seed sample variant for the query
            cur.execute("""
                INSERT INTO smart_report.report_variants
                (query_id, name, column_order, hidden_columns, filter_parameters, sort_parameters, custom_columns, is_default)
                VALUES (1, '/DEFAULT', 
                '["PO_Number", "Company_Code", "Vendor", "Item", "Material", "Quantity", "Net_Price", "TOTAL_VALUE"]'::jsonb,
                '[]'::jsonb,
                '{}'::jsonb,
                '[{"colId": "PO_Number", "sort": "desc"}]'::jsonb,
                '[{"name": "TOTAL_VALUE", "formula": "row.Quantity * row.Net_Price"}]'::jsonb,
                TRUE)
                ON CONFLICT DO NOTHING;
            """)
            conn.commit()

            print("Database setup and seeding completed successfully!")

if __name__ == "__main__":
    main()

