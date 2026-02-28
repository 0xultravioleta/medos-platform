"""MedOS Platform - FastAPI Application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from medos.config import settings
from medos.config.logging import get_logger, setup_logging
from medos.middleware.request_logging import RequestLoggingMiddleware
from medos.routers import fhir_patient, health

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("medos_starting", env=settings.app_env, debug=settings.app_debug)
    yield
    # Shutdown
    logger.info("medos_shutting_down")


def create_app() -> FastAPI:
    """Application factory."""
    # Configure structured logging before anything else
    setup_logging(
        log_level="DEBUG" if settings.app_debug else "INFO",
        environment=settings.app_env,
    )

    app = FastAPI(
        title="MedOS Healthcare OS",
        description="AI-Native Operating System for U.S. Healthcare",
        version=settings.app_version,
        docs_url="/docs" if settings.app_debug else None,
        redoc_url="/redoc" if settings.app_debug else None,
        lifespan=lifespan,
    )

    # Request logging middleware (outermost -- captures all requests)
    app.add_middleware(RequestLoggingMiddleware)

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

    # Dev-only routes (token generation, etc.) -- never in production
    if settings.app_env == "development" and settings.app_debug:
        from medos.routers.dev import router as dev_router

        app.include_router(dev_router)
        logger.info("dev_routes_enabled", path="/dev/*")

    return app


app = create_app()
