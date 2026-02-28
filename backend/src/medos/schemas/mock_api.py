"""Pydantic schemas for mock API endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    """Base model that accepts and serializes camelCase JSON keys."""

    model_config = ConfigDict(
        populate_by_name=True,
    )


class Address(BaseModel):
    street: str
    city: str
    state: str
    zip: str


class Insurance(CamelModel):
    provider: str
    plan: str
    member_id: str = Field(serialization_alias="memberId")


class Patient(CamelModel):
    id: str
    name: str
    first_name: str = Field(serialization_alias="firstName")
    last_name: str = Field(serialization_alias="lastName")
    birth_date: str = Field(serialization_alias="birthDate")
    gender: str
    mrn: str
    phone: str
    email: str
    address: Address
    insurance: Insurance
    last_visit: str = Field(serialization_alias="lastVisit")
    next_appointment: str | None = Field(serialization_alias="nextAppointment")
    conditions: list[str]
    risk_score: str = Field(serialization_alias="riskScore")
    status: str


class Appointment(CamelModel):
    id: str
    patient_name: str = Field(serialization_alias="patientName")
    patient_id: str = Field(serialization_alias="patientId")
    time: str
    type: str
    status: str
    provider: str


class DashboardStats(CamelModel):
    total_patients: int = Field(serialization_alias="totalPatients")
    appointments_today: int = Field(serialization_alias="appointmentsToday")
    pending_claims: int = Field(serialization_alias="pendingClaims")
    pending_prior_auths: int = Field(serialization_alias="pendingPriorAuths")
    revenue_this_month: str = Field(serialization_alias="revenueThisMonth")
    claim_denial_rate: str = Field(serialization_alias="claimDenialRate")
    avg_wait_time: str = Field(serialization_alias="avgWaitTime")
    ai_notes_generated: int = Field(serialization_alias="aiNotesGenerated")


class ActivityItem(BaseModel):
    id: str
    action: str
    detail: str
    time: str
    type: str


class Claim(BaseModel):
    id: str
    patient: str
    cpt: str
    icd10: str
    amount: str
    payer: str
    status: str
    date: str


class AiNote(BaseModel):
    id: str
    patient: str
    type: str
    date: str
    confidence: float
    status: str
    preview: str
