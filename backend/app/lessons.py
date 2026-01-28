"""Lesson endpoints for generating adaptive ecology content."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db
from .lesson_service import LessonServiceError, generate_lesson
from .schemas import LessonRequest, LessonResponse

router = APIRouter(prefix="/users", tags=["lessons"])


@router.post("/lesson", response_model=LessonResponse, status_code=status.HTTP_200_OK)
async def create_lesson(
    request: LessonRequest,
    db: AsyncSession = Depends(get_db)
) -> LessonResponse:
    """
    Generate an adaptive ecology lesson.
    
    - **topic**: The ecology topic to learn about (required)
    - **user_id**: Optional user ID for personalized content based on history
    
    Returns a lesson with 3 recommended actions.
    """
    try:
        lesson = await generate_lesson(
            topic=request.topic,
            db=db,
            user_id=request.user_id
        )
        return lesson
    except LessonServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate lesson: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )
