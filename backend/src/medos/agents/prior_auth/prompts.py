"""Prompt templates for the Prior Authorization agent.

In production, these prompts are sent to Claude via Bedrock.
In development, they document the expected AI behavior for mock responses.
"""

PA_REQUIREMENT_CHECK = """Analyze whether prior authorization is required for:
- Procedures: {procedure_codes}
- Diagnosis: {diagnosis_codes}
- Payer: {payer_name} (ID: {payer_id})

Determine if PA is required based on payer rules and procedure type.
Return: {{required: bool, reason: str}}"""

CLINICAL_JUSTIFICATION = """Generate a medical necessity justification for:
- Patient: {patient_id}
- Procedures: {procedure_codes}
- Diagnosis: {diagnosis_codes}
- Clinical evidence: {clinical_evidence}

Write a compelling, evidence-based narrative that:
1. Describes the patient's condition and functional limitations
2. Explains why conservative treatments failed or are inappropriate
3. Justifies the medical necessity of the requested procedure
4. References clinical guidelines and evidence-based literature
5. Addresses expected outcomes and treatment goals
6. Is written in professional medical language suitable for payer review"""

PA_FORM_GENERATION = """Generate a prior authorization request form (X12 278 equivalent) with:
- Patient demographics from FHIR
- Provider information (NPI, specialty, tax ID)
- Procedure details with CPT codes
- Diagnosis codes (ICD-10)
- Medical necessity justification
- Supporting clinical evidence references
- Urgency level
- Effective date range"""
