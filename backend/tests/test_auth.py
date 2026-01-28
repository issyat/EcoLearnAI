import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.main import app
from app.models import User


@pytest.mark.anyio
async def test_register_success() -> None:
    """Test successful user registration."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "StrongPass123!"
            }
        )
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "password" not in data
    assert "created_at" in data


@pytest.mark.anyio
async def test_register_duplicate_email() -> None:
    """Test registration with duplicate email fails."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # First registration
        await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "StrongPass123!"
            }
        )
        
        # Attempt duplicate registration
        response = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "AnotherPass123!"
            }
        )
    
    assert response.status_code == 400
    assert "email already registered" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_register_weak_password() -> None:
    """Test registration with weak password fails."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "123"
            }
        )
    
    assert response.status_code == 400
    assert "password" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_register_invalid_email() -> None:
    """Test registration with invalid email fails."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "StrongPass123!"
            }
        )
    
    assert response.status_code == 422


@pytest.mark.anyio
async def test_password_is_hashed() -> None:
    """Test that password is hashed in database."""
    from tests.conftest import TestSessionLocal
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "hashed@example.com",
                "password": "MyPassword123!"
            }
        )
    
    assert response.status_code == 201
    
    # Verify password is hashed in DB
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "hashed@example.com")
        )
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.password_hash != "MyPassword123!"
        assert user.password_hash.startswith("$2b$")  # bcrypt hash
