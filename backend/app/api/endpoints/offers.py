"""
Offers API endpoints.
Only exposes endpoints to list active offers (sorted by highest discount first).
Removed all owner offer management endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.offer import Offer
from app.schemas.offer import OfferOut

# We declare the router with prefix /api/offers
router = APIRouter(prefix="/api/offers", tags=["Offers"])


# ── GET active offers (Unauthenticated) ──────────────────────────

@router.get(
    "/active",
    response_model=List[OfferOut],
    summary="Get all active offers (prefixed)",
)
def get_active_offers_prefixed(db: Session = Depends(get_db)):
    """Return all active offers where is_active is True, sorted by discount percentage descending."""
    return db.query(Offer).filter(Offer.is_active == True).order_by(Offer.discount_percentage.desc()).all()


# Separate router for un-prefixed '/offers' routes to support legacy frontend endpoints
unprefixed_router = APIRouter(prefix="/offers", tags=["Offers Unprefixed"])

@unprefixed_router.get(
    "/active",
    response_model=List[OfferOut],
    summary="Get all active offers (unprefixed)",
)
def get_active_offers_unprefixed(db: Session = Depends(get_db)):
    """Return all active offers where is_active is True, sorted by discount percentage descending."""
    return db.query(Offer).filter(Offer.is_active == True).order_by(Offer.discount_percentage.desc()).all()
