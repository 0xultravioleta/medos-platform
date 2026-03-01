"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    app_name: str = "medos-platform"
    app_env: str = "development"
    app_debug: bool = True
    app_version: str = "0.2.0"
    app_port: int = 8000
    app_host: str = "0.0.0.0"  # noqa: S104

    # Database
    database_url: str = "postgresql+asyncpg://medos:medos@localhost:5432/medos_dev"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_event_stream: str = "medos:events"

    # Auth
    auth_provider: str = "auth0"
    auth_domain: str = ""
    auth_client_id: str = ""
    auth_audience: str = "https://api.medos.health"
    jwks_url: str = ""
    dev_jwt_secret: str = "medos-dev-secret-do-not-use-in-production"  # noqa: S105

    # AI - Claude via Bedrock (production) or direct API (development)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    anthropic_max_tokens: int = 4096

    # AWS Bedrock (production AI backend with HIPAA BAA)
    bedrock_enabled: bool = False
    bedrock_region: str = "us-east-1"
    bedrock_model_id: str = "anthropic.claude-sonnet-4-20250514-v1:0"

    # FHIR
    fhir_base_url: str = "http://localhost:8000/fhir/r4"
    fhir_version: str = "4.0.1"

    # MCP Server
    mcp_server_name: str = "medos-healthcare-os"
    mcp_server_version: str = "1.0.0"
    mcp_sse_enabled: bool = True

    # Agent Configuration
    agent_confidence_threshold: float = 0.85
    agent_max_retries: int = 3
    agent_auto_approve_threshold: float = 0.95
    agent_session_timeout_minutes: int = 30

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
