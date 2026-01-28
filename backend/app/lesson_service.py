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


def build_lesson_prompt(
    topic: str, previous_topics: list[str] | None = None
) -> str:
    """Build the GPT prompt for lesson generation."""
    base_prompt = (
        f"You are an expert ecology educator. "
        f"Generate an educational lesson about: {topic}\n\n"
        "The lesson should:\n"
        "- Be clear, engaging, and informative\n"
        "- Focus on practical environmental impact\n"
        "- Be approximately 200-300 words\n"
        "- Be suitable for general audiences\n\n"
        "After the lesson, provide exactly 3 concrete actions users can take.\n\n"
        "Format your response as JSON:\n"
        "{\n"
        '  "lesson": "Your lesson content here...",\n'
        '  "actions": [\n'
        '    {"title": "Action 1 Title", "description": "Brief description", "action_code": "action_code_1"},\n'
        '    {"title": "Action 2 Title", "description": "Brief description", "action_code": "action_code_2"},\n'
        '    {"title": "Action 3 Title", "description": "Brief description", "action_code": "action_code_3"}\n'
        "  ]\n"
        "}\n\n"
        "ACTION CODES: For action_code, use one of: recycle_plastic, recycle_paper, public_transport, bike_commute, plant_tree, reduce_meat, led_bulb, reusable_bag\n"
        "Choose the most appropriate code for each action based on the topic and action content."
    )

    if previous_topics:
        topics_str = ", ".join(previous_topics)
        base_prompt += (
            f"\n\nNote: This user has previously learned about: {topics_str}. "
            "Build on this knowledge if relevant."
        )
    
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
                "content": "You are an expert ecology educator."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
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
                if not content or not content.strip():
                    raise LessonServiceError("GPT API returned empty content")
                
                # Try to parse as JSON first (if it's properly formatted)
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    # If not JSON, treat the entire response as the lesson content
                    return {
                        "lesson": content,
                        "actions": [
                            {"title": "Learn More", "description": "Explore related topics", "action_code": "reduce_meat"},
                            {"title": "Take Action", "description": "Apply these concepts", "action_code": "led_bulb"},
                            {"title": "Share Knowledge", "description": "Teach others", "action_code": "bike_commute"}
                        ]
                    }
            else:
                raise LessonServiceError(f"Unexpected API response format: {data}")
                
    except httpx.HTTPStatusError as e:
        raise LessonServiceError(f"GPT API request failed: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        raise LessonServiceError(f"GPT API connection error: {str(e)}")


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
            description=action["description"],
            action_code=action.get("action_code", "reduce_meat")  # Default fallback
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
