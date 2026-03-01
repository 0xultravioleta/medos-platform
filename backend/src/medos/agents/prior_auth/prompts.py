"""Prompt templates for the Prior Authorization agent.

In production, these prompts are sent to Claude via Bedrock.
In development, they document the expected AI behavior for mock responses.
"""

PA_REQUIREMENT_CHECK = """Analyze whether prior authorization is required for:
- Procedure: {procedure_code}
- Diagnosis: {diagnosis_codes}
- Payer: {payer}
- Payer rules: {payer_rules}

Determine if PA is required based on payer rules and procedure type.
Return: {{required: bool, reason: str}}"""

CLINICAL_JUSTIFICATION = """Generate a medical necessity justification for:
- Patient: {patient_id}
- Procedure: {procedure_code} ({procedure_description})
- Diagnosis: {diagnosis_codes}
- Clinical evidence: {clinical_evidence}

Write a compelling, evidence-based narrative that:
1. Describes the patient's condition
2. Explains why conservative treatments failed or are inappropriate
3. Justifies the medical necessity of the requested procedure
4. References clinical guidelines and evidence
5. Is written in professional medical language"""

PA_FORM_GENERATION = """Generate a prior authorization form with:
- Patient demographics from FHIR
- Provider information
- Procedure details with CPT codes
- Diagnosis codes (ICD-10)
- Medical necessity justification
- Supporting clinical evidence references"""
