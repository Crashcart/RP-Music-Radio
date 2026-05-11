"""
Unit tests for web_scraper.py
Tests data collection, caching, and context formatting.
"""

import asyncio
import json
import pytest
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.utils.web_scraper import (
    scrape_website,
    scrape_all_websites,
    load_cache,
    save_cache,
    get_web_context,
    format_context_for_prompt,
    WEBSITES,
)


class TestWebScraper:
    """Test web scraper functionality"""

    @pytest.mark.asyncio
    async def test_scrape_website_success(self):
        """Test successful website scraping"""
        html_content = """
        <html>
            <h2>Breaking News Title</h2>
            <h3>Article Headline</h3>
            <p>Some content</p>
        </html>
        """

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text = AsyncMock(return_value=html_content)

        mock_session_get = AsyncMock()
        mock_session_get.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session_get.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_session_get)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        with patch(
            "app.utils.web_scraper.aiohttp.ClientSession", return_value=mock_session
        ):
            result = await scrape_website("bbc_news", WEBSITES["bbc_news"])

            assert result is not None
            assert result["source_name"] == "bbc_news"
            assert result["category"] == "news"
            assert "Breaking News" in result["snippet"]

    @pytest.mark.asyncio
    async def test_scrape_website_failure(self):
        """Test handling of failed website scraping"""
        mock_response = AsyncMock()
        mock_response.status = 404

        mock_session_get = AsyncMock()
        mock_session_get.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session_get.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_session_get)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        with patch(
            "app.utils.web_scraper.aiohttp.ClientSession", return_value=mock_session
        ):
            result = await scrape_website("bbc_news", WEBSITES["bbc_news"])
            assert result is None

    @pytest.mark.asyncio
    async def test_scrape_website_timeout(self):
        """Test handling of request timeout"""
        mock_session = AsyncMock()
        mock_session.get = MagicMock(side_effect=asyncio.TimeoutError())
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        with patch(
            "app.utils.web_scraper.aiohttp.ClientSession", return_value=mock_session
        ):
            result = await scrape_website("bbc_news", WEBSITES["bbc_news"])
            assert result is None

    @pytest.mark.asyncio
    async def test_scrape_all_websites(self):
        """Test scraping multiple websites concurrently"""
        html_content = """<html><h2>Test Title</h2><h3>Test Subtitle</h3></html>"""

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text = AsyncMock(return_value=html_content)

        mock_session_get = AsyncMock()
        mock_session_get.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session_get.__aexit__ = AsyncMock(return_value=None)

        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=mock_session_get)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=None)

        with patch(
            "app.utils.web_scraper.aiohttp.ClientSession", return_value=mock_session
        ):
            results = await scrape_all_websites()

            # Should attempt to scrape all 40 websites
            assert len(results) > 0
            # Check structure of first result
            if results:
                assert "source_name" in results[0]
                assert "category" in results[0]
                assert "snippet" in results[0]
                assert "timestamp" in results[0]

    def test_cache_save_and_load(self, tmp_path):
        """Test cache save and load functionality"""
        # Create temporary cache file
        cache_dir = tmp_path / "cache"
        cache_dir.mkdir()

        test_data = [
            {
                "url": "https://example.com",
                "title": "Example",
                "category": "test",
                "snippet": "Test content",
                "timestamp": datetime.utcnow().isoformat(),
                "source_name": "example",
            }
        ]

        # Patch cache directory
        with patch("app.utils.web_scraper.CACHE_DIR", cache_dir):
            with patch("app.utils.web_scraper.CACHE_FILE", cache_dir / "cache.json"):
                # Test save
                assert save_cache(test_data) is True

                # Verify file exists
                assert (cache_dir / "cache.json").exists()

                # Test load
                loaded = load_cache()
                assert loaded is not None
                assert len(loaded) == 1
                assert loaded[0]["source_name"] == "example"

    def test_cache_expiration(self, tmp_path):
        """Test that expired cache is not loaded"""
        cache_dir = tmp_path / "cache"
        cache_dir.mkdir()

        # Create expired cache data
        old_timestamp = (datetime.utcnow() - timedelta(days=2)).isoformat()
        cache_data = {
            "timestamp": old_timestamp,
            "count": 1,
            "content": [
                {
                    "url": "https://example.com",
                    "title": "Example",
                    "category": "test",
                    "snippet": "Old data",
                    "timestamp": old_timestamp,
                    "source_name": "example",
                }
            ],
        }

        cache_file = cache_dir / "cache.json"
        with open(cache_file, "w") as f:
            json.dump(cache_data, f)

        # Patch cache directory and file
        with patch("app.utils.web_scraper.CACHE_DIR", cache_dir):
            with patch("app.utils.web_scraper.CACHE_FILE", cache_file):
                # Should return None because cache is expired
                loaded = load_cache()
                assert loaded is None

    def test_format_context_for_prompt(self):
        """Test formatting web context for system prompt"""
        test_data = [
            {
                "url": "https://bbc.com",
                "title": "BBC News",
                "category": "news",
                "snippet": "Breaking: Important news event",
                "timestamp": datetime.utcnow().isoformat(),
                "source_name": "bbc_news",
            },
            {
                "url": "https://pitchfork.com",
                "title": "Pitchfork",
                "category": "music",
                "snippet": "New album review: Best of the year",
                "timestamp": datetime.utcnow().isoformat(),
                "source_name": "pitchfork",
            },
            {
                "url": "https://techcrunch.com",
                "title": "TechCrunch",
                "category": "tech",
                "snippet": "New AI breakthrough announced",
                "timestamp": datetime.utcnow().isoformat(),
                "source_name": "techcrunch",
            },
        ]

        formatted = format_context_for_prompt(test_data)

        # Check formatted output contains expected content
        assert "Current Web Context" in formatted
        assert "BBC News" in formatted
        assert "Pitchfork" in formatted
        assert "TechCrunch" in formatted
        assert "Breaking: Important news" in formatted
        assert "news" in formatted.lower()
        assert "music" in formatted.lower()
        assert "tech" in formatted.lower()

    def test_format_context_empty(self):
        """Test formatting with no data"""
        formatted = format_context_for_prompt([])
        assert "No current web context available" in formatted

    def test_websites_config(self):
        """Test that WEBSITES config has all required fields"""
        assert len(WEBSITES) == 40, f"Expected 40 websites, got {len(WEBSITES)}"

        for name, config in WEBSITES.items():
            assert "url" in config, f"{name} missing 'url'"
            assert "selector" in config, f"{name} missing 'selector'"
            assert "category" in config, f"{name} missing 'category'"
            assert config["url"].startswith(
                "http"
            ), f"{name} url invalid: {config['url']}"

    def test_categories_coverage(self):
        """Test that websites cover diverse categories"""
        categories = set(config["category"] for config in WEBSITES.values())

        # Should have at least 5 different categories
        assert len(categories) >= 5, f"Expected diverse categories, got: {categories}"

        # Check for expected categories
        expected = {"news", "music", "tech"}
        assert expected.issubset(
            categories
        ), f"Missing categories: {expected - categories}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
