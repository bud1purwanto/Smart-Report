from app.core.errors import error_payload


def test_error_payload_uses_stable_contract():
    body = error_payload(
        code="VALIDATION_ERROR",
        message="Request is invalid",
        correlation_id="corr-123",
        retryable=False,
        details=[{"field": "rowcount"}],
    )

    assert body == {
        "code": "VALIDATION_ERROR",
        "message": "Request is invalid",
        "correlation_id": "corr-123",
        "retryable": False,
        "details": [{"field": "rowcount"}],
    }
