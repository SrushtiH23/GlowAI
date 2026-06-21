"""
Seed script for active offers.
Clears existing offers and inserts real-world luxury salon discounts.
Run from the backend directory:
    python seed_offers.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal, Base, engine
from app.models.user import User
from app.models.salon import Salon
from app.models.service import Service
from app.models.booking import Booking
from app.models.review import Review
from app.models.favorite import FavoriteSalon
from app.models.recommendation import SavedRecommendation
from app.models.offer import Offer


def seed_offers():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing offers to ensure clean seeding of verified ones
    print("[INFO] Clearing existing offers...")
    db.query(Offer).delete()
    db.commit()

    # Seed list
    offers_data = [
        {
            "salon_id": 1,
            "title": "30% OFF Royal Scalp Therapy & Method Cut",
            "description": "Nourish your hair and scalp with raw botanicals and organic essential oils. Includes Rossano Ferretti's signature invisible styling cut.",
            "discount_percentage": 30,
            "original_price": 8000.0,
            "offer_price": 5600.0,
            "category": "Hair Care",
            "valid_until": "2026-08-31",
            "is_active": True,
        },
        {
            "salon_id": 2,
            "title": "25% OFF French Balayage Premium",
            "description": "Multi-dimensional custom hand-painted highlights by award-winning art color directors. Includes a luxury hair wash and blow-dry.",
            "discount_percentage": 25,
            "original_price": 9500.0,
            "offer_price": 7125.0,
            "category": "Hair Care",
            "valid_until": "2026-07-15",
            "is_active": True,
        },
        {
            "salon_id": 3,
            "title": "20% OFF 24K Gold Collagen Facial",
            "description": "Luxurious NYC style gold-infused facial therapy targeting instant brightening, microdermabrasion exfoliation, and hydration.",
            "discount_percentage": 20,
            "original_price": 8000.0,
            "offer_price": 6400.0,
            "category": "Skin Care",
            "valid_until": "2026-09-30",
            "is_active": True,
        },
        {
            "salon_id": 4,
            "title": "15% OFF Parisian Chic Haircut & Blowout",
            "description": "Effortless French styling and haircut customized to your texture by JCB senior directors. Complimentary Lavazza coffee.",
            "discount_percentage": 15,
            "original_price": 3000.0,
            "offer_price": 2550.0,
            "category": "Hair Care",
            "valid_until": "2026-08-15",
            "is_active": True,
        },
        {
            "salon_id": 5,
            "title": "50% OFF Ombre & Creative Fashion Color",
            "description": "Unleash bold self-expression with custom pastel, neon, or high-contrast streaks including plex fiber bond protection.",
            "discount_percentage": 50,
            "original_price": 6500.0,
            "offer_price": 3250.0,
            "category": "Hair Care",
            "valid_until": "2026-06-30",
            "is_active": True,
        },
        {
            "salon_id": 6,
            "title": "30% OFF Royal Thai Massage Experience",
            "description": "Authentic full body stretching and acupressure therapy by certified master therapists. Access to imperial steam/jacuzzi suites.",
            "discount_percentage": 30,
            "original_price": 8000.0,
            "offer_price": 5600.0,
            "category": "Spa Treatments",
            "valid_until": "2026-09-15",
            "is_active": True,
        },
        {
            "salon_id": 7,
            "title": "35% OFF Luxury Olaplex Restructuring Therapy",
            "description": "Intensive deep-conditioning bond repair treatment for chemical damage. Includes custom styling assessment and blowout.",
            "discount_percentage": 35,
            "original_price": 4000.0,
            "offer_price": 2600.0,
            "category": "Hair Care",
            "valid_until": "2026-07-31",
            "is_active": True,
        },
        {
            "salon_id": 8,
            "title": "20% OFF Anti-Aging Glow Facial & Peel",
            "description": "Advanced clinical skin resurfacing, peptide hydration, and botanical glow treatment for an instant age-defying lift.",
            "discount_percentage": 20,
            "original_price": 4500.0,
            "offer_price": 3600.0,
            "category": "Skin Care",
            "valid_until": "2026-08-31",
            "is_active": True,
        },
        {
            "salon_id": 9,
            "title": "40% OFF Stress Relief Aromatherapy Full Body Spa",
            "description": "90-minute complete body massage with premium organic lavender and eucalyptus essential oils for pure relaxation.",
            "discount_percentage": 40,
            "original_price": 4000.0,
            "offer_price": 2400.0,
            "category": "Spa Treatments",
            "valid_until": "2026-07-20",
            "is_active": True,
        },
        {
            "salon_id": 10,
            "title": "15% OFF Moroccan Argan Oil Hair Spa",
            "description": "Deep thermal steam therapy and intensive hydration mask treatment using premium Moroccanoil formulations.",
            "discount_percentage": 15,
            "original_price": 3500.0,
            "offer_price": 2975.0,
            "category": "Hair Care",
            "valid_until": "2026-08-10",
            "is_active": True,
        },
        {
            "salon_id": 11,
            "title": "30% OFF Executive Spa Manicure & Pedicure Duo",
            "description": "VIP hands and feet grooming, skin exfoliation, deep massage, and collagen gloves package for ultimate nail care.",
            "discount_percentage": 30,
            "original_price": 2000.0,
            "offer_price": 1400.0,
            "category": "Nails & Grooming",
            "valid_until": "2026-08-25",
            "is_active": True,
        },
        {
            "salon_id": 12,
            "title": "25% OFF Champagne Pedicure Spa Lounge",
            "description": "Bespoke feet grooming spa with high-end scrubs and relaxing massage, served with a complimentary glass of fine bubbly.",
            "discount_percentage": 25,
            "original_price": 3200.0,
            "offer_price": 2400.0,
            "category": "Nails & Grooming",
            "valid_until": "2026-07-05",
            "is_active": True,
        },
    ]

    count = 0
    for data in offers_data:
        # Find salon name
        salon = db.query(Salon).filter(Salon.id == data["salon_id"]).first()
        if salon:
            offer = Offer(
                salon_id=data["salon_id"],
                salon_name=salon.name,
                title=data["title"],
                description=data["description"],
                discount_percentage=data["discount_percentage"],
                original_price=data["original_price"],
                offer_price=data["offer_price"],
                category=data["category"],
                valid_until=data["valid_until"],
                is_active=data["is_active"],
            )
            db.add(offer)
            count += 1

    db.commit()
    db.close()
    print(f"[SUCCESS] Seeded {count} active verified offers.")


if __name__ == "__main__":
    seed_offers()
