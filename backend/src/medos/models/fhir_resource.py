"""FHIR Resource model - lives in tenant-specific schemas."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from medos.models.base import Base


class FHIRResource(Base):
    """Stores FHIR R4 resources as JSONB.

    This table is created per-tenant in each tenant's schema.
    The full FHIR resource JSON is stored in the `resource` column.
    GIN index enables fast JSONB queries; btree on (resource_type, tenant_id)
    for filtered lookups.
    """

    __tablename__ = "fhir_resources"
    __table_args__ = (
        Index("ix_fhir_resources_type_tenant", "resource_type", "tenant_id"),
        Index("ix_fhir_resources_resource_gin", "resource", postgresql_using="gin"),
        # No schema= here because this table is created dynamically per-tenant
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    resource: Mapped[dict] = mapped_column(JSONB, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<FHIRResource(id={self.id}, type='{self.resource_type}', v{self.version})>"
