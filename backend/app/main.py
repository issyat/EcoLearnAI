from fastapi import FastAPI

from .api import router as api_router
from .auth import router as auth_router
from .lessons import router as lessons_router
from .config import get_settings

settings = get_settings()
app = FastAPI(title=settings.project_name)


@app.get("/", summary="Root endpoint")
async def root() -> dict[str, str]:
    return {"message": "EcoLearnAI backend is running"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(lessons_router, prefix=settings.api_v1_prefix)
