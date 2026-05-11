"""
API routes for web context data.
Provides real-world context to ChatAssistant for enhanced entity generation.
"""

from fastapi import APIRouter, HTTPException
from ...utils.web_scraper import get_web_context, format_context_for_prompt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/web-context", tags=["Web Context"])


@router.get("/current")
async def get_current_web_context(force_refresh: bool = False):
    """
    Get current web context data from scraped websites.

    Args:
        force_refresh: Force fresh scraping instead of using cache

    Returns:
        List of scraped content items with metadata
    """
    try:
        content = await get_web_context(force_refresh=force_refresh)
        return {
            "status": "success",
            "count": len(content),
            "data": content,
        }
    except Exception as e:
        logger.error(f"Failed to get web context: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve web context")


@router.get("/prompt")
async def get_web_context_for_prompt(force_refresh: bool = False):
    """
    Get formatted web context for inclusion in ChatAssistant system prompt.

    Args:
        force_refresh: Force fresh scraping

    Returns:
        Formatted markdown string ready for system prompt
    """
    try:
        content = await get_web_context(force_refresh=force_refresh)
        formatted = format_context_for_prompt(content)
        return {
            "status": "success",
            "context": formatted,
            "items_count": len(content),
        }
    except Exception as e:
        logger.error(f"Failed to format web context: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to format web context")


@router.post("/refresh")
async def refresh_web_context():
    """Force refresh of web context cache by scraping all websites."""
    try:
        content = await get_web_context(force_refresh=True)
        return {
            "status": "success",
            "message": f"Successfully refreshed web context with {len(content)} items",
            "count": len(content),
        }
    except Exception as e:
        logger.error(f"Failed to refresh web context: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh web context: {str(e)}",
        )
