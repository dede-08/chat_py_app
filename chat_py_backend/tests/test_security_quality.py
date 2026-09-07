import hashlib
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

from fastapi import FastAPI
from pymongo.errors import DuplicateKeyError
from starlette.testclient import TestClient

from middleware.security import RateLimiter, rate_limit_middleware


# refresh tokens se guardan/consultan siempre con su hash, nunca en claro
async def test_save_refresh_token_stores_hash(monkeypatch):
    import database.connection as db_conn
    from services.refresh_token_service import refresh_token_service

    mock_refresh = AsyncMock()
    monkeypatch.setattr(db_conn, "refresh_tokens_collection", mock_refresh)

    token = "my-secret-refresh-token"
    await refresh_token_service.save_refresh_token("user@test.com", token)

    inserted = mock_refresh.insert_one.call_args[0][0]
    assert inserted["refresh_token"] != token
    assert inserted["refresh_token"] == hashlib.sha256(token.encode()).hexdigest()
    assert inserted["user_email"] == "user@test.com"


async def test_validate_refresh_token_queries_by_hash(monkeypatch):
    import database.connection as db_conn
    from services.refresh_token_service import refresh_token_service

    mock_refresh = AsyncMock()
    mock_refresh.find_one.return_value = {
        "_id": "tok-1",
        "expires_at": datetime.now(UTC) + timedelta(days=1),
    }
    monkeypatch.setattr(db_conn, "refresh_tokens_collection", mock_refresh)

    token = "jwt-refresh-token"
    assert await refresh_token_service.validate_refresh_token(token, "user@test.com") is True

    query = mock_refresh.find_one.call_args[0][0]
    assert query["refresh_token"] == hashlib.sha256(token.encode()).hexdigest()
    assert query["user_email"] == "user@test.com"
    assert query["is_revoked"] is False


async def test_validate_refresh_token_naive_utc_not_expired(monkeypatch):
    import database.connection as db_conn
    from services.refresh_token_service import refresh_token_service

    mock_refresh = AsyncMock()
    # mongo devuelve datetimes sin tzinfo (naive UTC)
    mock_refresh.find_one.return_value = {
        "_id": "tok-1",
        "expires_at": datetime.now(UTC).replace(tzinfo=None) + timedelta(days=1),
    }
    monkeypatch.setattr(db_conn, "refresh_tokens_collection", mock_refresh)

    assert await refresh_token_service.validate_refresh_token("jwt-token", "user@test.com") is True


async def test_validate_refresh_token_naive_utc_expired(monkeypatch):
    import database.connection as db_conn
    from services.refresh_token_service import refresh_token_service

    mock_refresh = AsyncMock()
    mock_refresh.find_one.return_value = {
        "_id": "tok-1",
        "expires_at": datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1),
    }
    monkeypatch.setattr(db_conn, "refresh_tokens_collection", mock_refresh)

    assert await refresh_token_service.validate_refresh_token("jwt-token", "user@test.com") is False
    # se marca como revocado
    assert mock_refresh.update_one.call_args[0][1] == {"$set": {"is_revoked": True}}


async def test_revoke_refresh_token_queries_by_hash(monkeypatch):
    import database.connection as db_conn
    from services.refresh_token_service import refresh_token_service

    mock_refresh = AsyncMock()
    mock_refresh.update_one.return_value.modified_count = 1
    monkeypatch.setattr(db_conn, "refresh_tokens_collection", mock_refresh)

    token = "jwt-refresh-token"
    assert await refresh_token_service.revoke_refresh_token(token, "user@test.com") is True

    query = mock_refresh.update_one.call_args[0][0]
    assert query["refresh_token"] == hashlib.sha256(token.encode()).hexdigest()
    assert query["user_email"] == "user@test.com"


# user_service: extraccion del campo que viola unicidad
def test_duplicate_key_field_email():
    from services.user_service import user_service

    e = DuplicateKeyError("duplicate key", 11000, {"keyPattern": {"email": 1}})
    assert user_service.duplicate_key_field(e) == "email"


def test_duplicate_key_field_username():
    from services.user_service import user_service

    e = DuplicateKeyError("duplicate key", 11000, {"keyPattern": {"username": 1}})
    assert user_service.duplicate_key_field(e) == "username"


def test_duplicate_key_field_unknown_defaults_to_field():
    from services.user_service import user_service

    e = DuplicateKeyError("duplicate key", 11000, {"keyPattern": {"telephone": 1}})
    assert user_service.duplicate_key_field(e) == "campo"


# route/upload.py: deteccion de imagenes por magic bytes (reemplazo de imghdr)
def test_detect_image_ext_jpeg():
    from routes.upload import _detect_image_ext

    assert _detect_image_ext(b"\xff\xd8\xff\xe0" + b"\x00" * 8) == "jpg"


def test_detect_image_ext_png():
    from routes.upload import _detect_image_ext

    assert _detect_image_ext(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8) == "png"


def test_detect_image_ext_webp():
    from routes.upload import _detect_image_ext

    assert _detect_image_ext(b"RIFF\x00\x00\x00\x00WEBP") == "webp"


def test_detect_image_ext_rejects_non_images():
    from routes.upload import _detect_image_ext

    assert _detect_image_ext(b"plain text content") is None
    assert _detect_image_ext(b"") is None


# middleware de rate limit: respuesta 429 debe incluir Retry-After
def test_rate_limited_response_includes_retry_after():
    app = FastAPI()
    limiter = RateLimiter(max_requests=2, window_seconds=60)

    @app.middleware("http")
    async def limiter_mw(request, call_next):
        return await rate_limit_middleware(request, call_next, limiter)

    @app.get("/test")
    async def endpoint():
        return {"ok": True}

    client = TestClient(app)

    assert client.get("/test").status_code == 200
    assert client.get("/test").status_code == 200

    blocked = client.get("/test")
    assert blocked.status_code == 429
    assert blocked.headers.get("retry-after") == "60"
