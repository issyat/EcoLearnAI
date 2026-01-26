from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Liveness probe")
async def health() -> dict[str, str]:
    return {"status": "ok"}
