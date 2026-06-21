"""
API Endpoints for the AI Beauty Concierge.
"""

import logging
import json
from typing import List, Dict, Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.salon import Salon
from app.models.service import Service
from app.models.user import User
from app.models.recommendation import SavedRecommendation
from app.schemas.recommendation import SavedRecommendationCreate, SavedRecommendationOut
from app.schemas.concierge import (
    ConciergeRequest,
    ConciergeResponse,
    HairstyleRecommendation,
    ServiceRecommendation,
    SalonRecommendation,
    FaceAnalysisResponse,
    MakeupRecommendation,
    DressAnalysisResponse,
    StylistResponse,
    StylistService,
    StylistOffer,
)
from app.core.config import settings

router = APIRouter(prefix="/api/concierge", tags=["AI Concierge"])
logger = logging.getLogger(__name__)


# ── Gemini Response Schema ───────────────────────────────────────
# Define the expected JSON Schema for Gemini's structured response.
GEMINI_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "recommended_hairstyles": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "description": {"type": "STRING"}
                },
                "required": ["name", "description"]
            }
        },
        "recommended_services": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "description": {"type": "STRING"},
                    "price_estimate": {"type": "NUMBER"},
                    "salon_id": {"type": "INTEGER"},
                    "service_id": {"type": "INTEGER"}
                },
                "required": ["name", "description", "price_estimate", "salon_id"]
            }
        },
        "recommended_salons": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "reason": {"type": "STRING"},
                    "salon_id": {"type": "INTEGER"}
                },
                "required": ["name", "reason", "salon_id"]
            }
        },
        "estimated_budget": {"type": "NUMBER"},
        "explanation": {"type": "STRING"}
    },
    "required": [
        "recommended_hairstyles",
        "recommended_services",
        "recommended_salons",
        "estimated_budget",
        "explanation"
    ]
}


# ── POST /api/concierge/recommend ────────────────────────────────

