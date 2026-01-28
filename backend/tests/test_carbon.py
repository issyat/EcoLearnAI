"""Tests for carbon tracking endpoint (TDD approach)."""
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models import User
from app.security import hash_password


@pytest.mark.anyio
async def test_record_action_success() -> None:
    """Test successful carbon action recording."""
    from tests.conftest import TestSessionLocal

    # Create test user
    async with TestSessionLocal() as session:
        hashed_pw = hash_password("ValidPass123!")
        user = User(email="carbon@example.com", password_hash=hashed_pw)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        user_id = user.id

    # Mock Climatiq API response
    mock_co2_response = 2.5  # kg CO2 saved

    with patch(
        "app.carbon.calculate_action_co2", new_callable=AsyncMock
    ) as mock_calc:
        mock_calc.return_value = mock_co2_response

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/users/action",
                json={"user_id": user_id, "action_code": "recycle_plastic"}
            )

    assert response.status_code == 200
    data = response.json()
    assert data["co2_kg"] == 2.5
    assert data["cumulative_co2_kg"] >= 2.5
    assert data["action_code"] == "recycle_plastic"
    assert "trees_planted" in data


@pytest.mark.anyio
async def test_record_action_cumulative() -> None:
    """Test that cumulative CO2 increases with multiple actions."""
    from tests.conftest import TestSessionLocal

    # Create test user
    async with TestSessionLocal() as session:
        hashed_pw = hash_password("ValidPass123!")
        user = User(email="cumulative@example.com", password_hash=hashed_pw)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        user_id = user.id

    with patch(
        "app.carbon.calculate_action_co2", new_callable=AsyncMock
    ) as mock_calc:
        # First action: 2.5 kg
        mock_calc.return_value = 2.5

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response1 = await ac.post(
                "/api/v1/users/action",
                json={"user_id": user_id, "action_code": "recycle_plastic"}
            )

        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["co2_kg"] == 2.5
        cumulative1 = data1["cumulative_co2_kg"]

        # Second action: 3.0 kg
        mock_calc.return_value = 3.0

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response2 = await ac.post(
                "/api/v1/users/action",
                json={"user_id": user_id, "action_code": "public_transport"}
            )

        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["co2_kg"] == 3.0
        assert data2["cumulative_co2_kg"] == cumulative1 + 3.0


@pytest.mark.anyio
async def test_record_action_invalid_user() -> None:
    """Test that non-existent user returns error."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/api/v1/users/action",
            json={"user_id": 99999, "action_code": "recycle_plastic"}
        )

    assert response.status_code == 404
    assert "user not found" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_record_action_missing_fields() -> None:
    """Test validation error for missing required fields."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Missing action_code
        response = await ac.post(
            "/api/v1/users/action",
            json={"user_id": 1}
        )

    assert response.status_code == 422


@pytest.mark.anyio
async def test_record_action_empty_action_code() -> None:
    """Test validation error for empty action code."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/api/v1/users/action",
            json={"user_id": 1, "action_code": ""}
        )

    assert response.status_code == 422


@pytest.mark.anyio
async def test_record_action_climatiq_error() -> None:
    """Test graceful handling of Climatiq API errors."""
    from app.carbon_service import CarbonServiceError
    from tests.conftest import TestSessionLocal

    # Create test user
    async with TestSessionLocal() as session:
        hashed_pw = hash_password("ValidPass123!")
        user = User(email="error@example.com", password_hash=hashed_pw)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        user_id = user.id

    with patch(
        "app.carbon.calculate_action_co2", new_callable=AsyncMock
    ) as mock_calc:
        mock_calc.side_effect = CarbonServiceError("Climatiq API unavailable")

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/users/action",
                json={"user_id": user_id, "action_code": "recycle_plastic"}
            )

    assert response.status_code == 500
    detail = response.json()["detail"].lower()
    assert "error" in detail or "failed" in detail


@pytest.mark.anyio
async def test_trees_planted_calculation() -> None:
    """Test that trees_planted is calculated correctly."""
    from tests.conftest import TestSessionLocal

    # Create test user
    async with TestSessionLocal() as session:
        hashed_pw = hash_password("ValidPass123!")
        user = User(email="trees@example.com", password_hash=hashed_pw)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        user_id = user.id

    # Mock: 21.77 kg CO2 = 1 tree
    with patch(
        "app.carbon.calculate_action_co2", new_callable=AsyncMock
    ) as mock_calc:
        mock_calc.return_value = 21.77

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/users/action",
                json={"user_id": user_id, "action_code": "recycle_plastic"}
            )

    assert response.status_code == 200
    data = response.json()
    assert data["trees_planted"] is not None
    # Should be approximately 1 tree
    assert 0.99 <= data["trees_planted"] <= 1.01
