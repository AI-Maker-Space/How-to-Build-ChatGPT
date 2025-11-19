import sys
import os
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_api_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

if __name__ == "__main__":
    print("Running health check tests...")
    test_health_endpoint()
    print("✅ /health passed")
    test_api_health_endpoint()
    print("✅ /api/health passed")
    print("All tests passed!")