@router.post(
    "/recommend",
    response_model=ConciergeResponse,
    summary="Get bespoke AI beauty & salon recommendations",
)
async def get_beauty_recommendations(
    payload: ConciergeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get bespoke beauty, hairstyle, and salon recommendations using Gemini.
    If GEMINI_API_KEY is not set, a realistic mock recommendation is returned.
    """
    # 1. Fetch salons and services database context
    db_salons = db.query(Salon).all()
    db_services = db.query(Service).all()

    if not db_salons:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No salons available in database to recommend.",
        )

    # 2. Check for Gemini API Key; if missing, generate mock response
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not configured. Falling back to mock recommendations.")
        return generate_mock_recommendations(payload, db_salons, db_services)

    # 3. Format database data for LLM context
    salons_context = []
    for s in db_salons:
        salons_context.append({
            "id": s.id,
            "name": s.name,
            "area": s.area,
            "price_range": s.price_range,
            "description": s.description,
            "rating": s.rating
        })

    services_context = []
    for s in db_services:
        services_context.append({
            "id": s.id,
            "salon_id": s.salon_id,
            "service_name": s.service_name,
            "category": s.category,
            "price": s.price,
            "duration": s.duration_minutes,
            "description": s.description
        })

    # 4. Build prompt
    prompt = f"""
You are the AI Luxury Style Director & Concierge for "Aura Elite", a luxury salon portal in Bangalore.
Provide bespoke beauty and styling recommendations for the following user:

USER PROFILE:
- Occasion: {payload.occasion}
- Budget (Max INR): {payload.budget} INR
- Preferred Location: {payload.location} (if "All Locations", search all areas)
- Hair Type / Texture: {payload.hair_type}

AVAILABLE SALONS (You MUST only recommend from these salons):
{json.dumps(salons_context, indent=2)}

AVAILABLE SERVICES (You MUST only recommend services that match these, linking them using `salon_id` and `service_id`):
{json.dumps(services_context, indent=2)}

INSTRUCTIONS:
1. Suggest 2-3 suitable hairstyles for the occasion and hair type.
2. Select 1-2 salons and corresponding actual services from the provided lists that fit the location preference and total budget.
3. Calculate the estimated budget based on the exact services recommended. Ensure the total is under the user's budget if possible.
4. Fill in the correct `salon_id` and `service_id` for every recommended service.
5. Write a personalized, premium explanation in an elegant, sophisticated concierge tone. Show expertise about hair care and Bangalore locations.
"""

    # 5. Call Gemini API
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
            "responseSchema": GEMINI_RESPONSE_SCHEMA,
            "temperature": 0.2
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(api_url, json=request_body)
            
            if res.status_code != 200:
                logger.error(f"Gemini API error: {res.status_code} - {res.text}")
                # Fallback to mock on API error
                return generate_mock_recommendations(payload, db_salons, db_services)

            response_data = res.json()
            # Extract generated text
            generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
            recommendations_dict = json.loads(generated_text)

            # Map the parsed JSON back to ConciergeResponse pydantic model
            return ConciergeResponse(
                recommended_hairstyles=[
                    HairstyleRecommendation(**h) for h in recommendations_dict.get("recommended_hairstyles", [])
                ],
                recommended_services=[
                    ServiceRecommendation(**s) for s in recommendations_dict.get("recommended_services", [])
                ],
                recommended_salons=[
                    SalonRecommendation(**s) for s in recommendations_dict.get("recommended_salons", [])
                ],
                estimated_budget=recommendations_dict.get("estimated_budget", 0.0),
                explanation=recommendations_dict.get("explanation", ""),
                is_mock=False
            )

    except Exception as e:
        logger.error(f"Failed to get Gemini recommendation: {str(e)}")
        # Return fallback mock response on exception
        return generate_mock_recommendations(payload, db_salons, db_services)


# ── Mock Generator Fallback ──────────────────────────────────────

def generate_mock_recommendations(
    payload: ConciergeRequest,
    salons: List[Salon],
    services: List[Service]
) -> ConciergeResponse:
    """
    Generates realistic, context-aware mock recommendations based on DB data.
    Ensures correct structure and ID matching for testing and demo purposes.
    """
    # 1. Filter salons matching location if possible
    matched_salons = salons
    if payload.location.lower() != "all locations":
        matched_salons = [s for s in salons if payload.location.lower() in s.area.lower()]
        if not matched_salons:  # Fallback
            matched_salons = salons

    # 2. Pick a salon and a service that fits within budget
    selected_salon = matched_salons[0]
    selected_service = None

    # Try to find a service in the budget
    salon_services = [s for s in services if s.salon_id == selected_salon.id]
    if not salon_services:
        salon_services = services

    for s in salon_services:
        if s.price <= payload.budget:
            selected_service = s
            break

    # If no service fits, just pick the cheapest one
    if not selected_service:
        selected_service = min(salon_services, key=lambda s: s.price)

    # 3. Generate visual hairstyle suggestions based on hair type and occasion
    hair_type = payload.hair_type.lower()
    occasion = payload.occasion.lower()

    hairstyles = []
    if "curly" in hair_type or "coily" in hair_type:
        hairstyles = [
            HairstyleRecommendation(
                name="Defined Deva Cut Layers",
                description=f"A layered cut tailored specifically for your beautiful natural curls to add structure and prevent the 'triangle' shape, perfect for a {payload.occasion}."
            ),
            HairstyleRecommendation(
                name="Luxury Hollywood Wave Updo",
                description="Glamorous, structured pinned-up curls styled with high-shine serum to withstand humidity and keep you looking elegant throughout the evening."
            )
        ]
    else:  # Straight or wavy
        hairstyles = [
            HairstyleRecommendation(
                name="Bespoke Sleek Parisian Blowout",
                description="Ultra-smooth, glossy blowout with gentle inward-curving ends for a sophisticated look that highlights hair health."
            ),
            HairstyleRecommendation(
                name="Textured Crown Chignon",
                description=f"An elegant, low bun with soft face-framing waves, combining classic poise with contemporary ease, fitting for a {payload.occasion}."
            )
        ]

    # 4. Build recommendations
    rec_services = [
        ServiceRecommendation(
            name=selected_service.service_name,
            description=selected_service.description or "Elite beauty therapy.",
            price_estimate=selected_service.price,
            salon_id=selected_salon.id,
            service_id=selected_service.id
        )
    ]

    rec_salons = [
        SalonRecommendation(
            name=selected_salon.name,
            reason=f"Selected for its proximity in {selected_salon.area} and exceptional {selected_service.category} expertise. Fits your budget with premium styling services starting from {selected_salon.price_range}.",
            salon_id=selected_salon.id
        )
    ]

    # Add a second service if budget allows
    remaining_budget = payload.budget - selected_service.price
    if remaining_budget > 1500:
        # Find another cheap service in the same salon or different salon
        other_svcs = [s for s in services if s.id != selected_service.id and s.price <= remaining_budget]
        if other_svcs:
            second_svc = other_svcs[0]
            second_salon = next((s for s in salons if s.id == second_svc.salon_id), selected_salon)
            
            rec_services.append(
                ServiceRecommendation(
                    name=second_svc.service_name,
                    description=second_svc.description or "Premium grooming ritual.",
                    price_estimate=second_svc.price,
                    salon_id=second_salon.id,
                    service_id=second_svc.id
                )
            )

            # Add second salon if it's different
            if second_salon.id != selected_salon.id:
                rec_salons.append(
                    SalonRecommendation(
                        name=second_salon.name,
                        reason=f"Recommended for additional {second_svc.category} treatments that fit within your remaining budget.",
                        salon_id=second_salon.id
                    )
                )

    total_est = sum(s.price_estimate for s in rec_services)

    explanation = (
        f"For your upcoming {payload.occasion}, we recommend focusing on defining your {payload.hair_type} hair "
        f"with high-end treatments at {selected_salon.name} in {selected_salon.area}. "
        f"Their {selected_service.service_name} will perfectly complement your style while respecting "
        f"your maximum budget constraint of ₹{payload.budget:,.2f}. "
        f"Our curated choices ensure you receive the finest standard of Bangalore grooming."
    )

    return ConciergeResponse(
        recommended_hairstyles=hairstyles,
        recommended_services=rec_services,
        recommended_salons=rec_salons,
        estimated_budget=total_est,
        explanation=explanation,
        is_mock=True
    )


# ── Gemini Face Response Schema ──────────────────────────────────
GEMINI_FACE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "detected_gender": {
            "type": "STRING",
            "description": "Apparent gender detected from the image: Male, Female, or Non-Binary"
        },
        "face_shape": {
            "type": "STRING",
            "description": "Detected face shape: Oval, Round, Square, Heart, Diamond, or Oblong"
        },
        "key_features": {
            "type": "STRING",
            "description": "Detailed description of facial landmarks: jawline shape, forehead width, cheekbone prominence, chin shape, face length-to-width ratio"
        },
        "skin_tone": {
            "type": "STRING",
            "description": "Detected skin tone category: Fair, Light, Medium, Olive, Tan, Brown, Dark Brown, Deep"
        },
        "confidence": {
            "type": "STRING",
            "description": "Confidence level of the face shape detection: High, Medium, or Low"
        },
        "recommended_hairstyles": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "description": {"type": "STRING"}
                },
                "required": ["name", "description"]
            }
        },
        "explanation": {"type": "STRING"}
    },
    "required": ["detected_gender", "face_shape", "key_features", "skin_tone", "confidence", "recommended_hairstyles", "explanation"]
}


# ── POST /api/concierge/analyze-face ─────────────────────────────

@router.post(
    "/analyze-face",
    response_model=FaceAnalysisResponse,
    summary="Analyze face shape from selfie using Gemini Vision",
)
async def analyze_face_shape(
    file: UploadFile = File(...),
    gender: str = Form(""),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze the user's face shape from a selfie image and recommend hairstyles.
    Accepts an optional `gender` form field (Male/Female/Non-Binary) to improve accuracy.
    If GEMINI_API_KEY is not set, a high-fidelity mock face analysis is returned.
    """
    # Verify file type is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image.",
        )

    # Normalize the gender input
    gender_clean = gender.strip().title() if gender else ""

    # Check for Gemini API Key; if missing, generate mock response
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not configured. Falling back to mock face shape analysis.")
        return generate_mock_face_analysis(file.filename, gender_clean)

    try:
        # Read file contents and encode to base64
        image_bytes = await file.read()
        import base64
        base64_image = base64.b64encode(image_bytes).decode("utf-8")

        # Build a gender hint clause for the prompt
        gender_hint = ""
        if gender_clean in ("Male", "Female", "Non-Binary"):
            gender_hint = f"\nIMPORTANT: The user has self-identified as {gender_clean}. Use this as the detected_gender and tailor ALL hairstyle recommendations specifically for {gender_clean} individuals.\n"
        else:
            gender_hint = "\nThe user has not specified their gender. Detect the apparent gender from the image and tailor hairstyle recommendations accordingly.\n"

        prompt = f"""You are an expert AI Facial Geometry Analyst and Luxury Style Director for "Aura Elite", a premium salon concierge in Bangalore.

TASK: Carefully analyze the provided selfie photograph and produce a precise facial geometry analysis.

STEP 1 — GENDER DETECTION:
{gender_hint}
Determine whether the person in the image appears Male, Female, or Non-Binary. This is THE MOST CRITICAL STEP because hairstyle recommendations MUST match the person's gender.

GENDER-SPECIFIC HAIRSTYLE RULES (YOU MUST FOLLOW THESE STRICTLY):

IF THE PERSON IS MALE, you MUST ONLY recommend men's hairstyles. Here are examples of appropriate MALE hairstyles:
  - Low Fade with Textured Top
  - High Skin Fade with Pompadour
  - Classic Taper Fade
  - Crew Cut with Line Up
  - Buzz Cut
  - Textured Quiff
  - Slick Back with Mid Fade
  - French Crop with Fringe
  - Undercut with Comb Over
  - Messy Fringe with Taper
  - Side Part Fade
  - Drop Fade with Curly Top
  - Caesar Cut
  - Man Bun / Top Knot (for longer hair)
  - Ivy League Cut
  - Edgar Cut
  - Mullet Fade
  - Bro Flow
  - Disconnected Undercut
  
  NEVER recommend bobs, lobs, curtain bangs, shags, chignons, layers, pixie cuts, beach waves, or any women's hairstyle for a male face. This is absolutely critical.

IF THE PERSON IS FEMALE, recommend women's hairstyles such as:
  - Layered Lob (Long Bob)
  - Curtain Bangs with Long Layers
  - Pixie Cut
  - Beach Waves
  - Blunt Bob
  - Shag Cut
  - Side-Swept Bangs with Layers
  - Braided Updo
  - Hollywood Waves
  - Textured Bob

IF NON-BINARY, recommend gender-neutral styles like textured crops, modern shags, asymmetrical cuts.

STEP 2 — FACE SHAPE ANALYSIS:
Analyze the following specific facial landmarks to determine face shape:
a) FOREHEAD WIDTH: Measure visually from temple to temple. Is it narrow, average, or wide?
b) CHEEKBONE WIDTH: Are cheekbones wider than the forehead and jawline, or proportional?
c) JAWLINE SHAPE: Is the jaw angular/square, rounded, pointed/tapered, or soft?
d) CHIN SHAPE: Is it pointed, rounded, square, or narrow?
e) FACE LENGTH vs WIDTH RATIO: Is the face longer than it is wide (elongated), approximately equal (balanced), or wider than long?

Use these measurements to classify face shape:
- OVAL: Face length is about 1.5x the width; forehead slightly wider than chin; gentle jawline curves. Most versatile.
- ROUND: Face length ≈ width; full cheeks; soft, curved jawline; rounded chin. Needs angular/elongating styles.
- SQUARE: Forehead, cheekbones, and jaw are roughly equal width; strong angular jawline; broad forehead. Needs softening.
- HEART: Wide forehead and cheekbones; narrow jawline tapering to a pointed chin. Needs jaw-width balance.
- DIAMOND: Narrow forehead and jawline; wide prominent cheekbones; pointed chin. Needs forehead/jaw width.
- OBLONG: Face significantly longer than wide; similar width at forehead, cheeks, and jaw; long straight cheeks. Needs width/volume.

STEP 3 — KEY FEATURES:
Write a concise description of what you observed: mention forehead width, jawline angularity, cheekbone prominence, chin shape, and the length-to-width ratio that led to your classification.

STEP 4 — SKIN TONE:
Detect the skin tone from the image. Choose from: Fair, Light, Medium, Olive, Tan, Brown, Dark Brown, Deep.

STEP 5 — CONFIDENCE:
Rate your confidence in the face shape classification: High (clearly one shape), Medium (could be one of two shapes), Low (image quality makes analysis difficult).

STEP 6 — HAIRSTYLE RECOMMENDATIONS:
Based on the detected gender AND face shape, provide exactly 3 hairstyle recommendations that:
- Are 100% appropriate for the detected gender (NEVER suggest women's cuts for men or vice versa)
- Complement and balance the detected face shape
- Include specific styling details and how to achieve the look
- Reference how each style addresses the person's particular facial proportions
- Are modern, trendy, and commonly requested at premium salons in 2024-2025

STEP 7 — EXPLANATION:
Write an elegant, personalized explanation in a luxury concierge tone. Reference the specific facial landmarks you analyzed. Explain WHY this face shape was detected and HOW each recommended hairstyle will enhance or balance their features. Be specific — mention their jawline, forehead, cheekbones, etc.

CRITICAL REMINDERS:
1. Do NOT default to "Oval" unless the face truly has balanced oval proportions. Most faces are NOT oval.
2. NEVER recommend feminine hairstyles (bobs, lobs, curtain bangs, shags, layers) for a MALE face. This is the #1 rule.
3. NEVER recommend masculine hairstyles (fades, buzz cuts, crew cuts) for a FEMALE face unless they specifically want that style.
4. Analyze the image carefully — pay close attention to facial hair, bone structure, and overall presentation."""

        # Call Gemini API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={settings.GEMINI_API_KEY}"
        request_body = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": file.content_type,
                                "data": base64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": GEMINI_FACE_SCHEMA,
                "temperature": 0.3
            }
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(api_url, json=request_body)
            
            if res.status_code != 200:
                logger.error(f"Gemini API error during face analysis: {res.status_code} - {res.text}")
                return generate_mock_face_analysis(file.filename, gender_clean)

            response_data = res.json()
            generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
            analysis_dict = json.loads(generated_text)

            # If user provided gender, override the detected one
            final_gender = gender_clean if gender_clean in ("Male", "Female", "Non-Binary") else analysis_dict.get("detected_gender", "Unknown")

            # Validate that Gemini's hairstyle recommendations match the gender
            gemini_hairstyles = [
                HairstyleRecommendation(**h) for h in analysis_dict.get("recommended_hairstyles", [])
            ]
            validated_hairstyles = _validate_hairstyles_for_gender(
                gemini_hairstyles, final_gender, analysis_dict.get("face_shape", "Oval")
            )

            return FaceAnalysisResponse(
                face_shape=analysis_dict.get("face_shape", "Oval"),
                detected_gender=final_gender,
                key_features=analysis_dict.get("key_features", ""),
                skin_tone=analysis_dict.get("skin_tone", ""),
                confidence=analysis_dict.get("confidence", "Medium"),
                recommended_hairstyles=validated_hairstyles,
                explanation=analysis_dict.get("explanation", ""),
                is_mock=False
            )

    except Exception as e:
        logger.error(f"Failed to get Gemini face analysis: {str(e)}")
        return generate_mock_face_analysis(file.filename, gender_clean)


