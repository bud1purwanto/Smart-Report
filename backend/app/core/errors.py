"""Stable, client-safe API error responses."""

from typing import Any


def error_payload(
    code: str,
    message: str,
    correlation_id: str,
    retryable: bool = False,
    details: Any = None,
) -> dict[str, Any]:
    return {
        "code": code,
        "message": message,
        "correlation_id": correlation_id,
        "retryable": retryable,
        "details": details,
    }
