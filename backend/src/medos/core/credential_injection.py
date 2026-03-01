"""Host-boundary credential injection for agent tool calls.

Implements the IronClaw pattern: secrets NEVER enter LLM context.
Credentials are injected at the execution boundary (PreToolUse hook)
just before a tool handler needs them, and stripped immediately after.

Production flow:
  1. Agent requests tool call (no credentials in params)
  2. PreToolUse hook resolves credentials from Secrets Manager
  3. Tool executes with injected credentials
  4. PostToolUse hook strips credentials from response

Development flow:
  Credentials loaded from environment variables or .env file.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from medos.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CredentialSet:
    """Resolved credentials for a tool invocation."""

    db_session: Any | None = None
    anthropic_api_key: str = ""
    bedrock_config: dict[str, str] = field(default_factory=dict)
    payer_api_keys: dict[str, str] = field(default_factory=dict)
    redis_url: str = ""
    tenant_id: str = ""


class CredentialInjector:
    """Resolves and injects credentials at the tool execution boundary.

    Usage::

        injector = CredentialInjector()
        creds = await injector.resolve(tool_name="fhir_read", tenant_id="t-001")
        # Pass creds to tool handler
        await injector.cleanup(creds)  # strip sensitive data
    """

    async def resolve(
        self,
        tool_name: str,
        tenant_id: str,
        **overrides: Any,
    ) -> CredentialSet:
        """Resolve credentials needed for a specific tool.

        In development: reads from settings/env.
        In production: fetches from AWS Secrets Manager.
        """
        creds = CredentialSet(tenant_id=tenant_id)

        if _is_production():
            creds = await self._resolve_from_secrets_manager(tool_name, tenant_id)
        else:
            creds = self._resolve_from_env(tool_name, tenant_id)

        # Apply any explicit overrides (e.g., db_session from dependency injection)
        for key, value in overrides.items():
            if hasattr(creds, key):
                setattr(creds, key, value)

        logger.info(
            "Credentials resolved for tool=%s tenant=%s",
            tool_name,
            tenant_id,
        )
        return creds

    def _resolve_from_env(self, tool_name: str, tenant_id: str) -> CredentialSet:
        """Resolve credentials from environment for development."""
        creds = CredentialSet(tenant_id=tenant_id)

        # AI credentials
        if _needs_ai_credentials(tool_name):
            if settings.bedrock_enabled:
                creds.bedrock_config = {
                    "region": settings.bedrock_region,
                    "model_id": settings.bedrock_model_id,
                }
            else:
                creds.anthropic_api_key = settings.anthropic_api_key

        # Redis
        creds.redis_url = settings.redis_url

        return creds

    async def _resolve_from_secrets_manager(
        self, tool_name: str, tenant_id: str
    ) -> CredentialSet:
        """Resolve credentials from AWS Secrets Manager for production.

        NOTE: Actual AWS SDK calls will be implemented when Bedrock
        infrastructure is provisioned via Terraform.
        """
        creds = CredentialSet(tenant_id=tenant_id)

        # Placeholder for AWS Secrets Manager integration
        # In production:
        #   client = boto3.client("secretsmanager", region_name=settings.bedrock_region)
        #   secret = client.get_secret_value(SecretId=f"medos/{tenant_id}/...")
        logger.info(
            "Production credential resolution for tool=%s tenant=%s (placeholder)",
            tool_name,
            tenant_id,
        )

        return creds

    async def cleanup(self, creds: CredentialSet) -> None:
        """Zero out sensitive data after tool execution."""
        creds.anthropic_api_key = ""
        creds.bedrock_config = {}
        creds.payer_api_keys = {}
        creds.db_session = None


# Module-level singleton
credential_injector = CredentialInjector()


def _is_production() -> bool:
    return settings.app_env == "production"


def _needs_ai_credentials(tool_name: str) -> bool:
    """Check if a tool requires AI/LLM credentials."""
    ai_tools = {
        "scribe_get_soap_note",
        "scribe_get_transcript",
        "billing_submit_appeal",
        "analytics_denial_patterns",
        "analytics_care_gaps",
        "analytics_readmission_risk",
    }
    return tool_name in ai_tools
