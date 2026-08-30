import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("JWT_SECRET", "test-secret-key-with-at-least-32-chars!!")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "chatpy_test")


@pytest.fixture(autouse=True)
def reset_login_lockout():
    from middleware.security import login_lockout

    login_lockout.reset()
    yield
    login_lockout.reset()


@pytest.fixture
def mock_collections():
    import database.connection as db_conn

    mock_users = AsyncMock()
    mock_messages = AsyncMock()
    mock_refresh = AsyncMock()
    mock_db = MagicMock()

    db_conn.users_collection = mock_users
    db_conn.messages_collection = mock_messages
    db_conn.refresh_tokens_collection = mock_refresh

    async def fake_get_database():
        return mock_db

    with patch("database.connection.get_database", fake_get_database), patch(
        "database.migrations.run_database_migrations", AsyncMock()
    ), patch(
        "services.refresh_token_service.refresh_token_service.save_refresh_token",
        AsyncMock(),
    ), patch(
        "services.refresh_token_service.refresh_token_service.revoke_refresh_token",
        AsyncMock(),
    ), patch(
        "services.refresh_token_service.refresh_token_service.validate_refresh_token",
        AsyncMock(return_value=True),
    ), patch(
        "services.refresh_token_service.refresh_token_service.revoke_all_user_tokens",
        AsyncMock(return_value=0),
    ):
        yield {
            "users": mock_users,
            "messages": mock_messages,
            "refresh_tokens": mock_refresh,
        }

    db_conn.users_collection = None
    db_conn.messages_collection = None
    db_conn.refresh_tokens_collection = None


@pytest.fixture
async def client(mock_collections):
    from httpx import ASGITransport, AsyncClient
    from main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, mock_collections