# ── Hairstyle Gender Validation ──────────────────────────────────

# Keywords that strongly indicate female-only hairstyles
_FEMALE_ONLY_KEYWORDS = [
    "bob", "lob", "bangs", "fringe with layers", "curtain bang", "shag",
    "pixie", "chignon", "updo", "beach wave", "hollywood wave",
    "blowout", "blunt cut", "face-framing layer", "collarbone",
    "shoulder-length wave", "layered lob", "wispy layer",
    "voluminous wave", "braided", "braid"
]

# Keywords that strongly indicate male-only hairstyles
_MALE_ONLY_KEYWORDS = [
    "fade", "buzz cut", "crew cut", "pompadour", "undercut",
    "taper", "line up", "edgar", "mullet", "man bun", "top knot",
    "ivy league", "caesar", "bro flow", "quiff", "slick back",
    "comb over", "drop fade", "skin fade", "high fade", "low fade",
    "mid fade", "temple fade"
]


def _validate_hairstyles_for_gender(
    hairstyles: list,
    gender: str,
    face_shape: str
) -> list:
    """
    Validates that Gemini-returned hairstyles actually match the user's gender.
    If mismatched styles are detected, replaces them with curated alternatives
    from the mock recommendation database.
    """
    if gender not in ("Male", "Female"):
        return hairstyles  # Can't validate non-binary or unknown

    if not hairstyles:
        return hairstyles

    # Check each hairstyle for gender mismatch
    wrong_keywords = _FEMALE_ONLY_KEYWORDS if gender == "Male" else _MALE_ONLY_KEYWORDS
    mismatched_count = 0

    for h in hairstyles:
        name_lower = h.name.lower()
        desc_lower = h.description.lower() if h.description else ""
        combined = name_lower + " " + desc_lower

        for keyword in wrong_keywords:
            if keyword in combined:
                mismatched_count += 1
                break

    # If more than half the hairstyles are mismatched, replace ALL with curated ones
    if mismatched_count > len(hairstyles) // 2:
        logger.warning(
            f"Gemini returned {mismatched_count}/{len(hairstyles)} gender-mismatched "
            f"hairstyles for {gender}. Replacing with curated {gender} recommendations."
        )
        # Get the curated data for this gender and face shape
        if gender == "Male":
            rec_db = _get_male_recommendations()
        else:
            rec_db = _get_female_recommendations()

        data = rec_db.get(face_shape, rec_db.get("Oval", {}))
        if data and "hairstyles" in data:
            return [HairstyleRecommendation(**h) for h in data["hairstyles"]]

    return hairstyles


def _get_male_recommendations() -> dict:
    """Returns the curated male hairstyle recommendation database."""
    return {
        "Oval": {
            "hairstyles": [
                {"name": "Classic Textured Quiff", "description": "A modern quiff with textured top and tapered sides. The volume at the front enhances your balanced oval proportions while the tapered sides maintain clean lines along your symmetrical jawline."},
                {"name": "Medium-Length Side Part", "description": "A refined side part with 3-4 inches on top, faded sides. The off-center parting adds subtle asymmetry to complement your naturally balanced facial geometry."},
                {"name": "Modern French Crop with Fringe", "description": "A short textured crop with a forward-brushed fringe. The soft fringe adds character to your versatile oval shape without disrupting its natural harmony."}
            ]
        },
        "Round": {
            "hairstyles": [
                {"name": "High-Volume Pompadour", "description": "A tall pompadour with significant height at the crown and tight faded sides. The vertical volume elongates your round face, creating a more angular overall silhouette."},
                {"name": "Angular Undercut with Textured Top", "description": "Clean disconnected undercut with 4+ inches of textured hair on top. The sharp contrast between sides and top introduces geometric lines that counter facial roundness."},
                {"name": "Spiky Crew Cut with Skin Fade", "description": "A short, spiky-textured top with a skin fade. The upward-directed texture adds vertical emphasis, drawing the eye upward and creating the illusion of facial length."}
            ]
        },
        "Square": {
            "hairstyles": [
                {"name": "Textured Side-Swept Crop", "description": "A medium-length crop swept to one side with natural texture. The diagonal direction of the styling softens the strong horizontal forehead line while complementing your powerful jawline."},
                {"name": "Short Messy Quiff", "description": "A relaxed, tousled quiff with moderate volume. The intentional messiness softens the angular geometry of your forehead and jaw, adding organic movement."},
                {"name": "Buzz Cut with Beard Fade", "description": "A clean #2 or #3 buzz cut paired with a well-groomed beard that fades into the hairline. This bold choice celebrates your strong bone structure rather than disguising it."}
            ]
        },
        "Heart": {
            "hairstyles": [
                {"name": "Medium-Length Fringe with Taper", "description": "A longer top with a forward-falling fringe and clean tapered sides. The fringe narrows the appearance of the wider forehead, creating visual balance with the narrower jawline."},
                {"name": "Textured Caesar Cut", "description": "A short, even-length cut with a horizontal fringe. The Caesar's uniform length and forward fringe minimize the forehead-to-chin width differential."},
                {"name": "Slicked-Back Undercut", "description": "Hair swept back from the forehead with faded sides. Pulling hair away from the face shows confidence while the undercut's clean sides draw attention to your cheekbone structure."}
            ]
        },
        "Diamond": {
            "hairstyles": [
                {"name": "Voluminous Brushed-Up Style", "description": "Hair brushed upward and back with strong volume at the crown. This adds width at the top of the head, balancing the narrow forehead against your dramatic cheekbones."},
                {"name": "Classic Taper with Side Part", "description": "A gentleman's taper cut with a defined side part and slight volume. The structured silhouette adds width at the temples, counterbalancing the cheekbone dominance."},
                {"name": "Textured Fringe with Fade", "description": "A longer textured fringe falling across the forehead with a mid-fade. The fringe adds visual width to the narrow forehead while the fade keeps the cheekbone area clean."}
            ]
        },
        "Oblong": {
            "hairstyles": [
                {"name": "Textured Crop with Heavy Fringe", "description": "A short textured top with a thick, full fringe covering the forehead. The horizontal fringe visually shortens the face length, making your proportions appear more balanced."},
                {"name": "Side-Swept Medium Length", "description": "Medium-length hair swept to the side with volume at the temples. The lateral volume adds visual width to counterbalance the elongated facial structure."},
                {"name": "Classic Ivy League", "description": "A timeless Ivy League cut with slightly longer top and neat sides. The moderate length prevents adding further vertical emphasis while keeping the look polished."}
            ]
        }
    }


