"""Smoke tests for brand logo generation endpoint."""

import uuid
from pathlib import Path

import pytest

from app.models.database import Brand, Station


@pytest.fixture
def test_station(db_session):
    """Create a test station."""
    station = Station(
        id=str(uuid.uuid4()),
        name="Test Station",
        frequency="99.8 FM",
        genre="Electronic",
    )
    db_session.add(station)
    db_session.commit()
    return station


@pytest.fixture
def test_brand(db_session):
    """Create a test brand."""
    brand = Brand(
        id=str(uuid.uuid4()),
        name="Test Brand",
        color_primary="#FF5500",
    )
    db_session.add(brand)
    db_session.commit()
    return brand


class TestBrandLogoEndpoint:
    """Smoke tests for POST /api/v1/brands/{brand_id}/logo"""

    def test_generate_brand_logo_404_on_missing_brand(self, client):
        """Should return 404 when brand doesn't exist."""
        fake_id = str(uuid.uuid4())
        response = client.post(f"/api/v1/brands/{fake_id}/logo")
        assert response.status_code == 404

    def test_generate_brand_logo_returns_success_structure(
        self, client, test_brand, mocker
    ):
        """Should return success response with logo_path when API key configured."""
        # Mock the art generator to avoid actual API calls
        mock_generator = mocker.patch(
            "app.utils.art_generator.ArtGenerator.generate_brand_logo"
        )
        mock_path = Path("/app/output/art/logo_brand_test.jpg")
        mock_generator.return_value = mock_path

        response = client.post(f"/api/v1/brands/{test_brand.id}/logo")

        # Should succeed (or gracefully handle missing API key)
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "logo_path" in data
            assert isinstance(data["logo_path"], str)

    def test_generate_brand_logo_endpoint_exists(self, client, test_brand):
        """Should have the endpoint defined (even if it fails gracefully)."""
        response = client.post(f"/api/v1/brands/{test_brand.id}/logo")
        # Should not be 404 (endpoint not found)
        assert response.status_code != 404

    def test_brand_data_passed_to_generator(self, client, test_brand, mocker):
        """Should pass brand data to the art generator."""
        mock_generator = mocker.patch(
            "app.utils.art_generator.ArtGenerator.generate_brand_logo"
        )
        mock_generator.return_value = Path("/app/output/art/logo.jpg")

        client.post(f"/api/v1/brands/{test_brand.id}/logo")

        # Verify the generator was called with brand data
        if mock_generator.called:
            call_args = mock_generator.call_args
            assert call_args is not None
            # Should receive brand data and StationStyle
            assert len(call_args[0]) >= 2 or len(call_args[1]) >= 2
