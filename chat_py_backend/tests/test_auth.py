import pytest
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.mark.asyncio
async def test_password_requirements(client):
    ac, _ = client
    response = await ac.get("/auth/password-requirements")
    assert response.status_code == 200
    data = response.json()
    assert data["min_length"] == 8
    assert data["require_uppercase"] is True


@pytest.mark.asyncio
async def test_validate_password_weak(client):
    ac, _ = client
    response = await ac.post("/auth/validate-password", json={"password": "abc"})
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert len(data["errors"]) > 0


@pytest.mark.asyncio
async def test_login_success(client):
    ac, mocks = client
    hashed = pwd_context.hash("SecurePass1!")
    mocks["users"].find_one.return_value = {
        "email": "user@test.com",
        "username": "testuser",
        "password": hashed,
        "is_email_confirmed": True,
    }

    response = await ac.post(
        "/auth/login",
        json={"email": "user@test.com", "password": "SecurePass1!"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "user@test.com"
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    ac, mocks = client
    hashed = pwd_context.hash("SecurePass1!")
    mocks["users"].find_one.return_value = {
        "email": "user@test.com",
        "username": "testuser",
        "password": hashed,
        "is_email_confirmed": True,
    }

    response = await ac.post(
        "/auth/login",
        json={"email": "user@test.com", "password": "WrongPass1!"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Credenciales invalidas"


@pytest.mark.asyncio
async def test_login_lockout_after_max_attempts(client):
    ac, mocks = client
    mocks["users"].find_one.return_value = None

    for _ in range(5):
        response = await ac.post(
            "/auth/login",
            json={"email": "locked@test.com", "password": "WrongPass1!"},
        )
        assert response.status_code == 400

    response = await ac.post(
        "/auth/login",
        json={"email": "locked@test.com", "password": "WrongPass1!"},
    )
    assert response.status_code == 429
    assert "bloqueada" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_health_check(client):
    ac, _ = client
    response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
