"""MedOS Platform - FastAPI Application."""

import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from medos.config import settings
from medos.config.logging import get_logger, setup_logging
from medos.middleware.request_logging import RequestLoggingMiddleware
from medos.routers import agent_cards, agent_tasks, fhir_patient, health, mcp_sse, mock_api

logger = get_logger(__name__)


def _register_mcp_tools() -> None:
    """Register all MCP tools via @hipaa_tool decorators + HIPAAFastMCP."""
    from medos.mcp.hipaa_fastmcp import medos_mcp
    from medos.mcp.servers.fhir_server import register_fhir_tools
    from medos.mcp.servers.scribe_server import register_scribe_tools

    # Initialize server-specific data (demo seed, etc.)
    register_fhir_tools()
    register_scribe_tools()

    # Import billing/scheduling servers to trigger @hipaa_tool registration
    with contextlib.suppress(ImportError):
        from medos.mcp.servers import billing_server, scheduling_server  # noqa: F401

    # Register all decorated tools with FastMCP + internal registry
    medos_mcp.register_hipaa_tools()
    logger.info("mcp_tools_registered", tool_count=medos_mcp._tool_manager.list_tools().__len__())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("medos_starting", env=settings.app_env, debug=settings.app_debug)

    # Register MCP tools
    _register_mcp_tools()
    logger.info("mcp_layer_initialized")

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

    # Core routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(fhir_patient.router, prefix="/fhir/r4", tags=["FHIR Patient"])
    app.include_router(mock_api.router, prefix="/api/v1", tags=["Mock API"])

    # Agentic API layer
    app.include_router(mcp_sse.router)
    app.include_router(agent_tasks.router)
    app.include_router(agent_cards.router)

    # Approval workflow (Sprint 2)
    try:
        from medos.routers.approval_workflow import router as approval_router

        app.include_router(approval_router)
    except ImportError:
        pass  # Not yet created

    # Onboarding wizard (Sprint 5)
    from medos.routers.onboarding import router as onboarding_router

    app.include_router(onboarding_router)

    # Sprint 3: WebSocket events, Agent runner, Workflows
    from medos.routers.agent_runner import router as agent_runner_router
    from medos.routers.workflows import router as workflows_router
    from medos.routers.ws_events import router as ws_events_router

    app.include_router(ws_events_router)
    app.include_router(agent_runner_router)
    app.include_router(workflows_router)

    # Mount MCP as Starlette sub-app (handles /mcp SSE + Streamable HTTP)
    from medos.mcp.hipaa_fastmcp import medos_mcp

    app.mount("/mcp", medos_mcp.streamable_http_app())

    # Dev-only routes (token generation, etc.) -- never in production
    if settings.app_env == "development" and settings.app_debug:
        from medos.routers.dev import router as dev_router

        app.include_router(dev_router)
        logger.info("dev_routes_enabled", path="/dev/*")

    return app


app = create_app()
