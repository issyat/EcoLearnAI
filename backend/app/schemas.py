from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


# Lesson schemas
class LessonAction(BaseModel):
    """Single action recommendation for the user."""
    title: str = Field(..., description="Action title")
    description: str = Field(..., description="Action description")


class LessonRequest(BaseModel):
    """Request to generate a lesson."""
    topic: str = Field(..., min_length=1, max_length=200, description="Ecology topic to learn about")
    user_id: int | None = Field(None, description="Optional user ID for personalized content")


class LessonResponse(BaseModel):
    """Generated lesson with actions."""
    lesson: str = Field(..., description="The generated lesson content")
    actions: list[LessonAction] = Field(..., min_items=3, max_items=3, description="3 recommended actions")
    topic: str = Field(..., description="The topic of the lesson")
