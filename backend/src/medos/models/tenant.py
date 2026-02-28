"""Tenant model - lives in the shared schema."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from medos.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from medos.models.user import User


class Tenant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents a tenant (healthcare organization) in the platform.

    Each tenant gets its own PostgreSQL schema for data isolation.
    Tenant metadata lives in the shared schema.
    """

    __tablename__ = "tenants"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_tenants_slug"),
        {"schema": "shared"},
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(63), nullable=False, unique=True)
    schema_name: Mapped[str] = mapped_column(String(63), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships - "User" resolved by string reference (avoids circular import)
    users: Mapped[list[User]] = relationship("User", back_populates="tenant", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Tenant(id={self.id}, slug='{self.slug}', schema='{self.schema_name}')>"