def _get_female_recommendations() -> dict:
    """Returns the curated female hairstyle recommendation database."""
    return {
        "Oval": {
            "hairstyles": [
                {"name": "Sleek Lob with Face-Framing Layers", "description": "A long bob hitting at the collarbone with subtle face-framing layers. These layers highlight your symmetrical oval structure while adding gentle movement around the cheekbones."},
                {"name": "Soft Wavy Shag with Curtain Bangs", "description": "Textured shaggy waves paired with parted curtain bangs. The curtain effect softly frames your balanced forehead and draws attention to your eyes."},
                {"name": "Deep Side-Parted Hollywood Waves", "description": "Classic glamour waves with a deep side part. Adds dramatic volume to one side, creating visual interest while celebrating your naturally balanced proportions."}
            ]
        },
        "Round": {
            "hairstyles": [
                {"name": "Asymmetrical Long Bob", "description": "An angled lob that is longer in the front than the back. The diagonal line draws the eye downward, creating the illusion of length and introducing angular structure to soften roundness."},
                {"name": "Voluminous Layered Blowout", "description": "Long layers with crown volume blown out to maximum height. The vertical lift at the crown elongates your face while layers past the chin create a lengthening frame."},
                {"name": "Sleek Center-Part with Long Layers", "description": "Long, smooth hair with a precise center part and layers starting at the chin. The vertical parting line visually divides and elongates, while chin-level layers add angular framing."}
            ]
        },
        "Square": {
            "hairstyles": [
                {"name": "Wispy Layered Shoulder Cut", "description": "Feathery, wispy layers cascading from the collarbone. The soft, irregular texture breaks the sharp horizontal lines of your strong jawline, creating organic, romantic movement."},
                {"name": "Side-Swept Soft Fringe with Long Waves", "description": "A sweeping side fringe paired with long, loose waves. The diagonal fringe softens the broad forehead while waves add curved texture against your angular jaw."},
                {"name": "Tousled Beachy Waves with Middle Part", "description": "Natural, textured beach waves with a relaxed center part. The curved wave texture offsets the straight geometric lines of forehead and jaw, creating effortless harmony."}
            ]
        },
        "Heart": {
            "hairstyles": [
                {"name": "Chin-Length Textured Bob", "description": "A classic bob ending precisely at the chin. This strategic length adds volume and fullness exactly where your face narrows, balancing the wider forehead with a harmonious lower frame."},
                {"name": "Side-Swept Wispy Bangs with Long Waves", "description": "Long flowing waves paired with delicate side-swept bangs. The diagonal fringe visually narrows the wider forehead while waves add body around the narrower jawline."},
                {"name": "Layered Collarbone Shag", "description": "A modern shag with graduated layers concentrated from chin to collarbone. Creates maximum texture and fullness around the narrowest part of your face, achieving beautiful balance."}
            ]
        },
        "Diamond": {
            "hairstyles": [
                {"name": "Chin-Length Classic Bob", "description": "A polished bob ending at the chin with slight inward curving. Fills the space around the narrow jawline while the clean horizontal line adds width below your dramatic cheekbones."},
                {"name": "Deep Side-Part with Voluminous Waves", "description": "A dramatic side part paired with body-rich waves. The side part adds visual width at the narrow forehead, while voluminous waves soften the sharp cheekbone angles."},
                {"name": "Soft Curtain Bangs with Long Layers", "description": "Wispy parted bangs paired with face-framing long layers. The curtain bangs widen the narrow forehead, while layers at the jaw add needed fullness to the lower face."}
            ]
        },
        "Oblong": {
            "hairstyles": [
                {"name": "Full Blunt Bangs with Medium Layers", "description": "A thick, blunt fringe paired with shoulder-length layers. The horizontal bang line visually shortens your face length while layers add lateral fullness and width."},
                {"name": "Voluminous Shoulder-Length Waves", "description": "Full, bouncy waves hitting at the shoulders with maximum volume at the sides. The lateral volume adds visual width, counterbalancing the elongated facial structure beautifully."},
                {"name": "Textured Bob with Side-Swept Bangs", "description": "A chin-length bob with gentle texture and a side-swept fringe. The shorter length prevents adding vertical emphasis, while the fringe shortens the perceived face length."}
            ]
        }
    }


# ── Mock Face Analysis Generator Fallback ────────────────────────

