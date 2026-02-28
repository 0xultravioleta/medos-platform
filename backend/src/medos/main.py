"""MedOS Platform - FastAPI Application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from medos.config import settings
from medos.routers import fhir_patient, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    yield
    # Shutdown


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title="MedOS Healthcare OS",
        description="AI-Native Operating System for U.S. Healthcare",
        version=settings.app_version,
        docs_url="/docs" if settings.app_debug else None,
        redoc_url="/redoc" if settings.app_debug else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"] if settings.app_debug else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(fhir_patient.router, prefix="/fhir/r4", tags=["FHIR Patient"])

    return app


app = create_app()
