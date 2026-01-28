"""Tests for login endpoint."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models import User
from app.security import hash_password


@pytest.mark.anyio
async def test_login_success() -> None:
    """Test successful login returns JWT token."""
    from tests.conftest import TestSessionLocal

    # Create a test user first
    async with TestSessionLocal() as session:
        hashed_pw = hash_password("ValidPass123!")
        user = User(email="login@example.com", password_hash=hashed_pw)
        session.add(user)
        await session.commit()

    # Test login
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "login@example.com",
                "password": "ValidPass123!"
            }
        )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["email"] == "login@example.com"


@pytest.mark.anyio
async def test_login_invalid_credentials() -> None:
    """Test login with invalid credentials fails."""
    from tests.conftest import TestSessionLocal

    # Create a test user
    async with TestSessionLocal() as session:
        hashed_pw = hash_password("ValidPass123!")
        user = User(email="user@example.com", password_hash=hashed_pw)
        session.add(user)
        await session.commit()

    # Test login with wrong password
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "user@example.com",
                "password": "WrongPassword123!"
            }
        )

    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_login_user_not_found() -> None:
    """Test login with non-existent email fails."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "ValidPass123!"
            }
        )

    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_login_missing_email() -> None:
    """Test login with missing email fails."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"password": "ValidPass123!"}
        )

    assert response.status_code == 422  # Unprocessable entity


@pytest.mark.anyio
async def test_login_missing_password() -> None:
    """Test login with missing password fails."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com"}
        )

    assert response.status_code == 422


@pytest.mark.anyio
async def test_jwt_token_has_correct_claims() -> None:
    """Test JWT token contains correct claims."""
    import jwt

    from tests.conftest import TestSessionLocal

    # Create a test user
    async with TestSessionLocal() as session:
        hashed_pw = hash_password("ValidPass123!")
        user = User(email="claims@example.com", password_hash=hashed_pw)
        session.add(user)
        await session.commit()
        user_id = user.id

    # Login and get token
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "claims@example.com",
                "password": "ValidPass123!"
            }
        )

    assert response.status_code == 200
    token = response.json()["access_token"]

    # Decode token and check claims
    from app.config import get_settings
    settings = get_settings()
    decoded = jwt.decode(token, settings.secret_key, algorithms=["HS256"])

    assert decoded["sub"] == str(user_id)
    assert decoded["email"] == "claims@example.com"
    assert "exp" in decoded
    assert "iat" in decoded