def generate_mock_face_analysis(filename: str, gender: str = "") -> FaceAnalysisResponse:
    """
    Generates high-fidelity mock face shape analysis recommendations.
    Uses a proper hash of the filename for deterministic but varied selection.
    Provides completely separate male and female recommendation databases.
    """
    import hashlib
    import random

    # Use a proper hash for better distribution than filename length
    file_hash = int(hashlib.md5(filename.encode()).hexdigest(), 16)

    shapes = ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"]
    idx = file_hash % len(shapes)
    selected_shape = shapes[idx]

    # Determine gender for recommendations
    if gender in ("Male", "Female"):
        selected_gender = gender
    else:
        # Use hash to pick a gender for the mock
        selected_gender = "Male" if (file_hash // len(shapes)) % 2 == 0 else "Female"

    # ── MALE recommendation database ─────────────────────────────
    male_recommendations = {
        "Oval": {
            "hairstyles": [
                {"name": "Classic Textured Quiff", "description": "A modern quiff with textured top and tapered sides. The volume at the front enhances your balanced oval proportions while the tapered sides maintain clean lines along your symmetrical jawline."},
                {"name": "Medium-Length Side Part", "description": "A refined side part with 3-4 inches on top, faded sides. The off-center parting adds subtle asymmetry to complement your naturally balanced facial geometry."},
                {"name": "Modern French Crop with Fringe", "description": "A short textured crop with a forward-brushed fringe. The soft fringe adds character to your versatile oval shape without disrupting its natural harmony."}
            ],
            "key_features": "Balanced forehead-to-jaw ratio with proportional cheekbones. Jawline gently curves from ear to chin. Face length is approximately 1.5× the width — classic oval geometry.",
            "skin_tone": "Medium",
            "explanation": "Your face exhibits the hallmarks of the classic oval geometry — a forehead that is marginally wider than a softly curved jawline, with cheekbones sitting harmoniously between the two. The expert barbers at Rossano Ferretti recommend a textured quiff or medium-length side part to enhance this naturally versatile canvas. These cuts add intentional styling interest while respecting your balanced proportions."
        },
        "Round": {
            "hairstyles": [
                {"name": "High-Volume Pompadour", "description": "A tall pompadour with significant height at the crown and tight faded sides. The vertical volume elongates your round face, creating a more angular overall silhouette."},
                {"name": "Angular Undercut with Textured Top", "description": "Clean disconnected undercut with 4+ inches of textured hair on top. The sharp contrast between sides and top introduces geometric lines that counter facial roundness."},
                {"name": "Spiky Crew Cut with Skin Fade", "description": "A short, spiky-textured top with a skin fade. The upward-directed texture adds vertical emphasis, drawing the eye upward and creating the illusion of facial length."}
            ],
            "key_features": "Face width and length are nearly equal. Full, rounded cheeks with a soft curved jawline. Minimal angularity at the chin. Cheekbones are the widest point but without sharp definition.",
            "skin_tone": "Medium",
            "explanation": "Your facial geometry reveals a round structure — face width and length are nearly equal, with full cheeks and a softly curved jawline. Play Salon's master barbers recommend styles that introduce vertical height and angular contrast. A high pompadour or disconnected undercut will create the visual illusion of elongation, counterbalancing the natural roundness with sharp, architectural lines."
        },
        "Square": {
            "hairstyles": [
                {"name": "Textured Side-Swept Crop", "description": "A medium-length crop swept to one side with natural texture. The diagonal direction of the styling softens the strong horizontal forehead line while complementing your powerful jawline."},
                {"name": "Short Messy Quiff", "description": "A relaxed, tousled quiff with moderate volume. The intentional messiness softens the angular geometry of your forehead and jaw, adding organic movement."},
                {"name": "Buzz Cut with Beard Fade", "description": "A clean #2 or #3 buzz cut paired with a well-groomed beard that fades into the hairline. This bold choice celebrates your strong bone structure rather than disguising it."}
            ],
            "key_features": "Prominent, angular jawline with a broad forehead of similar width. Cheekbones align with both forehead and jaw creating a powerful rectangular structure. Strong chin with defined angles.",
            "skin_tone": "Medium",
            "explanation": "Your face showcases the striking geometry of the square shape — a broad forehead that mirrors the width of a strong, angular jawline, with defined cheekbones connecting the two. Warren Tricomi's directors suggest styles that either elegantly soften these angles with textured movement, or boldly celebrate them with a clean buzz cut. The textured side-swept crop is particularly effective at breaking the horizontal symmetry."
        },
        "Heart": {
            "hairstyles": [
                {"name": "Medium-Length Fringe with Taper", "description": "A longer top with a forward-falling fringe and clean tapered sides. The fringe narrows the appearance of the wider forehead, creating visual balance with the narrower jawline."},
                {"name": "Textured Caesar Cut", "description": "A short, even-length cut with a horizontal fringe. The Caesar's uniform length and forward fringe minimize the forehead-to-chin width differential."},
                {"name": "Slicked-Back Undercut", "description": "Hair swept back from the forehead with faded sides. Pulling hair away from the face shows confidence while the undercut's clean sides draw attention to your cheekbone structure."}
            ],
            "key_features": "Wide forehead tapering to a narrower jawline and pointed chin. Cheekbones are prominent and sit high. The upper third of the face is noticeably wider than the lower third.",
            "skin_tone": "Medium",
            "explanation": "Your facial analysis reveals a heart-shaped structure — a wide forehead with prominent high cheekbones tapering elegantly to a narrower jawline and defined chin. JCB Lavelle Road's styling directors recommend cuts that visually narrow the forehead, such as a medium-length fringe or textured Caesar. These styles redistribute visual weight downward, creating harmony between the broader upper face and the more delicate lower contours."
        },
        "Diamond": {
            "hairstyles": [
                {"name": "Voluminous Brushed-Up Style", "description": "Hair brushed upward and back with strong volume at the crown. This adds width at the top of the head, balancing the narrow forehead against your dramatic cheekbones."},
                {"name": "Classic Taper with Side Part", "description": "A gentleman's taper cut with a defined side part and slight volume. The structured silhouette adds width at the temples, counterbalancing the cheekbone dominance."},
                {"name": "Textured Fringe with Fade", "description": "A longer textured fringe falling across the forehead with a mid-fade. The fringe adds visual width to the narrow forehead while the fade keeps the cheekbone area clean."}
            ],
            "key_features": "Narrow forehead and jawline with dramatically wide, angular cheekbones. Pointed chin creates a geometric diamond silhouette. The mid-face is the widest point by a significant margin.",
            "skin_tone": "Medium",
            "explanation": "Your face presents the rare and striking diamond geometry — narrow forehead and jawline framing dramatically wide cheekbones, with a well-defined pointed chin. BBlunt Premium stylists recommend adding width and volume at the crown to balance the narrow forehead, while keeping the sides neat to avoid emphasizing cheekbone width further. A voluminous brushed-up style or textured fringe will create beautiful proportional harmony."
        },
        "Oblong": {
            "hairstyles": [
                {"name": "Textured Crop with Heavy Fringe", "description": "A short textured top with a thick, full fringe covering the forehead. The horizontal fringe visually shortens the face length, making your proportions appear more balanced."},
                {"name": "Side-Swept Medium Length", "description": "Medium-length hair swept to the side with volume at the temples. The lateral volume adds visual width to counterbalance the elongated facial structure."},
                {"name": "Classic Ivy League", "description": "A timeless Ivy League cut with slightly longer top and neat sides. The moderate length prevents adding further vertical emphasis while keeping the look polished."}
            ],
            "key_features": "Face length is significantly greater than width. Forehead, cheekbones, and jawline are of similar width creating a long, rectangular structure. Straight cheek contours with minimal tapering.",
            "skin_tone": "Medium",
            "explanation": "Your facial geometry reveals an oblong structure — a face that is notably longer than it is wide, with forehead, cheekbones, and jawline maintaining similar widths. Rossano Ferretti's directors recommend styles that add horizontal volume and visual width. A heavy fringe or side-swept style shortens the perceived face length, while temple volume widens the silhouette for a more balanced, sophisticated appearance."
        }
    }

    # ── FEMALE recommendation database ───────────────────────────
    female_recommendations = {
        "Oval": {
            "hairstyles": [
                {"name": "Sleek Lob with Face-Framing Layers", "description": "A long bob hitting at the collarbone with subtle face-framing layers. These layers highlight your symmetrical oval structure while adding gentle movement around the cheekbones."},
                {"name": "Soft Wavy Shag with Curtain Bangs", "description": "Textured shaggy waves paired with parted curtain bangs. The curtain effect softly frames your balanced forehead and draws attention to your eyes."},
                {"name": "Deep Side-Parted Hollywood Waves", "description": "Classic glamour waves with a deep side part. Adds dramatic volume to one side, creating visual interest while celebrating your naturally balanced proportions."}
            ],
            "key_features": "Balanced forehead-to-jaw ratio with gently curved jawline. Cheekbones sit proportionally between forehead and chin. Face length approximately 1.5× the width — classic feminine oval.",
            "skin_tone": "Medium",
            "explanation": "Your face exhibits the coveted oval geometry — a forehead marginally wider than a softly curved jawline, with cheekbones harmoniously placed. Warren Tricomi's French-trained stylists recommend cuts that celebrate this natural symmetry. A collarbone-length lob with face-framing layers or textured waves with curtain bangs will accentuate your high cheekbones and elegant jawline."
        },
        "Round": {
            "hairstyles": [
                {"name": "Asymmetrical Long Bob", "description": "An angled lob that is longer in the front than the back. The diagonal line draws the eye downward, creating the illusion of length and introducing angular structure to soften roundness."},
                {"name": "Voluminous Layered Blowout", "description": "Long layers with crown volume blown out to maximum height. The vertical lift at the crown elongates your face while layers past the chin create a lengthening frame."},
                {"name": "Sleek Center-Part with Long Layers", "description": "Long, smooth hair with a precise center part and layers starting at the chin. The vertical parting line visually divides and elongates, while chin-level layers add angular framing."}
            ],
            "key_features": "Face width and length are nearly equal. Full, rounded cheeks with a soft curved jawline. Rounded chin without angular definition. Cheekbones blend smoothly into the cheek fullness.",
            "skin_tone": "Medium",
            "explanation": "Your facial geometry reveals a beautiful round structure — equal face width and length, with full cheeks and a gently curved jawline. Play Salon UB City's creative directors recommend styles that introduce length and angular framing. An asymmetrical lob creates flattering diagonal lines, while a voluminous blowout adds crown height to elongate the silhouette beautifully."
        },
        "Square": {
            "hairstyles": [
                {"name": "Wispy Layered Shoulder Cut", "description": "Feathery, wispy layers cascading from the collarbone. The soft, irregular texture breaks the sharp horizontal lines of your strong jawline, creating organic, romantic movement."},
                {"name": "Side-Swept Soft Fringe with Long Waves", "description": "A sweeping side fringe paired with long, loose waves. The diagonal fringe softens the broad forehead while waves add curved texture against your angular jaw."},
                {"name": "Tousled Beachy Waves with Middle Part", "description": "Natural, textured beach waves with a relaxed center part. The curved wave texture offsets the straight geometric lines of forehead and jaw, creating effortless harmony."}
            ],
            "key_features": "Prominent angular jawline with a broad forehead of similar width. Strong chin with defined corners. Forehead, cheekbones, and jaw are roughly equal width creating a powerful square silhouette.",
            "skin_tone": "Medium",
            "explanation": "Your face showcases the striking beauty of the square shape — a broad forehead matching the width of a strong, sculpted jawline. Rossano Ferretti's Method Precision experts recommend softening these gorgeous angles with wispy layers and curved wave textures. The side-swept fringe elegantly redirects focus diagonally, while beachy waves add organic movement against your structured bone architecture."
        },
        "Heart": {
            "hairstyles": [
                {"name": "Chin-Length Textured Bob", "description": "A classic bob ending precisely at the chin. This strategic length adds volume and fullness exactly where your face narrows, balancing the wider forehead with a harmonious lower frame."},
                {"name": "Side-Swept Wispy Bangs with Long Waves", "description": "Long flowing waves paired with delicate side-swept bangs. The diagonal fringe visually narrows the wider forehead while waves add body around the narrower jawline."},
                {"name": "Layered Collarbone Shag", "description": "A modern shag with graduated layers concentrated from chin to collarbone. Creates maximum texture and fullness around the narrowest part of your face, achieving beautiful balance."}
            ],
            "key_features": "Wide forehead tapering to a narrower jawline and delicate pointed chin. High, prominent cheekbones. The upper face is noticeably wider than the lower face, creating the classic inverted triangle.",
            "skin_tone": "Medium",
            "explanation": "Your facial analysis reveals an elegant heart shape — a wide forehead with prominent cheekbones tapering to a delicate pointed chin. JCB Lavelle Road's creative directors recommend adding volume around the jawline to balance this inverted triangle. A chin-length textured bob or layered collarbone shag creates fullness where the face narrows, while side-swept bangs softly reduce the visual width of the forehead."
        },
        "Diamond": {
            "hairstyles": [
                {"name": "Chin-Length Classic Bob", "description": "A polished bob ending at the chin with slight inward curving. Fills the space around the narrow jawline while the clean horizontal line adds width below your dramatic cheekbones."},
                {"name": "Deep Side-Part with Voluminous Waves", "description": "A dramatic side part paired with body-rich waves. The side part adds visual width at the narrow forehead, while voluminous waves soften the sharp cheekbone angles."},
                {"name": "Soft Curtain Bangs with Long Layers", "description": "Wispy parted bangs paired with face-framing long layers. The curtain bangs widen the narrow forehead, while layers at the jaw add needed fullness to the lower face."}
            ],
            "key_features": "Narrow forehead and jawline with dramatically wide, angular cheekbones. Pointed chin creates a geometric diamond silhouette. The mid-face cheekbone width dominates the overall structure.",
            "skin_tone": "Medium",
            "explanation": "Your face presents the rare and stunning diamond geometry — narrow forehead and jawline framing dramatic, wide cheekbones with a defined pointed chin. Warren Tricomi's directors recommend hairstyles that add width at the forehead and jaw. Curtain bangs elegantly widen the narrow forehead, while a chin-length bob or voluminous waves add fullness around the delicate jawline, framing your natural elegance."
        },
        "Oblong": {
            "hairstyles": [
                {"name": "Full Blunt Bangs with Medium Layers", "description": "A thick, blunt fringe paired with shoulder-length layers. The horizontal bang line visually shortens your face length while layers add lateral fullness and width."},
                {"name": "Voluminous Shoulder-Length Waves", "description": "Full, bouncy waves hitting at the shoulders with maximum volume at the sides. The lateral volume adds visual width, counterbalancing the elongated facial structure beautifully."},
                {"name": "Textured Bob with Side-Swept Bangs", "description": "A chin-length bob with gentle texture and a side-swept fringe. The shorter length prevents adding vertical emphasis, while the fringe shortens the perceived face length."}
            ],
            "key_features": "Face length significantly greater than width. Forehead, cheekbones, and jawline are of similar width. Straight, elongated cheek contours. Long appearance from hairline to chin.",
            "skin_tone": "Medium",
            "explanation": "Your facial geometry reveals an oblong structure — beautifully elongated with consistent width across forehead, cheekbones, and jawline. BBlunt Premium's styling directors recommend styles that add horizontal volume and visual width. Full blunt bangs create a horizontal break that shortens perceived face length, while voluminous shoulder-length waves add the lateral fullness that frames your elegant elongated proportions."
        }
    }

    # Select the right database based on gender
    rec_db = male_recommendations if selected_gender == "Male" else female_recommendations
    data = rec_db.get(selected_shape, rec_db["Oval"])

    return FaceAnalysisResponse(
        face_shape=selected_shape,
        detected_gender=selected_gender,
        key_features=data["key_features"],
        skin_tone=data["skin_tone"],
        confidence="High",
        recommended_hairstyles=[
            HairstyleRecommendation(**h) for h in data["hairstyles"]
        ],
        explanation=data["explanation"],
        is_mock=True
    )


# ── Gemini Dress Response Schema ─────────────────────────────────
GEMINI_DRESS_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "dress_color": {"type": "STRING"},
        "occasion_type": {"type": "STRING"},
        "makeup_recommendations": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "description": {"type": "STRING"}
                },
                "required": ["name", "description"]
            }
        },
        "explanation": {"type": "STRING"}
    },
    "required": ["dress_color", "occasion_type", "makeup_recommendations", "explanation"]
}


