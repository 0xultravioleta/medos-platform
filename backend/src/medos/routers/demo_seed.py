"""Demo seed data endpoints -- only available in non-production environments."""

import os
from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from medos.tools.demo_seed import DemoDataGenerator

router = APIRouter(prefix="/api/v1/demo", tags=["Demo Seed"])

# Shared generator instance (deterministic, seed=42)
_generator = DemoDataGenerator(seed=42)


def _check_not_production():
    env = os.environ.get("MEDOS_ENV", "development")
    if env == "production":
        raise HTTPException(
            status_code=403,
            detail="Demo seed endpoints are not available in production",
        )


@router.post("/seed")
async def seed_demo_data():
    """Trigger full demo data generation. Not available in production."""
    _check_not_production()
    result = _generator.seed_all()
    return asdict(result)


@router.get("/stats")
async def get_demo_stats():
    """Return current demo data counts. Not available in production."""
    _check_not_production()
    last = _generator.last_seed
    if last is None:
        return {
            "seeded": False,
            "patients": 0,
            "encounters": 0,
            "claims": 0,
            "prior_auths": 0,
            "appointments": 0,
        }
    return {
        "seeded": True,
        "patients": len(last["patients"]),
        "encounters": len(last["encounters"]),
        "claims": len(last["claims"]),
        "prior_auths": len(last["prior_auths"]),
        "appointments": len(last["appointments"]),
    }
