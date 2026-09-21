import os
import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from app.core.config import settings
from app.api import api_router
from app.tasks.scheduler import start_scheduler, shutdown_scheduler
from app.core.errors import error_payload

logger = logging.getLogger("smart_report.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        start_scheduler()
    except Exception as e:
        print(f"Failed to start scheduler: {e}")
    yield
    # Shutdown
    try:
        shutdown_scheduler()
    except Exception as e:
        print(f"Failed to shutdown scheduler: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError):
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=422,
        content=error_payload(
            "VALIDATION_ERROR",
            "Request validation failed",
            correlation_id,
            False,
            exc.errors(),
        ),
        headers={"X-Correlation-ID": correlation_id},
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException):
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("detail") or "Request failed"
        details = detail.get("details") or detail.get("validation_errors")
    else:
        message = str(detail)
        details = None
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(
            "REQUEST_ERROR",
            message,
            correlation_id,
            exc.status_code >= 500,
            details,
        ),
        headers={"X-Correlation-ID": correlation_id},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    logger.exception("Unhandled API error correlation_id=%s", correlation_id)
    return JSONResponse(
        status_code=500,
        content=error_payload(
            "INTERNAL_ERROR",
            "An unexpected server error occurred",
            correlation_id,
            True,
        ),
        headers={"X-Correlation-ID": correlation_id},
    )

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "api_version": "v1"
    }

# Mount static frontend build if present
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
project_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")

dist_to_use = frontend_dist if os.path.exists(frontend_dist) else project_dist

if os.path.exists(dist_to_use):
    assets_dir = os.path.join(dist_to_use, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = os.path.join(dist_to_use, full_path)
        if full_path and os.path.exists(file_path) and not os.path.isdir(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_to_use, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