# ── POST /api/concierge/analyze-dress ────────────────────────────

@router.post(
    "/analyze-dress",
    response_model=DressAnalysisResponse,
    summary="Analyze dress details and recommend makeup using Gemini Vision",
)
async def analyze_dress(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze the uploaded dress photo to detect its color and style,
    and suggest complementary luxury makeup looks and occasions.
    If GEMINI_API_KEY is not set, a high-fidelity mock dress analysis is returned.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image.",
        )

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not configured. Falling back to mock dress analysis.")
        return generate_mock_dress_analysis(file.filename)

    try:
        image_bytes = await file.read()
        import base64
        base64_image = base64.b64encode(image_bytes).decode("utf-8")

        prompt = """
        You are an expert AI Makeup Artist and Luxury Style Director for "Aura Elite".
        Analyze the provided dress image and identify:
        1. The dominant or key color of the dress (e.g. Emerald Green, Royal Blue, Pastel Pink).
        2. The most suitable luxury occasion type for this dress (e.g. Wedding Gala, Romantic Date Night, Cocktail Party, Festive Celebration).
        3. A list of 3 specific makeup recommendations (Lips, Eyes, and Complexion) that perfectly coordinate with the dress color and style.
        4. A detailed, elegant, and sophisticated explanation of the styling rationale.

        Write a personalized explanation in an elegant concierge tone.
        """

        # Call Gemini API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={settings.GEMINI_API_KEY}"
        request_body = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": file.content_type,
                                "data": base64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": GEMINI_DRESS_SCHEMA,
                "temperature": 0.2
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(api_url, json=request_body)
            
            if res.status_code != 200:
                logger.error(f"Gemini API error during dress analysis: {res.status_code} - {res.text}")
                return generate_mock_dress_analysis(file.filename)

            response_data = res.json()
            generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
            analysis_dict = json.loads(generated_text)

            return DressAnalysisResponse(
                dress_color=analysis_dict.get("dress_color", "Royal Blue"),
                occasion_type=analysis_dict.get("occasion_type", "Cocktail Party"),
                makeup_recommendations=[
                    MakeupRecommendation(**m) for m in analysis_dict.get("makeup_recommendations", [])
                ],
                explanation=analysis_dict.get("explanation", ""),
                is_mock=False
            )

    except Exception as e:
        logger.error(f"Failed to get Gemini dress analysis: {str(e)}")
        return generate_mock_dress_analysis(file.filename)


# ── Mock Dress Analysis Generator Fallback ────────────────────────

def generate_mock_dress_analysis(filename: str) -> DressAnalysisResponse:
    """
    Generates high-fidelity mock dress color and makeup recommendations.
    Uses filename or simple hash-based routing to ensure deterministic styling.
    """
    colors = ["Royal Crimson", "Emerald Green", "Midnight Obsidian", "Champagne Gold", "Blush Rose"]
    occasions = ["Wedding Gala / Bridal", "Cocktail Party / Evening Reception", "Romantic Date Night", "Elite Corporate Meet", "Festive Celebration"]
    
    idx = len(filename) % len(colors)
    selected_color = colors[idx]
    selected_occasion = occasions[idx]

    recommendations_db = {
        "Royal Crimson": {
            "makeup": [
                {"name": "Eyes", "description": "Soft matte brown transition with subtle champagne shimmer on the lid, paired with a clean, classic black winged eyeliner to define the eyes without competing with the dress."},
                {"name": "Lips", "description": "A classic satin-finish true red lip color that matches the intensity and undertone of your crimson gown, lined precisely for an elite definition."},
                {"name": "Complexion", "description": "Velvet matte finish with a soft contour. Use a neutral dusty rose blush applied high on the cheekbones to pull the look together harmoniously."}
            ],
            "explanation": "A striking Crimson dress makes a powerful, elegant statement. To complement this, Rossano Ferretti beauty experts suggest a classic Hollywood look. Pairing a structured matte complexion with a matching crimson lip and understated warm eyes creates a timeless, high-contrast silhouette perfect for a Gala."
        },
        "Emerald Green": {
            "makeup": [
                {"name": "Eyes", "description": "Sophisticated warm bronze and copper smokey eyes with rich brown smudged eyeliner. This warm-toned contrast beautifully makes the cool emerald shade pop."},
                {"name": "Lips", "description": "A sophisticated warm nude or creamy peach lip with a touch of gloss, keeping the focus entirely on your striking eyes and dress."},
                {"name": "Complexion", "description": "Dewy, luminous skin with a warm gold highlighter. A peach blush swept across the apples of the cheeks gives a fresh, sun-kissed contrast."}
            ],
            "explanation": "Emerald Green is a rich, regal color. To balance its depth, JCB Lavelle Road styling directors advise choosing a warm bronze eyeshadow palette and a peach-toned nude lip. This gold-accented color harmony adds an air of modern Parisian elegance, perfect for a high-end Cocktail Party."
        },
        "Midnight Obsidian": {
            "makeup": [
                {"name": "Eyes", "description": "A sultry charcoal and silver smokey eye with heavy kohl along the waterlines, blended outwards for a bold, dramatic evening look."},
                {"name": "Lips", "description": "A sophisticated deep berry or cool-toned mauve lip with a matte finish, adding depth and mystery to your look."},
                {"name": "Complexion", "description": "Flawless satin finish with sharp contouring to highlight facial structure. Use a cool-toned plum highlighter for a futuristic metallic glow."}
            ],
            "explanation": "A classic Black dress is a blank canvas for high-drama styling. Warren Tricomi makeup artists recommend a bold charcoal smokey eye paired with deep plum or berry lip tones. This high-fidelity evening look emphasizes structural definition and looks magnificent under luxury lighting."
        },
        "Champagne Gold": {
            "makeup": [
                {"name": "Eyes", "description": "Gilded metallic gold eyeshadow on the inner half of the lid, blending into a warm chocolate brown outer V, finished with volumizing mascara."},
                {"name": "Lips", "description": "A glossed warm brick red or spiced terracotta lip color, adding a beautiful pop of color that enlivens the metallic dress."},
                {"name": "Complexion", "description": "Golden-hour glowing skin. Use a champagne powder highlighter on the high points of the face and a warm terracotta blush."}
            ],
            "explanation": "Champagne Gold exudes absolute opulence. To enhance this metallic luster, Play Salon stylists suggest matching the look with gilded eyes and a rich terracotta or brick red lip. This warm monochromatic glow provides a cohesive and luxurious look for elite evening receptions."
        },
        "Blush Rose": {
            "makeup": [
                {"name": "Eyes", "description": "Rose gold shimmer on the lids, blended with a soft mauve in the crease and finished with chocolate brown liner for a romantic, soft look."},
                {"name": "Lips", "description": "A soft rosebud pink lip balm or cream lipstick that mirrors the gentle, romantic hue of your dress."},
                {"name": "Complexion", "description": "Fresh, youthful glass skin with a pink liquid blush blended upwards, and a pearlescent highlighter for a natural, ethereal glow."}
            ],
            "explanation": "Blush Rose is soft, romantic, and ethereal. BBlunt Premium style directors recommend keeping the makeup soft and radiant. Using rose gold, mauve, and soft rosebud pinks creates a romantic, monochromatic harmony that accentuates your features with subtle, natural beauty."
        }
    }

    data = recommendations_db.get(selected_color, recommendations_db["Royal Crimson"])

    return DressAnalysisResponse(
        dress_color=selected_color,
        occasion_type=selected_occasion,
        makeup_recommendations=[
            MakeupRecommendation(**m) for m in data["makeup"]
        ],
        explanation=data["explanation"],
        is_mock=True
    )


