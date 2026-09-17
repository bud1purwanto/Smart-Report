import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_servers_list():
    res = client.get("/api/v1/servers")
    assert res.status_code == 200
    servers = res.json()
    assert len(servers) >= 7
    # Verify password is not leaked in response
    for s in servers:
        assert "password" not in s
        assert "encrypted_password" not in s

def test_metadata_tables_and_autojoin():
    res = client.get("/api/v1/metadata/tables")
    assert res.status_code == 200
    tables = res.json()
    table_names = [t["tablename"] for t in tables]
    assert "EKKO" in table_names
    assert "EKPO" in table_names

    # Test auto-join suggestion between EKKO and EKPO
    aj_res = client.get("/api/v1/metadata/autojoin?table_a=EKKO&table_b=EKPO")
    assert aj_res.status_code == 200
    suggestions = aj_res.json()
    assert len(suggestions) > 0
    assert any(s["source_field"] == "EBELN" and s["target_field"] == "EBELN" for s in suggestions)

    # Test auto-join suggestion between AUSP and CABN: ATINN must be top ranked over ADZHL
    aj_ausp_cabn = client.get("/api/v1/metadata/autojoin?table_a=AUSP&table_b=CABN")
    assert aj_ausp_cabn.status_code == 200
    s_ausp_cabn = aj_ausp_cabn.json()
    if len(s_ausp_cabn) > 0:
        assert s_ausp_cabn[0]["source_field"] == "ATINN"
        assert s_ausp_cabn[0]["target_field"] == "ATINN"

    # Test auto-join suggestion between MCH1 and AUSP: CHARG -> OBJEK
    aj_mch1_ausp = client.get("/api/v1/metadata/autojoin?table_a=MCH1&table_b=AUSP")
    assert aj_mch1_ausp.status_code == 200
    s_mch1_ausp = aj_mch1_ausp.json()
    assert any(s["source_field"] == "CHARG" and s["target_field"] == "OBJEK" for s in s_mch1_ausp)

def test_query_validation_and_crud():
    # Valid query
    query_payload = {
        "name": "Integration Test Query",
        "description": "PO Join Test",
        "query_json": {
            "tables": [
                {"id": "t1", "table": "EKKO"},
                {"id": "t2", "table": "EKPO"}
            ],
            "joins": [
                {"sourceTableId": "t1", "targetTableId": "t2", "sourceField": "EBELN", "targetField": "EBELN", "joinType": "INNER"}
            ],
            "selectedFields": [
                {"tableId": "t1", "table": "EKKO", "field": "EBELN", "alias": "PO_No"},
                {"tableId": "t2", "table": "EKPO", "field": "EBELP", "alias": "Item_No"}
            ],
            "filters": []
        }
    }

    # Validate
    val_res = client.post("/api/v1/queries/validate", json=query_payload["query_json"])
    assert val_res.status_code == 200
    assert val_res.json()["is_valid"] is True

    # Create
    create_res = client.post("/api/v1/queries", json=query_payload)
    assert create_res.status_code == 200
    created = create_res.json()
    q_id = created["id"]
    assert created["name"] == "Integration Test Query"

    # Variant creation
    var_payload = {
        "query_id": q_id,
        "name": "Default Test Layout",
        "column_order": ["PO_No", "Item_No"],
        "hidden_columns": [],
        "filter_parameters": {},
        "sort_parameters": [],
        "custom_columns": [],
        "is_default": True
    }
    var_res = client.post("/api/v1/variants", json=var_payload)
    assert var_res.status_code == 200
    v_id = var_res.json()["id"]

    # Clean up
    client.delete(f"/api/v1/variants/{v_id}")
    client.delete(f"/api/v1/queries/{q_id}")

