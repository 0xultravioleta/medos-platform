"""Multi-stage safety pipeline for agent outputs.

Every agent output passes through this pipeline before delivery:
  1. Block - immediately reject known-dangerous content
  2. Warn - flag risky content for human review
  3. Review - confidence-based routing to human review
  4. Sanitize - strip PHI from outputs going to unauthorized recipients

Configurable per-agent and per-output-type.
"""

from __future__ import annotations

import logging
import re

from medos.config import settings
from medos.schemas.agent import (
    AgentContext,
    AgentType,
    ConfidenceScore,
    SafetyAction,
    SafetyCheckResult,
)

logger = logging.getLogger(__name__)

# HIPAA 18 identifiers - patterns to detect PHI in outputs
_PHI_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("phone", re.compile(r"\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("email", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")),
    ("mrn", re.compile(r"\bMRN[:\s#]?\d{6,}\b", re.IGNORECASE)),
    ("dob", re.compile(r"\b\d{2}/\d{2}/\d{4}\b")),
    ("ip_address", re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b")),
]

# Content that should always be blocked
_BLOCKED_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("medication_dosage_change", re.compile(
        r"(increase|decrease|change|modify)\s+(the\s+)?(dosage|dose|medication)",
        re.IGNORECASE,
    )),
    ("treatment_order", re.compile(
        r"(order|prescribe|administer)\s+\w+.*?\d+\s*(mg|ml|units?)",
        re.IGNORECASE,
    )),
]


class SafetyLayer:
    """Multi-stage safety pipeline for agent outputs.

    Usage::

        safety = SafetyLayer()
        result = safety.check(
            content="Patient John Doe SSN 123-45-6789...",
            agent_ctx=agent_ctx,
            confidence=ConfidenceScore(score=0.7),
        )
        if result.action == SafetyAction.BLOCK:
            # reject output
        elif result.action == SafetyAction.SANITIZE:
            # use result.sanitized_content
    """

    def check(
        self,
        content: str,
        agent_ctx: AgentContext,
        confidence: ConfidenceScore | None = None,
        output_type: str = "text",
    ) -> SafetyCheckResult:
        """Run the full safety pipeline on agent output."""
        checks_passed: list[str] = []
        checks_failed: list[str] = []

        # Stage 1: Block check
        block_reason = self._check_blocked_content(content)
        if block_reason:
            checks_failed.append(f"block:{block_reason}")
            return SafetyCheckResult(
                action=SafetyAction.BLOCK,
                reason=f"Blocked: {block_reason}",
                original_content=content,
                checks_passed=checks_passed,
                checks_failed=checks_failed,
            )
        checks_passed.append("block_check")

        # Stage 2: PHI detection
        phi_found = self._detect_phi(content)
        phi_detected = len(phi_found) > 0

        # Stage 3: Confidence-based review
        confidence_below = False
        if confidence:
            threshold = settings.agent_confidence_threshold
            confidence_below = confidence.score < threshold
            if confidence_below:
                checks_failed.append(f"confidence:{confidence.score}<{threshold}")
            else:
                checks_passed.append("confidence_check")

        # Stage 4: Determine action
        if confidence_below:
            return SafetyCheckResult(
                action=SafetyAction.REVIEW,
                reason=f"Confidence {confidence.score:.2f} below threshold {settings.agent_confidence_threshold}",
                original_content=content,
                phi_detected=phi_detected,
                confidence_below_threshold=True,
                checks_passed=checks_passed,
                checks_failed=checks_failed,
            )

        # Stage 5: PHI sanitization for non-clinical agents
        if phi_detected and not self._agent_can_see_phi(agent_ctx):
            sanitized = self._sanitize_phi(content, phi_found)
            checks_failed.append(f"phi_sanitized:{len(phi_found)}_patterns")
            return SafetyCheckResult(
                action=SafetyAction.SANITIZE,
                reason=f"PHI detected and sanitized for agent type '{agent_ctx.agent_type}'",
                original_content=content,
                sanitized_content=sanitized,
                phi_detected=True,
                checks_passed=checks_passed,
                checks_failed=checks_failed,
            )

        if phi_detected:
            checks_passed.append("phi_allowed_for_agent")

        checks_passed.append("all_checks")
        return SafetyCheckResult(
            action=SafetyAction.PASS,
            reason="All safety checks passed",
            original_content=content,
            phi_detected=phi_detected,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
        )

    def _check_blocked_content(self, content: str) -> str | None:
        """Check for always-blocked content patterns."""
        for name, pattern in _BLOCKED_PATTERNS:
            if pattern.search(content):
                return name
        return None

    def _detect_phi(self, content: str) -> list[tuple[str, str]]:
        """Detect PHI patterns in content. Returns list of (pattern_name, match)."""
        found: list[tuple[str, str]] = []
        for name, pattern in _PHI_PATTERNS:
            matches = pattern.findall(content)
            for match in matches:
                found.append((name, match))
        return found

    def _sanitize_phi(
        self,
        content: str,
        phi_matches: list[tuple[str, str]],
    ) -> str:
        """Replace detected PHI with redaction markers."""
        sanitized = content
        for name, match in phi_matches:
            sanitized = sanitized.replace(match, f"[REDACTED-{name.upper()}]")
        return sanitized

    def _agent_can_see_phi(self, ctx: AgentContext) -> bool:
        """Check if agent type is authorized for PHI access."""
        full_phi_agents = {AgentType.CLINICAL_SCRIBE, AgentType.SYSTEM}
        return ctx.agent_type in full_phi_agents


# Module-level singleton
safety_layer = SafetyLayer()
