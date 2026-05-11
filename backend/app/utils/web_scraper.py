"""
Web scraper utility for collecting data from 40 popular websites.
Provides real-world context for AI entity generation.
"""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import TypedDict, Optional
from pathlib import Path

import aiohttp
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent.parent / "cache"
CACHE_FILE = CACHE_DIR / "web_scrape_cache.json"
CACHE_DURATION_HOURS = 24  # Refresh cache every 24 hours


class ScrapedContent(TypedDict):
    url: str
    title: str
    category: str
    snippet: str
    timestamp: str
    source_name: str


# 40 popular websites across different categories
WEBSITES = {
    # Music & Entertainment (8)
    "allmusic": {
        "url": "https://www.allmusic.com",
        "selector": "h2, h3",
        "category": "music",
    },
    "pitchfork": {
        "url": "https://pitchfork.com",
        "selector": "h2",
        "category": "music",
    },
    "variety": {
        "url": "https://variety.com",
        "selector": "h2, h3",
        "category": "entertainment",
    },
    "rolling_stone": {
        "url": "https://www.rollingstone.com",
        "selector": "h2, h3",
        "category": "music",
    },
    "bbc_music": {
        "url": "https://www.bbc.com/music",
        "selector": "h2, h3",
        "category": "music",
    },
    "discogs": {
        "url": "https://www.discogs.com/explore",
        "selector": "h2, h3",
        "category": "music",
    },
    "last_fm": {
        "url": "https://www.last.fm",
        "selector": "h2, h3",
        "category": "music",
    },
    "genius": {
        "url": "https://genius.com",
        "selector": "h2, h3",
        "category": "music",
    },
    # News (10)
    "bbc_news": {
        "url": "https://www.bbc.com/news",
        "selector": "h2, h3",
        "category": "news",
    },
    "cnn": {
        "url": "https://www.cnn.com",
        "selector": "h2, h3, span",
        "category": "news",
    },
    "reuters": {
        "url": "https://www.reuters.com",
        "selector": "h2, h3",
        "category": "news",
    },
    "ap_news": {
        "url": "https://apnews.com",
        "selector": "h2, h3",
        "category": "news",
    },
    "npr": {
        "url": "https://www.npr.org",
        "selector": "h2, h3",
        "category": "news",
    },
    "guardian": {
        "url": "https://www.theguardian.com/international",
        "selector": "h2, h3",
        "category": "news",
    },
    "nytimes": {
        "url": "https://www.nytimes.com",
        "selector": "h2, h3, span",
        "category": "news",
    },
    "washington_post": {
        "url": "https://www.washingtonpost.com",
        "selector": "h2, h3",
        "category": "news",
    },
    "aljazeera": {
        "url": "https://www.aljazeera.com",
        "selector": "h2, h3",
        "category": "news",
    },
    "bloomberg": {
        "url": "https://www.bloomberg.com",
        "selector": "h2, h3",
        "category": "news",
    },
    # Culture & Trending (8)
    "reddit": {
        "url": "https://reddit.com/r/all",
        "selector": "h3, span",
        "category": "trending",
    },
    "medium": {
        "url": "https://medium.com",
        "selector": "h2, h3",
        "category": "culture",
    },
    "hackernews": {
        "url": "https://news.ycombinator.com",
        "selector": "span.titleline",
        "category": "tech",
    },
    "producthunt": {
        "url": "https://www.producthunt.com",
        "selector": "h2, h3",
        "category": "innovation",
    },
    "devto": {
        "url": "https://dev.to",
        "selector": "h2, h3",
        "category": "tech",
    },
    "imdb": {
        "url": "https://www.imdb.com/chart/top250/",
        "selector": "h3, span",
        "category": "entertainment",
    },
    "wikipedia": {
        "url": "https://en.wikipedia.org/wiki/Portal:Contents",
        "selector": "h2, h3",
        "category": "reference",
    },
    "substack": {
        "url": "https://substack.com/explore",
        "selector": "h2, h3",
        "category": "culture",
    },
    # Tech & Science (6)
    "techcrunch": {
        "url": "https://techcrunch.com",
        "selector": "h2, h3",
        "category": "tech",
    },
    "the_verge": {
        "url": "https://www.theverge.com",
        "selector": "h2, h3",
        "category": "tech",
    },
    "wired": {
        "url": "https://www.wired.com",
        "selector": "h2, h3",
        "category": "tech",
    },
    "arxiv": {
        "url": "https://arxiv.org",
        "selector": "h2, h3",
        "category": "science",
    },
    "nature": {
        "url": "https://www.nature.com",
        "selector": "h2, h3",
        "category": "science",
    },
    "sciencedaily": {
        "url": "https://www.sciencedaily.com",
        "selector": "h2, h3",
        "category": "science",
    },
    # General/Misc (8)
    "youtube": {
        "url": "https://youtube.com/feed/trending",
        "selector": "h1, h2, h3",
        "category": "entertainment",
    },
    "netflix": {
        "url": "https://www.netflix.com",
        "selector": "h2, h3",
        "category": "entertainment",
    },
    "spotify": {
        "url": "https://open.spotify.com",
        "selector": "h2, h3",
        "category": "music",
    },
    "amazon": {
        "url": "https://www.amazon.com",
        "selector": "h2, h3",
        "category": "commerce",
    },
    "ebay": {
        "url": "https://www.ebay.com",
        "selector": "h2, h3",
        "category": "commerce",
    },
    "slack": {
        "url": "https://slack.com/features",
        "selector": "h2, h3",
        "category": "tech",
    },
    "github": {
        "url": "https://github.com/trending",
        "selector": "h2, h3",
        "category": "tech",
    },
    "stackoverflow": {
        "url": "https://stackoverflow.com/questions?tab=newest",
        "selector": "h2, h3",
        "category": "tech",
    },
}


