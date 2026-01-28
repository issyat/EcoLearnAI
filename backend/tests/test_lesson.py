"""Tests for lesson endpoint (TDD approach)."""
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas import LessonAction, LessonResponse


@pytest.mark.anyio
async def test_generate_lesson_success() -> None:
    """Test successful lesson generation."""
    mock_response = LessonResponse(
        lesson="Climate change is a critical environmental issue...",
        actions=[
            LessonAction(
                title="Reduce energy consumption",
                description="Turn off lights when not in use",
                action_code="led_bulb"
            ),
            LessonAction(
                title="Use public transport",
                description="Reduce carbon footprint by using buses or trains",
                action_code="public_transport"
            ),
            LessonAction(
                title="Plant trees",
                description="Participate in local tree planting initiatives",
                action_code="plant_tree"
            )
        ],
        topic="climate change"
    )
    
    with patch("app.lessons.generate_lesson", new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = mock_response
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/users/lesson",
                json={"topic": "climate change"}
            )
    
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "climate change"
    assert "lesson" in data
    assert len(data["actions"]) == 3
    assert all("title" in action and "description" in action for action in data["actions"])


@pytest.mark.anyio
async def test_generate_lesson_with_user_id() -> None:
    """Test lesson generation with user ID for personalization."""
    mock_response = LessonResponse(
        lesson="Building on your previous knowledge of recycling...",
        actions=[
            LessonAction(
                title="Start composting",
                description="Turn organic waste into fertilizer",
                action_code="reduce_meat"
            ),
            LessonAction(
                title="Buy local products",
                description="Support local farmers and reduce transport emissions",
                action_code="bike_commute"
            ),
            LessonAction(
                title="Reduce plastic use",
                description="Use reusable bags and containers",
                action_code="reusable_bag"
            )
        ],
        topic="sustainable living"
    )
    
    with patch("app.lessons.generate_lesson", new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = mock_response
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/users/lesson",
                json={"topic": "sustainable living", "user_id": 1}
            )
    
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "sustainable living"
    assert len(data["actions"]) == 3


@pytest.mark.anyio
async def test_generate_lesson_empty_topic() -> None:
    """Test that empty topic returns validation error."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/users/lesson",
            json={"topic": ""}
        )
    
    assert response.status_code == 422  # Unprocessable entity


@pytest.mark.anyio
async def test_generate_lesson_missing_topic() -> None:
    """Test that missing topic returns validation error."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/users/lesson",
            json={}
        )
    
    assert response.status_code == 422


@pytest.mark.anyio
async def test_generate_lesson_topic_too_long() -> None:
    """Test that topic exceeding max length returns validation error."""
    long_topic = "a" * 201  # Exceeds 200 char limit
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/users/lesson",
            json={"topic": long_topic}
        )
    
    assert response.status_code == 422


@pytest.mark.anyio
async def test_generate_lesson_service_error() -> None:
    """Test that service errors are handled gracefully."""
    from app.lesson_service import LessonServiceError
    
    with patch("app.lessons.generate_lesson", new_callable=AsyncMock) as mock_generate:
        mock_generate.side_effect = LessonServiceError("GPT API Error")
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/users/lesson",
                json={"topic": "renewable energy"}
            )
    
    assert response.status_code == 500
    detail = response.json()["detail"].lower()
    assert "error" in detail or "failed" in detail
