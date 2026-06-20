"""
FastAPI application entrypoint.

- Creates the app instance with metadata
- Configures CORS middleware
- Creates database tables on startup
- Includes authentication router
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.salons import router as salons_router
from app.api.endpoints.bookings import router as bookings_router
from app.api.endpoints.concierge import router as concierge_router
from app.api.endpoints.reviews import router as reviews_router
from app.api.endpoints.offers import router as offers_router, unprefixed_router as offers_unprefixed_router
from app.core.config import settings
from app.db.session import Base, engine

# Import all models so SQLAlchemy registers them before create_all
from app.models import user, salon, service, booking, review, favorite, recommendation, offer  # noqa: F401


# ── Lifespan: create tables on startup ───────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables when the application starts."""
    Base.metadata.create_all(bind=engine)
    yield


# ── Application Factory ─────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for the Aura Bangalore Luxury Salon Finder platform.",
    lifespan=lifespan,
)


# ── CORS Middleware ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ──────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(salons_router)
app.include_router(bookings_router)
app.include_router(concierge_router)
app.include_router(reviews_router)
app.include_router(offers_router)
app.include_router(offers_unprefixed_router)



# ── Health Check ─────────────────────────────────────────────────


@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }

# Trigger reload to pick up new GEMINI_API_KEY from .env