async def scrape_website(
    source_name: str, config: dict, timeout: int = 10
) -> Optional[ScrapedContent]:
    """
    Scrape a single website and extract title content.

    Args:
        source_name: Name of the website (key in WEBSITES)
        config: Configuration dict with url, selector, category
        timeout: Request timeout in seconds

    Returns:
        ScrapedContent dict or None if scraping fails
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(
                config["url"],
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout),
                ssl=False,
            ) as response:
                if response.status != 200:
                    logger.warning(
                        f"Failed to scrape {source_name}: HTTP {response.status}"
                    )
                    return None

                html = await response.text()
                soup = BeautifulSoup(html, "html.parser")

                # Extract title and snippet
                elements = soup.select(config["selector"])
                texts = [el.get_text(strip=True) for el in elements[:3]]
                snippet = " | ".join(texts) if texts else ""

                if not snippet:
                    logger.warning(f"No content found for {source_name}")
                    return None

                # Truncate snippet to 200 chars
                snippet = snippet[:200]

                return ScrapedContent(
                    url=config["url"],
                    title=source_name.replace("_", " ").title(),
                    category=config["category"],
                    snippet=snippet,
                    timestamp=datetime.utcnow().isoformat(),
                    source_name=source_name,
                )

    except Exception as e:
        logger.error(f"Error scraping {source_name}: {str(e)}")
        return None


async def scrape_all_websites() -> list[ScrapedContent]:
    """
    Scrape all configured websites concurrently.

    Returns:
        List of ScrapedContent dicts
    """
    tasks = [scrape_website(name, config) for name, config in WEBSITES.items()]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out None results and exceptions
    content = [r for r in results if r is not None and not isinstance(r, Exception)]

    logger.info(f"Successfully scraped {len(content)}/{len(WEBSITES)} websites")
    return content


def load_cache() -> Optional[list[ScrapedContent]]:
    """Load cached web scrape data if fresh."""
    if not CACHE_FILE.exists():
        return None

    try:
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)

        # Check cache freshness
        timestamp = datetime.fromisoformat(data.get("timestamp", ""))
        age = datetime.utcnow() - timestamp

        if age > timedelta(hours=CACHE_DURATION_HOURS):
            logger.info("Cache expired, will refresh")
            return None

        logger.info(f"Using cached web scrape data ({len(data['content'])} items)")
        return data["content"]

    except Exception as e:
        logger.error(f"Failed to load cache: {str(e)}")
        return None


def save_cache(content: list[ScrapedContent]) -> bool:
    """Save scraped content to cache."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        data = {
            "timestamp": datetime.utcnow().isoformat(),
            "count": len(content),
            "content": content,
        }

        with open(CACHE_FILE, "w") as f:
            json.dump(data, f, indent=2)

        logger.info(f"Cached web scrape data ({len(content)} items)")
        return True

    except Exception as e:
        logger.error(f"Failed to save cache: {str(e)}")
        return False


async def get_web_context(force_refresh: bool = False) -> list[ScrapedContent]:
    """
    Get web context data, using cache if available and fresh.

    Args:
        force_refresh: If True, always scrape fresh data

    Returns:
        List of ScrapedContent dicts
    """
    # Try loading cache first
    if not force_refresh:
        cached = load_cache()
        if cached:
            return cached

    # Scrape all websites
    logger.info("Scraping web data...")
    content = await scrape_all_websites()

    # Save to cache
    save_cache(content)

    return content


def format_context_for_prompt(content: list[ScrapedContent]) -> str:
    """
    Format scraped content for inclusion in ChatAssistant system prompt.

    Returns:
        Formatted string of current web context
    """
    if not content:
        return "No current web context available."

    # Group by category
    by_category = {}
    for item in content:
        cat = item["category"]
        by_category.setdefault(cat, []).append(item)

    lines = ["## Current Web Context\n"]

    for category in sorted(by_category.keys()):
        items = by_category[category]
        lines.append(f"\n### {category.title()} ({len(items)} sources)")
        for item in items[:3]:  # Show top 3 per category
            lines.append(f"- **{item['title']}**: {item['snippet']}")

    return "\n".join(lines)


if __name__ == "__main__":
    # Test scraper
    logging.basicConfig(level=logging.INFO)

    async def test():
        content = await get_web_context(force_refresh=True)
        print(f"\nScraped {len(content)} items:")
        for item in content[:5]:
            print(f"  - {item['title']}: {item['snippet'][:80]}...")

        print("\n" + format_context_for_prompt(content[:10]))

    asyncio.run(test())
