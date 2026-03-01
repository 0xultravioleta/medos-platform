"""Prompt templates for the Denial Management agent.

In production, these prompts are sent to Claude via Bedrock.
In development, they document the expected AI behavior for mock responses.
"""

DENIAL_ANALYSIS = """Analyze this claim denial:
- Claim ID: {claim_id}
- Denial code: {denial_code} - {denial_reason}
- CPT codes: {cpt_codes}
- ICD-10 codes: {icd10_codes}
- Billed amount: ${billed_amount}
- Payer: {payer}

Classify the root cause:
1. Coding error (modifier, code mismatch)
2. Missing information (auth number, NPI, etc.)
3. Medical necessity dispute
4. Eligibility/coverage issue
5. Timely filing violation
6. Coordination of benefits issue

Return: {{root_cause: str, category: str, correctable: bool}}"""

APPEAL_VIABILITY = """Assess appeal viability for:
- Denial code: {denial_code}
- Historical success rate: {success_rate}%
- Root cause: {root_cause}
- Corrective action available: {correctable}
- Time since denial: {days_since_denial} days
- Appeal deadline: {appeal_deadline} days

Return: {{viable: bool, probability: float, reasoning: str}}"""

APPEAL_LETTER = """Draft a professional appeal letter for:
- Patient: {patient_name}
- Claim: {claim_id}
- Denial reason: {denial_reason}
- Root cause: {root_cause}
- Supporting evidence: {evidence_summary}

The letter should:
1. Reference the specific claim and denial
2. Cite the applicable policy or guideline
3. Present corrective information or additional evidence
4. Request reconsideration with specific next steps
5. Be professional, concise, and evidence-based"""
