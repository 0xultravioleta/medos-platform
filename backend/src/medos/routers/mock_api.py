"""Mock API endpoints returning demo data for frontend consumption."""

from fastapi import APIRouter, HTTPException

from medos.schemas.mock_api import (
    ActivityItem,
    Address,
    AiNote,
    Appointment,
    Claim,
    DashboardStats,
    Insurance,
    Patient,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

PATIENTS: list[Patient] = [
    Patient(
        id="p-001",
        name="Maria Garcia",
        first_name="Maria",
        last_name="Garcia",
        birth_date="1978-03-14",
        gender="female",
        mrn="MRN-2024-0001",
        phone="(305) 555-0101",
        email="maria.garcia@email.com",
        address=Address(
            street="1234 Brickell Ave",
            city="Miami",
            state="FL",
            zip="33131",
        ),
        insurance=Insurance(
            provider="Blue Cross Blue Shield",
            plan="PPO",
            member_id="BCBS-998877",
        ),
        last_visit="2026-02-25",
        next_appointment="2026-03-05",
        conditions=["Type 2 Diabetes", "Hypertension"],
        risk_score="moderate",
        status="active",
    ),
    Patient(
        id="p-002",
        name="James Rodriguez",
        first_name="James",
        last_name="Rodriguez",
        birth_date="1965-11-22",
        gender="male",
        mrn="MRN-2024-0002",
        phone="(305) 555-0102",
        email="james.rodriguez@email.com",
        address=Address(
            street="5678 Coral Way",
            city="Miami",
            state="FL",
            zip="33145",
        ),
        insurance=Insurance(
            provider="Aetna",
            plan="HMO",
            member_id="AET-112233",
        ),
        last_visit="2026-02-27",
        next_appointment="2026-03-01",
        conditions=["COPD", "Sleep Apnea", "Obesity"],
        risk_score="high",
        status="active",
    ),
    Patient(
        id="p-003",
        name="Sofia Martinez",
        first_name="Sofia",
        last_name="Martinez",
        birth_date="1992-07-08",
        gender="female",
        mrn="MRN-2024-0003",
        phone="(305) 555-0103",
        email="sofia.martinez@email.com",
        address=Address(
            street="910 Ocean Drive",
            city="Miami Beach",
            state="FL",
            zip="33139",
        ),
        insurance=Insurance(
            provider="United Healthcare",
            plan="EPO",
            member_id="UHC-445566",
        ),
        last_visit="2026-02-20",
        next_appointment=None,
        conditions=["Asthma"],
        risk_score="low",
        status="discharged",
    ),
    Patient(
        id="p-004",
        name="Robert Chen",
        first_name="Robert",
        last_name="Chen",
        birth_date="1955-01-30",
        gender="male",
        mrn="MRN-2024-0004",
        phone="(305) 555-0104",
        email="robert.chen@email.com",
        address=Address(
            street="2200 Collins Ave",
            city="Miami Beach",
            state="FL",
            zip="33140",
        ),
        insurance=Insurance(
            provider="Medicare",
            plan="Part B",
            member_id="MCR-778899",
        ),
        last_visit="2026-02-26",
        next_appointment="2026-03-02",
        conditions=["Atrial Fibrillation", "CKD Stage 3", "Hypertension"],
        risk_score="high",
        status="active",
    ),
    Patient(
        id="p-005",
        name="Ana Flores",
        first_name="Ana",
        last_name="Flores",
        birth_date="1988-09-12",
        gender="female",
        mrn="MRN-2024-0005",
        phone="(786) 555-0105",
        email="ana.flores@email.com",
        address=Address(
            street="3400 SW 8th St",
            city="Miami",
            state="FL",
            zip="33135",
        ),
        insurance=Insurance(
            provider="Cigna",
            plan="PPO",
            member_id="CIG-334455",
        ),
        last_visit="2026-02-18",
        next_appointment="2026-03-10",
        conditions=["Migraine", "Anxiety"],
        risk_score="low",
        status="scheduled",
    ),
    Patient(
        id="p-006",
        name="William Torres",
        first_name="William",
        last_name="Torres",
        birth_date="1950-04-05",
        gender="male",
        mrn="MRN-2024-0006",
        phone="(786) 555-0106",
        email="william.torres@email.com",
        address=Address(
            street="1100 NW 14th St",
            city="Miami",
            state="FL",
            zip="33136",
        ),
        insurance=Insurance(
            provider="Humana",
            plan="Gold Plus HMO",
            member_id="HUM-667788",
        ),
        last_visit="2026-02-27",
        next_appointment="2026-03-01",
        conditions=[
            "Heart Failure",
            "Type 2 Diabetes",
            "Peripheral Neuropathy",
            "Hyperlipidemia",
        ],
        risk_score="high",
        status="active",
    ),
]

PATIENTS_BY_ID: dict[str, Patient] = {p.id: p for p in PATIENTS}

APPOINTMENTS: list[Appointment] = [
    Appointment(
        id="apt-001",
        patient_name="James Rodriguez",
        patient_id="p-002",
        time="09:00 AM",
        type="Follow-up",
        status="confirmed",
        provider="Dr. Sarah Kim",
    ),
    Appointment(
        id="apt-002",
        patient_name="William Torres",
        patient_id="p-006",
        time="09:30 AM",
        type="Cardiology Consult",
        status="confirmed",
        provider="Dr. Michael Reyes",
    ),
    Appointment(
        id="apt-003",
        patient_name="Maria Garcia",
        patient_id="p-001",
        time="10:15 AM",
        type="Diabetes Management",
        status="in-progress",
        provider="Dr. Sarah Kim",
    ),
    Appointment(
        id="apt-004",
        patient_name="Robert Chen",
        patient_id="p-004",
        time="11:00 AM",
        type="Nephrology Review",
        status="pending",
        provider="Dr. Lisa Tran",
    ),
    Appointment(
        id="apt-005",
        patient_name="Ana Flores",
        patient_id="p-005",
        time="02:00 PM",
        type="Neurology Consult",
        status="pending",
        provider="Dr. Michael Reyes",
    ),
    Appointment(
        id="apt-006",
        patient_name="Sofia Martinez",
        patient_id="p-003",
        time="03:30 PM",
        type="Discharge Follow-up",
        status="completed",
        provider="Dr. Sarah Kim",
    ),
]

DASHBOARD_STATS = DashboardStats(
    total_patients=1247,
    appointments_today=6,
    pending_claims=23,
    pending_prior_auths=8,
    revenue_this_month="$284,500",
    claim_denial_rate="4.2%",
    avg_wait_time="12 min",
    ai_notes_generated=156,
)

ACTIVITY_FEED: list[ActivityItem] = [
    ActivityItem(
        id="act-001",
        action="AI Note Generated",
        detail="SOAP note for Maria Garcia auto-generated",
        time="2 min ago",
        type="ai",
    ),
    ActivityItem(
        id="act-002",
        action="Claim Submitted",
        detail="Claim CLM-2026-0047 submitted to BCBS",
        time="15 min ago",
        type="claim",
    ),
    ActivityItem(
        id="act-003",
        action="Appointment Started",
        detail="Maria Garcia checked in for Diabetes Management",
        time="20 min ago",
        type="appointment",
    ),
    ActivityItem(
        id="act-004",
        action="Prior Auth Alert",
        detail="Prior auth PA-2026-0012 expiring in 48 hours",
        time="1 hour ago",
        type="alert",
    ),
    ActivityItem(
        id="act-005",
        action="AI Note Signed",
        detail="Dr. Kim signed AI note for James Rodriguez",
        time="1 hour ago",
        type="ai",
    ),
    ActivityItem(
        id="act-006",
        action="Claim Denied",
        detail="Claim CLM-2026-0039 denied by Aetna -- missing modifier",
        time="2 hours ago",
        type="claim",
    ),
]

CLAIMS: list[Claim] = [
    Claim(
        id="CLM-2026-0047",
        patient="Maria Garcia",
        cpt="99214",
        icd10="E11.9",
        amount="$185.00",
        payer="Blue Cross Blue Shield",
        status="submitted",
        date="2026-02-28",
    ),
    Claim(
        id="CLM-2026-0046",
        patient="James Rodriguez",
        cpt="99215",
        icd10="J44.1",
        amount="$250.00",
        payer="Aetna",
        status="approved",
        date="2026-02-27",
    ),
    Claim(
        id="CLM-2026-0045",
        patient="Robert Chen",
        cpt="99213",
        icd10="I48.91",
        amount="$135.00",
        payer="Medicare",
        status="pending",
        date="2026-02-26",
    ),
    Claim(
        id="CLM-2026-0039",
        patient="James Rodriguez",
        cpt="94060",
        icd10="J44.1",
        amount="$210.00",
        payer="Aetna",
        status="denied",
        date="2026-02-22",
    ),
    Claim(
        id="CLM-2026-0044",
        patient="William Torres",
        cpt="99215",
        icd10="I50.9",
        amount="$250.00",
        payer="Humana",
        status="submitted",
        date="2026-02-27",
    ),
    Claim(
        id="CLM-2026-0043",
        patient="Ana Flores",
        cpt="99213",
        icd10="G43.909",
        amount="$135.00",
        payer="Cigna",
        status="approved",
        date="2026-02-25",
    ),
]

AI_NOTES: list[AiNote] = [
    AiNote(
        id="note-001",
        patient="Maria Garcia",
        type="SOAP Note",
        date="2026-02-28",
        confidence=0.94,
        status="pending_review",
        preview=(
            "Patient presents for diabetes management follow-up."
            " A1C improved to 7.1% from 7.8%..."
        ),
    ),
    AiNote(
        id="note-002",
        patient="James Rodriguez",
        type="SOAP Note",
        date="2026-02-27",
        confidence=0.97,
        status="signed",
        preview=(
            "COPD exacerbation follow-up. FEV1 stable at 62% predicted."
            " Current regimen effective..."
        ),
    ),
    AiNote(
        id="note-003",
        patient="Robert Chen",
        type="Cardiology Consult",
        date="2026-02-26",
        confidence=0.91,
        status="signed",
        preview=(
            "AF with RVR episode resolved. Rate control with metoprolol"
            " optimized. eGFR stable at 42..."
        ),
    ),
    AiNote(
        id="note-004",
        patient="William Torres",
        type="SOAP Note",
        date="2026-02-27",
        confidence=0.89,
        status="in_progress",
        preview=(
            "Heart failure management visit. BNP trending down to 450."
            " Weight stable. Diuretic dose..."
        ),
    ),
    AiNote(
        id="note-005",
        patient="Ana Flores",
        type="Neurology Consult",
        date="2026-02-18",
        confidence=0.93,
        status="signed",
        preview=(
            "Migraine frequency reduced from 8 to 3 per month with"
            " preventive therapy. Anxiety managed..."
        ),
    ),
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/patients", response_model=list[Patient], response_model_by_alias=True)
async def list_patients():
    """Return all mock patients."""
    return PATIENTS


@router.get(
    "/patients/{patient_id}",
    response_model=Patient,
    response_model_by_alias=True,
)
async def get_patient(patient_id: str):
    """Return a single patient by ID."""
    patient = PATIENTS_BY_ID.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get(
    "/appointments/today",
    response_model=list[Appointment],
    response_model_by_alias=True,
)
async def list_appointments_today():
    """Return today's appointments."""
    return APPOINTMENTS


@router.get(
    "/dashboard/stats",
    response_model=DashboardStats,
    response_model_by_alias=True,
)
async def get_dashboard_stats():
    """Return dashboard statistics."""
    return DASHBOARD_STATS


@router.get(
    "/dashboard/activity",
    response_model=list[ActivityItem],
)
async def get_dashboard_activity():
    """Return recent activity feed."""
    return ACTIVITY_FEED


@router.get("/claims", response_model=list[Claim])
async def list_claims():
    """Return claims list."""
    return CLAIMS


@router.get("/notes", response_model=list[AiNote])
async def list_notes():
    """Return AI-generated notes."""
    return AI_NOTES
