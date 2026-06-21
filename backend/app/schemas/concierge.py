"""
Pydantic schemas for the AI Beauty Concierge module.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


# ── Request Schema ───────────────────────────────────────────────

class ConciergeRequest(BaseModel):
    """Payload sent by the user for bespoke beauty recommendations."""

    budget: float = Field(..., gt=0, description="User's budget in INR (e.g. 5000)")
    occasion: str = Field(..., min_length=1, description="Occasion type, e.g. 'Wedding', 'Daily Luxury'")
    location: str = Field(..., min_length=1, description="Preferred area or 'All Locations'")
    hair_type: str = Field(..., min_length=1, description="User's hair texture/type, e.g. 'Curly', 'Wavy'")


# ── Response Sub-schemas ──────────────────────────────────────────

class HairstyleRecommendation(BaseModel):
    """A recommended hairstyle and description."""

    name: str = Field(..., description="Name of the hairstyle")
    description: str = Field(..., description="Details and style tips for this look")


class ServiceRecommendation(BaseModel):
    """A recommended service matching user preferences."""

    name: str = Field(..., description="Name of the service")
    description: str = Field(..., description="Detailed description of the service")
    price_estimate: float = Field(..., description="Approximate price in INR")
    salon_id: int = Field(..., description="ID of the salon offering this service")
    service_id: Optional[int] = Field(None, description="Database ID of the service if it matches an existing service")


class SalonRecommendation(BaseModel):
    """A recommended salon matching user preferences."""

    name: str = Field(..., description="Name of the salon")
    reason: str = Field(..., description="Why this salon fits the user's requirements")
    salon_id: int = Field(..., description="Database ID of the salon")


# ── Main Response Schema ──────────────────────────────────────────

class ConciergeResponse(BaseModel):
    """Full structured response returned by the AI Beauty Concierge."""

    recommended_hairstyles: List[HairstyleRecommendation] = Field(..., description="Curated list of hairstyles")
    recommended_services: List[ServiceRecommendation] = Field(..., description="Services matching budget and requirements")
    recommended_salons: List[SalonRecommendation] = Field(..., description="Salons corresponding to recommended services")
    estimated_budget: float = Field(..., description="Calculated estimate of recommendations")
    explanation: str = Field(..., description="Personalized explanation from the AI Stylist")
    is_mock: bool = Field(False, description="Indicates if a mock fallback response was used")


class FaceAnalysisResponse(BaseModel):
    """Bespoke response returned by the Face Shape Analyzer."""

    face_shape: str = Field(..., description="Detected face shape, e.g. Oval, Round, Square, Heart, Diamond, Oblong")
    detected_gender: str = Field("Unknown", description="Detected or user-provided gender: Male, Female, or Non-Binary")
    key_features: str = Field("", description="Description of key facial landmarks analyzed (jawline, forehead, cheekbones)")
    skin_tone: str = Field("", description="Detected skin tone for future skincare recommendations")
    confidence: str = Field("High", description="Confidence level of the analysis: High, Medium, or Low")
    recommended_hairstyles: List[HairstyleRecommendation] = Field(..., description="Hairstyles recommended for this face shape and gender")
    explanation: str = Field(..., description="Personalized explanation from the AI Stylist")
    is_mock: bool = Field(False, description="Indicates if a mock fallback response was used")


class MakeupRecommendation(BaseModel):
    """A recommended makeup element and description."""

    name: str = Field(..., description="Name of the makeup category, e.g. Lips, Eyes, Face")
    description: str = Field(..., description="Details and styling advice for this makeup")


class DressAnalysisResponse(BaseModel):
    """Bespoke response returned by the Dress Analyzer."""

    dress_color: str = Field(..., description="Detected color of the dress")
    occasion_type: str = Field(..., description="Recommended occasion type, e.g. Wedding, Cocktail Party")
    makeup_recommendations: List[MakeupRecommendation] = Field(..., description="Makeup suggestions matching the dress")
    explanation: str = Field(..., description="Personalized explanation from the AI Stylist")
    is_mock: bool = Field(False, description="Indicates if a mock fallback response was used")


# ── Stylist Assistant Schemas ─────────────────────────────────────

class StylistService(BaseModel):
    """A recommended service matching user concerns."""

    name: str = Field(..., description="Name of the service")
    estimated_cost: float = Field(..., description="Approximate price in INR")
    why_helps: str = Field(..., description="Why this helps the concern")
    salon_id: int = Field(..., description="ID of the salon offering this service")
    salon_name: str = Field(..., description="Name of the salon")
    service_id: Optional[int] = Field(None, description="Database ID of the service")


class StylistOffer(BaseModel):
    """An active offer available for booking."""

    title: str = Field(..., description="Offer title")
    discount_percentage: float = Field(..., description="Discount percentage")
    salon_name: str = Field(..., description="Salon name")
    salon_id: int = Field(..., description="Salon ID")


class StylistResponse(BaseModel):
    """Full structured response returned by the Aura AI Stylist."""

    category: str = Field(..., description="Detected category: Hair, Skin, Nails, Makeup, Beard, Grooming, or General Beauty")
    observations: List[str] = Field(..., description="Observations from text/image")
    possible_concerns: List[str] = Field(..., description="Possible cosmetic concerns")
    recommended_services: List[StylistService] = Field(..., description="Recommended salon services")
    price_range_min: float = Field(..., description="Minimum estimated cost")
    price_range_max: float = Field(..., description="Maximum estimated cost")
    suitable_salon_category: str = Field(..., description="Suitable salon type/category")
    active_offers: List[StylistOffer] = Field(..., description="Available active offers")
    booking_recommendation: str = Field(..., description="Booking recommendation details")
    explanation: str = Field(..., description="Concierge overview explanation")
    is_mock: bool = Field(False, description="Indicates if a mock fallback response was used")