# ── GET /api/concierge/saved ──────────────────────────────────────


@router.get(
    "/saved",
    response_model=List[SavedRecommendationOut],
    summary="Get user's saved concierge recommendations",
)
def get_saved_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all saved lookbooks for the authenticated user, newest first."""
    saved = (
        db.query(SavedRecommendation)
        .filter(SavedRecommendation.user_id == current_user.id)
        .order_by(SavedRecommendation.created_at.desc())
        .all()
    )
    
    # We must deserialize the JSON strings back to objects for the response
    res = []
    for r in saved:
        res.append(
            SavedRecommendationOut(
                id=r.id,
                user_id=r.user_id,
                occasion=r.occasion,
                budget=r.budget,
                location=r.location,
                hair_type=r.hair_type,
                explanation=r.explanation,
                recommended_hairstyles=json.loads(r.recommended_hairstyles),
                recommended_services=json.loads(r.recommended_services),
                recommended_salons=json.loads(r.recommended_salons),
                estimated_budget=r.estimated_budget,
                created_at=r.created_at
            )
        )
    return res


# ── POST /api/concierge/save ──────────────────────────────────────


@router.post(
    "/save",
    response_model=SavedRecommendationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Save a concierge recommendation lookbook",
)
def save_recommendation(
    payload: SavedRecommendationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save an AI styling recommendation lookbook to the user profile."""
    db_rec = SavedRecommendation(
        user_id=current_user.id,
        occasion=payload.occasion,
        budget=payload.budget,
        location=payload.location,
        hair_type=payload.hair_type,
        explanation=payload.explanation,
        recommended_hairstyles=json.dumps(payload.recommended_hairstyles),
        recommended_services=json.dumps(payload.recommended_services),
        recommended_salons=json.dumps(payload.recommended_salons),
        estimated_budget=payload.estimated_budget
    )
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)

    return SavedRecommendationOut(
        id=db_rec.id,
        user_id=db_rec.user_id,
        occasion=db_rec.occasion,
        budget=db_rec.budget,
        location=db_rec.location,
        hair_type=db_rec.hair_type,
        explanation=db_rec.explanation,
        recommended_hairstyles=payload.recommended_hairstyles,
        recommended_services=payload.recommended_services,
        recommended_salons=payload.recommended_salons,
        estimated_budget=db_rec.estimated_budget,
        created_at=db_rec.created_at
    )


# ── DELETE /api/concierge/saved/{id} ──────────────────────────────


@router.delete(
    "/saved/{id}",
    summary="Delete a saved concierge recommendation",
)
def delete_saved_recommendation(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved AI lookbook by ID."""
    rec = db.query(SavedRecommendation).filter(SavedRecommendation.id == id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved recommendation with ID {id} not found."
        )

    if rec.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this saved recommendation."
        )

    db.delete(rec)
    db.commit()
    return {"id": id, "deleted": True}


# ── POST /api/concierge/stylist ──────────────────────────────────

GEMINI_STYLIST_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "category": {
            "type": "STRING",
            "description": "Detected category: Hair, Skin, Nails, Makeup, Beard, Grooming, or General Beauty"
        },
        "observations": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Observed facial/hair/nail details or user description analysis"
        },
        "possible_concerns": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Potential concerns (e.g. Frizz, Dryness, Dullness). Safety rule: NEVER diagnose medical conditions like eczema or psoriasis. Frame as cosmetic concerns (e.g. dryness, irritation)."
        },
        "recommended_services": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "estimated_cost": {"type": "NUMBER"},
                    "why_helps": {"type": "STRING"},
                    "salon_id": {"type": "INTEGER"},
                    "salon_name": {"type": "STRING"},
                    "service_id": {"type": "INTEGER"}
                },
                "required": ["name", "estimated_cost", "why_helps", "salon_id", "salon_name"]
            }
        },
        "price_range_min": {"type": "NUMBER"},
        "price_range_max": {"type": "NUMBER"},
        "suitable_salon_category": {"type": "STRING"},
        "booking_recommendation": {
            "type": "STRING",
            "description": "Specific session booking recommendation (e.g. 90-minute Hair Botox Session)"
        },
        "explanation": {"type": "STRING", "description": "Concise luxury summary / explanation"}
    },
    "required": [
        "category",
        "observations",
        "possible_concerns",
        "recommended_services",
        "price_range_min",
        "price_range_max",
        "suitable_salon_category",
        "booking_recommendation",
        "explanation"
    ]
}

@router.post(
    "/stylist",
    response_model=StylistResponse,
    summary="✨ Aura AI Stylist - Multimodal Beauty Assistant",
)
async def aura_ai_stylist(
    file: UploadFile = File(None),
    query: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Multimodal AI beauty stylist that takes text and/or images to provide cosmetic observations,
    beauty concerns, salon service suggestions, price estimates, and active offers.
    Safety: Never diagnoses medical skin/hair issues (eczema/psoriasis).
    """
    from app.models.offer import Offer

    db_salons = db.query(Salon).all()
    db_services = db.query(Service).all()
    db_offers = db.query(Offer).filter(Offer.is_active == True).all()

    if not db_salons:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No salons available in database.",
        )

    # Fallback if Gemini key is missing
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not configured. Falling back to mock AI Stylist.")
        return generate_mock_stylist_response(query, file, db_salons, db_services, db_offers)

    # Call Gemini API if key is present
    try:
        # Construct JSON schemas
        salons_context = [{"id": s.id, "name": s.name, "area": s.area, "rating": s.rating} for s in db_salons]
        services_context = [{"id": s.id, "salon_id": s.salon_id, "service_name": s.service_name, "category": s.category, "price": s.price} for s in db_services]
        offers_context = [{"title": o.title, "discount_percentage": o.discount_percentage, "salon_id": o.salon_id, "category": o.category} for o in db_offers]

        base64_image = None
        mime_type = None
        if file:
            image_bytes = await file.read()
            import base64
            base64_image = base64.b64encode(image_bytes).decode("utf-8")
            mime_type = file.content_type

        prompt = f"""You are "✨ Aura AI Stylist", the professional beauty, styling, and salon concierge consultant for "Aura Elite", a luxury wellness platform in Bangalore.
Analyze the user's beauty, grooming, or styling request, and analyze the uploaded photo if provided.

USER REQUEST/QUERY:
"{query}"

IMAGE UPLOADED: {"Yes" if file else "No"}

AVAILABLE SALONS:
{json.dumps(salons_context, indent=2)}

AVAILABLE SERVICES:
{json.dumps(services_context, indent=2)}

AVAILABLE OFFERS:
{json.dumps(offers_context, indent=2)}

SAFETY INSTRUCTIONS (CRITICAL):
- You MUST NEVER diagnose medical conditions or mention clinical terms (e.g. eczema, psoriasis, alopecia, dermatitis, acne vulgaris, infections).
- Instead, describe them as cosmetic concerns: e.g. "dryness, scaling, irritation, textures".
- Add a safety note: "The query or image may show signs of dryness or irritation. Consider consulting a dermatologist for professional diagnosis." if any medical-like query is presented.

STEPS:
1. Category Detection: Automatically classify into Hair, Skin, Nails, Makeup, Beard, Grooming, or General Beauty.
2. List 2-3 specific visual or textual observations.
3. List 2-3 cosmetic concerns.
4. Recommend 1-2 actual salon services from the provided database services list that address these concerns. Ensure to fill in the correct salon_id, salon_name, and service_id.
5. Identify any relevant Active Offers from the provided offers list.
6. Provide an estimated price range (min and max) in INR.
7. Recommend a specific Booking recommendation (e.g. "90-minute Hair Botox Session") and write an elegant concierge summary explanation.
"""
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={settings.GEMINI_API_KEY}"
        parts = [{"text": prompt}]
        if base64_image and mime_type:
            parts.append({
                "inlineData": {
                    "mimeType": mime_type,
                    "data": base64_image
                }
            })

        request_body = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": GEMINI_STYLIST_SCHEMA,
                "temperature": 0.3
            }
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(api_url, json=request_body)
            if res.status_code != 200:
                logger.error(f"Gemini API error during stylist chat: {res.status_code} - {res.text}")
                return generate_mock_stylist_response(query, file, db_salons, db_services, db_offers)

            response_data = res.json()
            generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
            
            # Clean up potential markdown formatting from Gemini
            generated_text = generated_text.strip()
            if generated_text.startswith("```json"):
                generated_text = generated_text[7:]
            if generated_text.endswith("```"):
                generated_text = generated_text[:-3]
            generated_text = generated_text.strip()
            
            resp_dict = json.loads(generated_text)

            # Map offers to StylistOffer objects
            mapped_offers = []
            for o in resp_dict.get("active_offers", []):
                mapped_offers.append(StylistOffer(
                    title=o.get("title"),
                    discount_percentage=o.get("discount_percentage", 0),
                    salon_name=o.get("salon_name"),
                    salon_id=o.get("salon_id")
                ))

            if not mapped_offers and db_offers:
                rec_salons_ids = [s.get("salon_id") for s in resp_dict.get("recommended_services", [])]
                for o in db_offers:
                    if o.salon_id in rec_salons_ids:
                        mapped_offers.append(StylistOffer(
                            title=o.title,
                            discount_percentage=o.discount_percentage,
                            salon_name=o.salon.name if o.salon else "Salon Partner",
                            salon_id=o.salon_id
                        ))

            return StylistResponse(
                category=resp_dict.get("category", "General Beauty"),
                observations=resp_dict.get("observations", []),
                possible_concerns=resp_dict.get("possible_concerns", []),
                recommended_services=[
                    StylistService(
                        name=s.get("name"),
                        estimated_cost=s.get("estimated_cost"),
                        why_helps=s.get("why_helps"),
                        salon_id=s.get("salon_id"),
                        salon_name=s.get("salon_name"),
                        service_id=s.get("service_id")
                    ) for s in resp_dict.get("recommended_services", [])
                ],
                price_range_min=resp_dict.get("price_range_min", 0.0),
                price_range_max=resp_dict.get("price_range_max", 0.0),
                suitable_salon_category=resp_dict.get("suitable_salon_category", "Luxury Salon"),
                active_offers=mapped_offers,
                booking_recommendation=resp_dict.get("booking_recommendation", ""),
                explanation=resp_dict.get("explanation", ""),
                is_mock=False
            )

    except Exception as e:
        import traceback
        logger.error(f"Failed to get Gemini stylist response: {repr(e)}\n{traceback.format_exc()}")
        return generate_mock_stylist_response(query, file, db_salons, db_services, db_offers)


