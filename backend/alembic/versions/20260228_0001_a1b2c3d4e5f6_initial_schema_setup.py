"""Initial schema setup - shared schema with tenants, users, and tenant provisioning function.

Revision ID: a1b2c3d4e5f6
Revises: None
Create Date: 2026-02-28 00:00:00.000000+00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- Create the shared schema ---
    op.execute("CREATE SCHEMA IF NOT EXISTS shared")

    # --- Tenants table (shared schema) ---
    op.create_table(
        "tenants",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(63), nullable=False),
        sa.Column("schema_name", sa.String(63), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("settings", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_tenants_slug"),
        sa.UniqueConstraint("schema_name", name="uq_tenants_schema_name"),
        schema="shared",
    )

    # --- Users table (shared schema) ---
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("roles", ARRAY(sa.String(50)), server_default="{}", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("auth_provider_id", sa.String(255), nullable=True),
        sa.Column("mfa_enabled", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["shared.tenants.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        schema="shared",
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"], schema="shared")

    # --- provision_tenant() SQL function ---
    # Creates a new schema with fhir_resources and audit_events tables,
    # plus Row-Level Security policies for defense-in-depth.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION shared.provision_tenant(
            p_schema_name TEXT,
            p_tenant_id UUID
        ) RETURNS VOID AS $$
        BEGIN
            -- Create the tenant schema
            EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);

            -- Create fhir_resources table in tenant schema
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I.fhir_resources (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    resource_type VARCHAR(64) NOT NULL,
                    tenant_id UUID NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    resource JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )', p_schema_name
            );

            -- Create indexes on fhir_resources
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_fhir_resources_type_tenant
                 ON %I.fhir_resources (resource_type, tenant_id)', p_schema_name
            );
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_fhir_resources_resource_gin
                 ON %I.fhir_resources USING gin (resource)', p_schema_name
            );
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_fhir_resources_resource_type
                 ON %I.fhir_resources (resource_type)', p_schema_name
            );
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_fhir_resources_tenant_id
                 ON %I.fhir_resources (tenant_id)', p_schema_name
            );

            -- Create audit_events table in tenant schema
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I.audit_events (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id UUID NOT NULL,
                    user_id UUID,
                    action VARCHAR(64) NOT NULL,
                    resource_type VARCHAR(64),
                    resource_id UUID,
                    details JSONB,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )', p_schema_name
            );

            -- Create indexes on audit_events
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_audit_events_tenant_id
                 ON %I.audit_events (tenant_id)', p_schema_name
            );
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_audit_events_user_id
                 ON %I.audit_events (user_id)', p_schema_name
            );
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_audit_events_action
                 ON %I.audit_events (action)', p_schema_name
            );
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS ix_audit_events_created_at
                 ON %I.audit_events (created_at)', p_schema_name
            );

            -- Enable Row Level Security on fhir_resources
            EXECUTE format(
                'ALTER TABLE %I.fhir_resources ENABLE ROW LEVEL SECURITY', p_schema_name
            );

            -- RLS policy: rows only visible when tenant_id matches the session variable
            EXECUTE format(
                'CREATE POLICY tenant_isolation_fhir ON %I.fhir_resources
                 FOR ALL
                 USING (tenant_id = current_setting(''app.current_tenant_id'')::UUID)
                 WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::UUID)',
                p_schema_name
            );

            -- Enable Row Level Security on audit_events
            EXECUTE format(
                'ALTER TABLE %I.audit_events ENABLE ROW LEVEL SECURITY', p_schema_name
            );

            -- RLS policy for audit_events
            EXECUTE format(
                'CREATE POLICY tenant_isolation_audit ON %I.audit_events
                 FOR ALL
                 USING (tenant_id = current_setting(''app.current_tenant_id'')::UUID)
                 WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::UUID)',
                p_schema_name
            );

        END;
        $$ LANGUAGE plpgsql;
        """
    )

    # --- deprovision_tenant() SQL function ---
    # Drops a tenant schema and all its contents (use with caution).
    op.execute(
        """
        CREATE OR REPLACE FUNCTION shared.deprovision_tenant(
            p_schema_name TEXT
        ) RETURNS VOID AS $$
        BEGIN
            EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_schema_name);
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS shared.deprovision_tenant(TEXT)")
    op.execute("DROP FUNCTION IF EXISTS shared.provision_tenant(TEXT, UUID)")
    op.drop_index("ix_users_tenant_id", table_name="users", schema="shared")
    op.drop_table("users", schema="shared")
    op.drop_table("tenants", schema="shared")
    op.execute("DROP SCHEMA IF EXISTS shared CASCADE")
