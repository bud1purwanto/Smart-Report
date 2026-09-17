from fastapi import APIRouter
from app.api.queries import router as queries_router
from app.api.variants import router as variants_router
from app.api.compare import router as compare_router
from app.api.servers import router as servers_router
from app.api.metadata import router as metadata_router
from app.api.schedules import router as schedules_router
from app.api.ai import router as ai_router

api_router = APIRouter()

api_router.include_router(queries_router)
api_router.include_router(variants_router)
api_router.include_router(compare_router)
api_router.include_router(servers_router)
api_router.include_router(metadata_router)
api_router.include_router(schedules_router)
api_router.include_router(ai_router)