def generate_mock_stylist_response(
    query: str,
    file: Any,
    salons: List[Salon],
    services: List[Service],
    offers: List[Any],
) -> StylistResponse:
    """Fallback generator matching queries and files to rich cosmetic responses."""
    q = query.lower() if query else ""
    filename = file.filename.lower() if file else ""

    # Check for medical diagnoses questions
    is_medical = any(word in q for word in ["eczema", "psoriasis", "alopecia", "dermatitis", "infection", "fungus", "disease"])

    # Determine category
    if any(word in q or word in filename for word in ["hair", "frizz", "botox", "keratin", "color", "cut", "bald"]):
        category = "Hair"
    elif any(word in q or word in filename for word in ["skin", "facial", "acne", "dull", "dry", "wrinkle", "dark spot"]):
        category = "Skin"
    elif any(word in q or word in filename for word in ["nail", "manicure", "pedicure", "extensions", "gel", "chrome"]):
        category = "Nails"
    elif any(word in q or word in filename for word in ["makeup", "lips", "eyeliner", "wedding", "glam"]):
        category = "Makeup"
    elif any(word in q or word in filename for word in ["beard", "shave", "trim", "mustache"]):
        category = "Beard"
    else:
        category = "General Beauty"

    # Default Mock Details
    if is_medical:
        category = "Skin"
        observations = ["Scaling and mild redness observed in query details", "Indication of localized dry skin flakes"]
        possible_concerns = ["Cosmetic dryness", "Skin scaling/peeling", "Visual redness"]
        explanation = (
            "Your query mentions symptoms that may align with skin scaling or redness. "
            "Please note that as an AI Beauty Stylist, I cannot provide medical diagnoses. "
            "The query/image may show signs of dryness or cosmetic irritation. We highly recommend consulting a "
            "dermatologist for a professional diagnosis. For gentle cosmetic care, a soothing, hypoallergenic facial "
            "or hydrating scalp therapy at Warren Tricomi using natural botanical formulations is recommended."
        )
        service_keyword = "facial"
        booking_rec = "Soothing Hypoallergenic Facial Consultation"
    elif category == "Hair":
        observations = ["Visual patterns indicate elevated frizz along the cuticle", "Slight dry tips in the hair ends", "Natural wavy structure requiring deep nourishment"]
        possible_concerns = ["Frizz", "Lack of moisture/hydration", "Heat styling dryness"]
        explanation = (
            "Your hair profile shows raised cuticles resulting in elevated frizz and flyaways. "
            "To restore absolute silkiness and lock in moisture, a deep-acting Hair Botox or "
            "Keratin infusion treatment is recommended. This coats the strands with key proteins to seal "
            "in humidity protection."
        )
        service_keyword = "botox" if "botox" in q else "haircut" if "cut" in q else "service"
        booking_rec = "90-minute Hair Botox Revitalization"
    elif category == "Skin":
        observations = ["Subtle moisture deficiency on cheek bones", "Uneven skin tone and minor dullness in texture"]
        possible_concerns = ["Dullness", "Dehydration", "Texture unevenness"]
        explanation = (
            "We observe visual indications of surface dehydration and subtle dullness. "
            "A luxury Hydra Facial or Brightening facial is perfect to deeply cleanse, gently exfoliate, "
            "and infuse antioxidants and hyaluronic acid serums to revive a radiant, luminous glow."
        )
        service_keyword = "facial"
        booking_rec = "75-minute Luxury Hydra Facial Ritual"
    elif category == "Nails":
        observations = ["Inspiration style outlines almond-shaped nails", "Desire for high-shine chrome finish extensions"]
        possible_concerns = ["Nail length enhancement", "Cosmetic styling styling fit"]
        explanation = (
            "To replicate your inspiration design, a set of Gel Nail Extensions with a premium chrome "
            "overlay and precise Almond shaping is recommended. This delivers maximum style longevity and a "
            "flawless, mirror-like luxury finish."
        )
        service_keyword = "nail" if "nail" in q else "manicure"
        booking_rec = "90-minute Premium Gel Chrome Nail Extensions"
    elif category == "Makeup":
        observations = ["Evening gala profile styling requested", "High-visibility lighting coordination needed"]
        possible_concerns = ["Occasion makeup coordination", "Facial structure definition"]
        explanation = (
            "For your special event, we recommend an HD Evening Glam look featuring soft smokey eyes, "
            "champagne gold lid highlights, and a neutral contour to complement your dress color. "
            "Book a session with a master stylist at Warren Tricomi for long-lasting perfection."
        )
        service_keyword = "makeup"
        booking_rec = "60-minute HD Luxury Evening Makeup Styling"
    elif category == "Beard":
        observations = ["Neckline contours show soft stray hairs", "Dry beard texture requiring deep conditioning"]
        possible_concerns = ["Beard shaping", "Dryness/beard itch"]
        explanation = (
            "We recommend a Precision Beard Trim and Hot Towel Beard Spa. The organic oils and warm steam "
            "soften coarse hair, hydrate the skin underneath to prevent itching, and provide a sharp jawline definition."
        )
        service_keyword = "beard" if "beard" in q else "shave"
        booking_rec = "45-minute Royal Hot Towel Beard Trim & Spa"
    else:
        observations = ["General grooming request", "Bangalore salon recommendations requested"]
        possible_concerns = ["Refining general self-care routine"]
        explanation = (
            "To refresh your grooming routine, we suggest a signature precision style haircut and luxury "
            "scalp ritual at Rossano Ferretti or JCB Salon to experience absolute style transformation."
        )
        service_keyword = "haircut"
        booking_rec = "Master Precision Stylist Consultation & Haircut"

    # Search for actual DB service matching category keywords
    rec_services = []
    selected_salon = salons[0]

    # Filter services
    matching_services = [
        s for s in services 
        if service_keyword in s.service_name.lower() or category.lower() in s.category.lower()
    ]
    if not matching_services:
        matching_services = [s for s in services if s.salon_id == selected_salon.id]
    if not matching_services:
        matching_services = services

    # Select 1-2 services
    for i, ms in enumerate(matching_services[:2]):
        salon_obj = next((s for s in salons if s.id == ms.salon_id), selected_salon)
        rec_services.append(StylistService(
            name=ms.service_name,
            estimated_cost=ms.price,
            why_helps=f"Directly targets concerns with premium {category} care.",
            salon_id=ms.salon_id,
            salon_name=salon_obj.name,
            service_id=ms.id
        ))

    # Calculate min/max price
    costs = [s.estimated_cost for s in rec_services]
    price_min = min(costs) * 0.9 if costs else 1000.0
    price_max = sum(costs) * 1.1 if costs else 3000.0

    # Match offers
    rec_salon_ids = [s.salon_id for s in rec_services]
    active_offers = []
    for o in offers:
        if o.salon_id in rec_salon_ids:
            salon_obj = next((s for s in salons if s.id == o.salon_id), selected_salon)
            active_offers.append(StylistOffer(
                title=o.title,
                discount_percentage=o.discount_percentage,
                salon_name=salon_obj.name,
                salon_id=o.salon_id
            ))

    return StylistResponse(
        category=category,
        observations=observations,
        possible_concerns=possible_concerns,
        recommended_services=rec_services,
        price_range_min=round(price_min),
        price_range_max=round(price_max),
        suitable_salon_category="Premium Luxury Spa & Salon",
        active_offers=active_offers,
        booking_recommendation=booking_rec,
        explanation=explanation,
        is_mock=True
    )

