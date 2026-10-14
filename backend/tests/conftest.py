import os
import sys
from pathlib import Path

DB = Path(__file__).parent / "test.db"
if DB.exists():
    DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{DB}"
os.environ["SEED_ON_START"] = "true"
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _token(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _token(client, "admin@salesia.com", "admin123")


@pytest.fixture(scope="session")
def vendedor(client):
    return _token(client, "vendedor@salesia.com", "vendedor123")


@pytest.fixture(scope="session")
def analista(client):
    return _token(client, "analista@salesia.com", "analista123")


@pytest.fixture(scope="session")
def almacen(client):
    return _token(client, "almacen@salesia.com", "almacen123")
