"""Test stage endpoints for AI entity generation workflow."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def sample_station(client):
    """Create a sample station for testing."""
    response = client.post(
        "/api/v1/stations",
        json={
            "name": "Test Station",
            "frequency": "99.8 FM",
            "genre": "synthwave",
        },
    )
    assert response.status_code == 200
    return response.json()


class TestUniverseStaging:
    """Test /api/v1/universes/staged endpoint."""

    def test_stage_universe_success(self, client):
        """Test staging a universe with AI-generated data."""
        response = client.post(
            "/api/v1/universes/staged",
            json={
                "name": "Cyberpunk 2077",
                "description": "A dystopian future megacity...",
                "publisher": "CD Projekt Red",
                "genre_hints": "cyberpunk|noir",
                "mood_hints": "dark|dangerous",
                "created_by": "test_user",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Cyberpunk 2077"
        assert data["status"] == "draft"
        assert data["description"] == "A dystopian future megacity..."
        assert data["publisher"] == "CD Projekt Red"

    def test_stage_universe_duplicate_name(self, client):
        """Test that duplicate universe names are rejected."""
        # Create first universe
        client.post(
            "/api/v1/universes/staged",
            json={
                "name": "The Witcher 3",
                "description": "A fantasy world...",
                "created_by": "test_user",
            },
        )

        # Try to create duplicate
        response = client.post(
            "/api/v1/universes/staged",
            json={
                "name": "The Witcher 3",
                "description": "Different description",
                "created_by": "test_user",
            },
        )
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]["error"]

    def test_stage_universe_rate_limit(self, client):
        """Test rate limiting for universe staging."""
        # This test would need Redis to be properly set up
        # For now, we'll just verify the endpoint doesn't crash
        response = client.post(
            "/api/v1/universes/staged",
            json={
                "name": "Test Universe 1",
                "created_by": "rate_test_user",
            },
        )
        assert response.status_code in [200, 429]


class TestJingleStaging:
    """Test /api/v1/jingles/staged endpoint."""

    def test_stage_jingle_success(self, client, sample_station):
        """Test staging a jingle with AI-generated data."""
        response = client.post(
            "/api/v1/jingles/staged",
            json={
                "station_id": sample_station["id"],
                "name": "Intro Jingle",
                "jingle_type": "intro",
                "description": "Futuristic intro sound...",
                "created_by": "test_user",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Intro Jingle"
        assert data["jingle_type"] == "intro"
        assert data["station_id"] == sample_station["id"]
        assert data["status"] == "pending"

    def test_stage_jingle_invalid_station(self, client):
        """Test that invalid station ID is rejected."""
        response = client.post(
            "/api/v1/jingles/staged",
            json={
                "station_id": "nonexistent-station",
                "name": "Test Jingle",
                "created_by": "test_user",
            },
        )
        assert response.status_code == 404
        assert "Station not found" in response.json()["detail"]

    def test_stage_jingle_minimal_fields(self, client, sample_station):
        """Test staging a jingle with minimal required fields."""
        response = client.post(
            "/api/v1/jingles/staged",
            json={
                "station_id": sample_station["id"],
                "name": "Minimal Jingle",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Jingle"
        assert data["jingle_type"] == "bumper"  # default value
        assert data["description"] == ""


class TestDraftStaging:
    """Test /api/v1/drafts/staged endpoint."""

    def test_stage_draft_success(self, client):
        """Test staging a draft with AI-generated data."""
        response = client.post(
            "/api/v1/drafts/staged",
            json={
                "station_name": "Dream Station",
                "artist_name": "Night Owl",
                "genre": "ambient",
                "mood": "relaxing",
                "items": "Synth|Pad|Effect",
                "script": "Welcome to the dream...",
                "backstory": "A late-night show for insomniacs...",
                "created_by": "test_user",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["station_name"] == "Dream Station"
        assert data["artist_name"] == "Night Owl"
        assert data["genre"] == "ambient"
        assert data["status"] == "draft"

    def test_stage_draft_with_links(self, client):
        """Test staging a draft with station/artist links."""
        # Create a station first
        station_resp = client.post(
            "/api/v1/stations",
            json={"name": "Linked Station", "genre": "electronic"},
        )
        station_id = station_resp.json()["id"]

        # Stage a draft linked to that station
        response = client.post(
            "/api/v1/drafts/staged",
            json={
                "station_id": station_id,
                "station_name": "Linked Station",
                "artist_name": "AI Artist",
                "created_by": "test_user",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["station_id"] == station_id

    def test_stage_draft_minimal_fields(self, client):
        """Test staging a draft with only required fields."""
        response = client.post(
            "/api/v1/drafts/staged",
            json={
                "station_name": "Minimal Station",
                "artist_name": "Minimal Artist",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["station_name"] == "Minimal Station"
        assert data["artist_name"] == "Minimal Artist"
        assert data["genre"] == ""  # default
        assert data["status"] == "draft"


class TestEndToEndWorkflow:
    """Test complete chat-to-form workflow."""

    def test_universe_workflow(self, client):
        """Test creating universe via stage endpoint."""
        # Stage universe (AI suggestion)
        stage_response = client.post(
            "/api/v1/universes/staged",
            json={
                "name": "Workflow Test Universe",
                "description": "Testing the full workflow",
                "genre_hints": "scifi",
                "created_by": "workflow_test",
            },
        )
        assert stage_response.status_code == 200
        universe_id = stage_response.json()["id"]

        # Verify it appears in list with draft status
        list_response = client.get("/api/v1/universes?status=draft")
        assert list_response.status_code == 200
        universes = list_response.json()
        assert any(u["id"] == universe_id for u in universes)

        # Verify we can get it directly
        detail_response = client.get(f"/api/v1/universes/{universe_id}")
        assert detail_response.status_code == 200
        assert detail_response.json()["status"] == "draft"

    def test_jingle_workflow(self, client):
        """Test creating jingle via stage endpoint."""
        # Create station
        station_resp = client.post(
            "/api/v1/stations",
            json={"name": "Jingle Test Station", "genre": "pop"},
        )
        station_id = station_resp.json()["id"]

        # Stage jingle
        stage_response = client.post(
            "/api/v1/jingles/staged",
            json={
                "station_id": station_id,
                "name": "Test Jingle",
                "description": "Testing jingle workflow",
                "created_by": "workflow_test",
            },
        )
        assert stage_response.status_code == 200
        jingle_id = stage_response.json()["id"]

        # Verify it appears in station's jingles list
        list_response = client.get(f"/api/v1/stations/{station_id}/jingles")
        assert list_response.status_code == 200
        jingles = list_response.json()
        assert any(j["id"] == jingle_id for j in jingles)

        # Verify jingle was created (station jingles list includes it)
        verify_response = client.get(f"/api/v1/stations/{station_id}/jingles")
        assert verify_response.status_code == 200
        assert any(j["id"] == jingle_id for j in verify_response.json())

    def test_draft_workflow(self, client):
        """Test creating draft via stage endpoint."""
        # Stage draft
        stage_response = client.post(
            "/api/v1/drafts/staged",
            json={
                "station_name": "Draft Test Station",
                "artist_name": "Draft Test Artist",
                "genre": "rock",
                "created_by": "workflow_test",
            },
        )
        assert stage_response.status_code == 200
        draft_id = stage_response.json()["id"]

        # Verify it appears in drafts list
        list_response = client.get("/api/v1/drafts?status=draft")
        assert list_response.status_code == 200
        data = list_response.json()
        draft_in_list = next((d for d in data["drafts"] if d["id"] == draft_id), None)
        assert draft_in_list is not None
        assert draft_in_list["status"] == "draft"
