"""
Service layer for AI review summarization.
"""

import logging
import json
import httpx
from typing import List
from app.core.config import settings
from app.schemas.review import ReviewSummaryResponse

logger = logging.getLogger(__name__)

GEMINI_SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "pros": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "cons": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "summary": {"type": "STRING"}
    },
    "required": ["pros", "cons", "summary"]
}


async def summarize_reviews_service(reviews: List[str]) -> ReviewSummaryResponse:
    """
    Summarize a list of salon reviews.
    Uses Gemini API if key is present, otherwise falls back to a smart mock summary.
    """
    if not reviews:
        return ReviewSummaryResponse(
            pros=[],
            cons=[],
            summary="No reviews available to summarize.",
            is_mock=True
        )

    # If GEMINI_API_KEY is not set, use high-fidelity mock fallback
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not configured. Falling back to mock review summarization.")
        return generate_mock_summary(reviews)

    reviews_text = "\n".join(f"- {r}" for r in reviews)
    prompt = f"""
You are an expert AI Salon Review Analyst for "Aura Elite".
Analyze the following customer reviews for a luxury salon and synthesize them.
Extract a list of distinct pros (positive highlights), cons (negative points or complaints), and a cohesive overall summary.

REVIEWS:
{reviews_text}

INSTRUCTIONS:
1. Extract 2-4 key pros. Keep them short and professional (e.g. "Exquisite ambiance", "Highly professional staff").
2. Extract 1-3 key cons. If no complaints are mentioned, return an empty list or subtle notes like "Premium pricing".
3. Write a 2-3 sentence overall synthesis summary in an elegant and objective concierge style.
"""

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={settings.GEMINI_API_KEY}"
    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": GEMINI_SUMMARY_SCHEMA,
            "temperature": 0.2
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(api_url, json=request_body)
            
            if res.status_code != 200:
                logger.error(f"Gemini API error during review summarization: {res.status_code} - {res.text}")
                return generate_mock_summary(reviews)

            response_data = res.json()
            generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
            summary_dict = json.loads(generated_text)

            return ReviewSummaryResponse(
                pros=summary_dict.get("pros", []),
                cons=summary_dict.get("cons", []),
                summary=summary_dict.get("summary", ""),
                is_mock=False
            )

    except Exception as e:
        logger.error(f"Failed to get Gemini review summary: {str(e)}")
        return generate_mock_summary(reviews)


def generate_mock_summary(reviews: List[str]) -> ReviewSummaryResponse:
    """
    Generates a smart, keyword-based mock summary from the review text.
    """
    # Combine all reviews for keyword searching
    combined_text = " ".join(reviews).lower()

    # Dynamic pros extraction based on keywords
    pros = []
    if any(k in combined_text for k in ["staff", "stylist", "therapist", "expert", "service", "friendly"]):
        pros.append("Highly skilled stylists and courteous staff")
    if any(k in combined_text for k in ["clean", "hygiene", "immaculate", "safe", "spotless"]):
        pros.append("Spotless hygiene standards and clean facilities")
    if any(k in combined_text for k in ["ambiance", "atmosphere", "decor", "music", "luxury", "vibe", "luxe"]):
        pros.append("Exquisite, ultra-luxe interior ambiance")
    if any(k in combined_text for k in ["massage", "facial", "treatment", "pedicure", "mani"]):
        pros.append("Premium quality wellness and skin treatments")
    
    # Ensure we have at least some pros
    if not pros:
        pros = ["Attentive customer service", "High-quality premium hair treatments"]

    # Dynamic cons extraction based on keywords
    cons = []
    if any(k in combined_text for k in ["expensive", "costly", "price", "pricey", "charge", "fee"]):
        cons.append("Premium pricing model")
    if any(k in combined_text for k in ["wait", "delay", "time", "late", "queue"]):
        cons.append("Occasional appointment delays or waiting times")
    if any(k in combined_text for k in ["parking", "park", "car", "traffic"]):
        cons.append("Valet or parking availability constraints")
    if any(k in combined_text for k in ["booking", "slot", "appointment", "schedule"]):
        cons.append("High demand makes popular slots hard to secure")

    # If no cons detected, add a default gentle one
    if not cons:
        cons = ["High demand requires booking well in advance"]

    # Generate synthesis summary
    salon_names = ["this luxury salon", "the salon"]
    reviews_count = len(reviews)
    
    if reviews_count >= 3:
        summary = (
            f"Based on a synthesis of {reviews_count} client reviews, this establishment is highly regarded "
            f"for its professional staff and stellar service quality. While some customers note that the experience "
            f"comes at a premium price point, the general consensus is that the luxurious treatments and immaculate "
            f"ambiance make it well worth the visit."
        )
    else:
        summary = (
            f"Based on early client feedback, the salon delivers exceptional service and premium grooming rituals. "
            f"Guests are highly pleased with the professional results, though they note that advance booking is highly "
            f"recommended due to limited availability."
        )

    return ReviewSummaryResponse(
        pros=pros,
        cons=cons,
        summary=summary,
        is_mock=True
    )
