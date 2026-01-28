from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.db import get_db
from app.main import app
from app.models import Base


# Use a local SQLite database for tests to avoid needing an external Postgres instance
_TEST_DB_PATH = Path(__file__).parent / "test.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{_TEST_DB_PATH.as_posix()}"

# Create a single engine for all tests
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestSessionLocal = async_sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


async def override_get_db():
    """Override database dependency for testing."""
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def event_loop_policy():
    """Set event loop policy for Windows compatibility."""
    import asyncio
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


@pytest.fixture(scope="function", autouse=True)
async def setup_database():
    """Create and clean test database for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
