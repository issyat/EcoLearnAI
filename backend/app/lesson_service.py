"""Service for generating adaptive ecology lessons using GPT."""
import json
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .models import LessonHistory
from .schemas import LessonAction, LessonResponse


class LessonServiceError(Exception):
    """Raised when lesson generation fails."""
    pass


async def get_user_lesson_history(
    db: AsyncSession, 
    user_id: int, 
    limit: int = 5
) -> list[str]:
    """Get recent lesson topics for a user."""
    result = await db.execute(
        select(LessonHistory.topic)
        .where(LessonHistory.user_id == user_id)
        .order_by(LessonHistory.created_at.desc())
        .limit(limit)
    )
    topics = result.scalars().all()
    return list(topics)


async def save_lesson_history(
    db: AsyncSession,
    user_id: int,
    topic: str,
    lesson_content: str
) -> None:
    """Save lesson to user history."""
    history_entry = LessonHistory(
        user_id=user_id,
        topic=topic,
        lesson_content=lesson_content
    )
    db.add(history_entry)
    await db.commit()


def build_lesson_prompt(topic: str, previous_topics: list[str] | None = None) -> str:
    """Build the GPT prompt for lesson generation."""
    base_prompt = f"""You are an expert ecology educator. Generate an educational lesson about: {topic}

The lesson should:
- Be clear, engaging, and informative
- Focus on practical environmental impact
- Be approximately 200-300 words
- Be suitable for general audiences

After the lesson, provide exactly 3 concrete actions users can take.

Format your response as JSON:
{{
  "lesson": "Your lesson content here...",
  "actions": [
    {{"title": "Action 1 Title", "description": "Brief description"}},
    {{"title": "Action 2 Title", "description": "Brief description"}},
    {{"title": "Action 3 Title", "description": "Brief description"}}
  ]
}}"""

    if previous_topics:
        topics_str = ", ".join(previous_topics)
        base_prompt += f"\n\nNote: This user has previously learned about: {topics_str}. Build on this knowledge if relevant."
    
    return base_prompt


async def call_gpt_api(prompt: str) -> dict[str, Any]:
    """Call the GPT API and return the response."""
    settings = get_settings()
    
    if not settings.gpt_api_key:
        raise LessonServiceError("GPT API key not configured")
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": settings.gpt_api_key
    }
    
    payload = {
        "messages": [
            {
                "role": "system",
                "content": "You are an expert ecology educator. Always respond with valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "stream": False,
        "max_tokens": 1000
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.gpt_api_url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Extract content from response
            # The API returns: {"choices": [{"message": {"content": "..."}}]}
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0]["message"]["content"]
                # Parse the JSON content
                return json.loads(content)
            else:
                raise LessonServiceError("Unexpected API response format")
                
    except httpx.HTTPStatusError as e:
        raise LessonServiceError(f"GPT API request failed: {e.response.status_code}")
    except httpx.RequestError as e:
        raise LessonServiceError(f"GPT API connection error: {str(e)}")
    except json.JSONDecodeError as e:
        raise LessonServiceError(f"Failed to parse GPT response as JSON: {str(e)}")


async def generate_lesson(
    topic: str,
    db: AsyncSession | None = None,
    user_id: int | None = None
) -> LessonResponse:
    """
    Generate an adaptive ecology lesson.
    
    Args:
        topic: The ecology topic to teach
        db: Database session (optional, for user history)
        user_id: User ID (optional, for personalized content)
    
    Returns:
        LessonResponse with lesson content and 3 actions
    
    Raises:
        LessonServiceError: If lesson generation fails
    """
    # Get user history if available
    previous_topics = None
    if db and user_id:
        previous_topics = await get_user_lesson_history(db, user_id)
    
    # Build prompt
    prompt = build_lesson_prompt(topic, previous_topics)
    
    # Call GPT API
    gpt_response = await call_gpt_api(prompt)
    
    # Validate response structure
    if "lesson" not in gpt_response or "actions" not in gpt_response:
        raise LessonServiceError("Invalid GPT response structure")
    
    if len(gpt_response["actions"]) != 3:
        raise LessonServiceError("GPT must return exactly 3 actions")
    
    # Parse actions
    actions = [
        LessonAction(
            title=action["title"],
            description=action["description"]
        )
        for action in gpt_response["actions"]
    ]
    
    # Create response
    lesson_response = LessonResponse(
        lesson=gpt_response["lesson"],
        actions=actions,
        topic=topic
    )
    
    # Save to history if user_id provided
    if db and user_id:
        await save_lesson_history(db, user_id, topic, gpt_response["lesson"])
    
    return lesson_response
