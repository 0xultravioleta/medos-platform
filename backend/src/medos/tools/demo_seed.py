"""Demo seed data generator for MedOS platform.

Generates realistic healthcare demo data: patients, encounters, claims,
prior authorizations, and appointments for demo/testing environments.
"""

import random
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta


@dataclass
class SeedResult:
    """Result of a full demo seed operation."""

    tenant_id: str
    patients: int = 0
    encounters: int = 0
    claims: int = 0
    prior_auths: int = 0
    appointments: int = 0
    seed_timestamp: str = ""


# ---------------------------------------------------------------------------
# Reference data pools
# ---------------------------------------------------------------------------

FIRST_NAMES_FEMALE = [
    "Maria", "Sofia", "Ana", "Isabella", "Valentina", "Camila", "Lucia",
    "Elena", "Gabriela", "Andrea", "Carmen", "Rosa", "Patricia", "Laura",
    "Diana", "Monica", "Natalia", "Angela", "Claudia", "Sandra",
    "Jennifer", "Emily", "Sarah", "Michelle", "Stephanie",
]

FIRST_NAMES_MALE = [
    "Carlos", "James", "Robert", "William", "David", "Miguel", "Jose",
    "Luis", "Antonio", "Jorge", "Ricardo", "Fernando", "Alejandro", "Daniel",
    "Eduardo", "Rafael", "Andres", "Pedro", "Manuel", "Francisco",
    "Michael", "Christopher", "Matthew", "Andrew", "Thomas",
]

LAST_NAMES = [
    "Garcia", "Rodriguez", "Martinez", "Lopez", "Hernandez", "Gonzalez",
    "Perez", "Sanchez", "Ramirez", "Torres", "Flores", "Rivera",
    "Gomez", "Diaz", "Cruz", "Morales", "Reyes", "Gutierrez",
    "Chen", "Kim", "Patel", "Johnson", "Williams", "Brown", "Jones",
    "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson",
    "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
    "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall", "Allen",
    "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams",
]

CITIES = [
    ("Miami", "33131"), ("Miami", "33145"), ("Miami", "33135"),
    ("Miami", "33136"), ("Miami", "33125"), ("Miami", "33130"),
    ("Miami Beach", "33139"), ("Miami Beach", "33140"),
    ("Orlando", "32801"), ("Orlando", "32803"), ("Orlando", "32806"),
    ("Tampa", "33601"), ("Tampa", "33602"), ("Tampa", "33606"),
    ("Jacksonville", "32202"), ("Jacksonville", "32204"),
    ("Fort Lauderdale", "33301"), ("Fort Lauderdale", "33304"),
    ("Coral Gables", "33134"), ("Hialeah", "33010"),
]

STREETS = [
    "Brickell Ave", "Coral Way", "Ocean Drive", "Collins Ave",
    "Flagler St", "Calle Ocho", "NW 14th St", "SW 8th St",
    "Biscayne Blvd", "Lincoln Rd", "Washington Ave", "Alton Rd",
    "Main St", "Palm Ave", "Sunset Dr", "Bird Rd", "Kendall Dr",
    "Le Jeune Rd", "Douglas Rd", "Red Rd",
]

PAYERS = [
    ("Blue Cross Blue Shield FL", "BCBS", "PPO"),
    ("Blue Cross Blue Shield FL", "BCBS", "HMO"),
    ("Aetna", "AET", "PPO"),
    ("Aetna", "AET", "HMO"),
    ("United Healthcare", "UHC", "PPO"),
    ("United Healthcare", "UHC", "EPO"),
    ("Cigna", "CIG", "PPO"),
    ("Humana", "HUM", "HMO"),
    ("Humana", "HUM", "Gold Plus HMO"),
    ("Medicare", "MCR", "Part B"),
]

PROVIDERS = [
    {"id": "prov-001", "name": "Dr. Sarah Kim", "specialty": "orthopedics", "npi": "1234567890"},
    {"id": "prov-002", "name": "Dr. Michael Reyes", "specialty": "orthopedics", "npi": "1234567891"},
    {"id": "prov-003", "name": "Dr. Lisa Tran", "specialty": "dermatology", "npi": "1234567892"},
    {"id": "prov-004", "name": "Dr. Robert Chen", "specialty": "dermatology", "npi": "1234567893"},
    {"id": "prov-005", "name": "Dr. Ana Morales", "specialty": "orthopedics", "npi": "1234567894"},
]

# CPT codes by specialty and type
CPT_CODES = {
    "orthopedics": {
        "office_visit": ["99213", "99214", "99215"],
        "follow_up": ["99213", "99214"],
        "procedure": ["29881", "27447", "29880", "27446", "29876"],
        "telehealth": ["99213", "99214"],
        "urgent_care": ["99214", "99215"],
    },
    "dermatology": {
        "office_visit": ["99213", "99214", "99215"],
        "follow_up": ["99213", "99214"],
        "procedure": ["11102", "17000", "17003", "11100", "17110"],
        "telehealth": ["99213", "99214"],
        "urgent_care": ["99214", "99215"],
    },
}

# ICD-10 codes by specialty
ICD10_CODES = {
    "orthopedics": [
        ("M17.11", "Primary osteoarthritis, right knee"),
        ("M54.5", "Low back pain"),
        ("S83.511A", "Sprain of ACL of right knee, initial"),
        ("M75.11", "Rotator cuff tear, right shoulder"),
        ("M79.3", "Panniculitis, unspecified"),
        ("M25.561", "Pain in right knee"),
        ("M76.891", "Tendinitis, right lower leg"),
        ("M23.611", "Meniscus injury, right knee"),
    ],
    "dermatology": [
        ("L70.0", "Acne vulgaris"),
        ("D22.5", "Melanocytic nevi of trunk"),
        ("L82.1", "Seborrheic keratosis"),
        ("L40.0", "Psoriasis vulgaris"),
        ("C44.311", "Basal cell carcinoma of skin, nose"),
        ("L30.9", "Dermatitis, unspecified"),
        ("L57.0", "Actinic keratosis"),
        ("L50.9", "Urticaria, unspecified"),
    ],
}

ENCOUNTER_TYPES = ["office_visit", "follow_up", "procedure", "telehealth", "urgent_care"]

# CARC (Claim Adjustment Reason Codes) for denied claims
CARC_CODES = [
    ("CO-4", "The procedure code is inconsistent with the modifier used"),
    ("CO-16", "Claim/service lacks information needed for adjudication"),
    ("CO-197", "Precertification/authorization/notification absent"),
    ("PR-1", "Deductible amount"),
    ("CO-50", "Non-covered service"),
    ("CO-97", "Payment adjusted because the benefit for this service is included in another service"),
]

# CPT to typical billed amount ranges
CPT_AMOUNTS = {
    "99213": (100, 175),
    "99214": (150, 250),
    "99215": (225, 350),
    "29881": (3000, 6000),
    "27447": (8000, 15000),
    "29880": (2500, 5000),
    "27446": (7000, 12000),
    "29876": (2000, 4500),
    "11102": (200, 500),
    "17000": (150, 400),
    "17003": (100, 300),
    "11100": (175, 450),
    "17110": (200, 600),
}


@dataclass
class DemoDataGenerator:
    """Generates reproducible demo data for MedOS."""

    seed: int = 42
    _rng: random.Random = field(init=False, repr=False)

    def __post_init__(self):
        self._rng = random.Random(self.seed)  # noqa: S311 -- demo data, not crypto

    def _uuid(self) -> str:
        return str(uuid.UUID(int=self._rng.getrandbits(128), version=4))

    def _date_in_range(self, start: date, end: date) -> date:
        delta = (end - start).days
        return start + timedelta(days=self._rng.randint(0, max(delta, 0)))

    def generate_patients(self, count: int = 50) -> list[dict]:
        """Generate realistic Florida patients in FHIR Patient format."""
        patients = []
        for i in range(count):
            gender = self._rng.choice(["male", "female"])
            first = self._rng.choice(FIRST_NAMES_FEMALE) if gender == "female" else self._rng.choice(FIRST_NAMES_MALE)
            last = self._rng.choice(LAST_NAMES)

            city, zip_code = self._rng.choice(CITIES)
            street_num = self._rng.randint(100, 9999)
            street = self._rng.choice(STREETS)

            # Age 18-85
            today = date.today()
            birth_year = today.year - self._rng.randint(18, 85)
            birth_month = self._rng.randint(1, 12)
            birth_day = self._rng.randint(1, 28)
            dob = date(birth_year, birth_month, birth_day)

            payer_name, payer_prefix, plan = self._rng.choice(PAYERS)
            member_id = f"{payer_prefix}-{self._rng.randint(100000, 999999)}"

            patient_id = f"pat-{i + 1:04d}"
            mrn = f"MRN-2026-{i + 1:04d}"

            patient = {
                "resourceType": "Patient",
                "id": patient_id,
                "identifier": [
                    {
                        "system": "urn:medos:mrn",
                        "value": mrn,
                    },
                    {
                        "system": "urn:oid:2.16.840.1.113883.4.1",
                        "value": f"***-**-{self._rng.randint(1000, 9999)}",
                    },
                ],
                "name": [
                    {
                        "use": "official",
                        "family": last,
                        "given": [first],
                        "text": f"{first} {last}",
                    }
                ],
                "gender": gender,
                "birthDate": dob.isoformat(),
                "telecom": [
                    {
                        "system": "phone",
                        "value": f"({self._rng.choice(['305', '786', '407', '813', '904'])}) "
                        f"555-{self._rng.randint(1000, 9999):04d}",
                    },
                    {
                        "system": "email",
                        "value": f"{first.lower()}.{last.lower()}@email.com",
                    },
                ],
                "address": [
                    {
                        "use": "home",
                        "line": [f"{street_num} {street}"],
                        "city": city,
                        "state": "FL",
                        "postalCode": zip_code,
                    }
                ],
                "insurance": {
                    "provider": payer_name,
                    "plan": plan,
                    "memberId": member_id,
                },
                "active": True,
                "mrn": mrn,
            }
            patients.append(patient)
        return patients

    def generate_encounters(
        self, patients: list[dict], count: int = 200
    ) -> list[dict]:
        """Generate varied encounters linked to patients."""
        encounters = []
        today = date.today()
        ninety_days_ago = today - timedelta(days=90)

        for i in range(count):
            patient = self._rng.choice(patients)
            provider = self._rng.choice(PROVIDERS)
            enc_type = self._rng.choice(ENCOUNTER_TYPES)
            specialty = provider["specialty"]

            cpt_pool = CPT_CODES[specialty][enc_type]
            cpt = self._rng.choice(cpt_pool)

            icd10_code, icd10_desc = self._rng.choice(ICD10_CODES[specialty])

            enc_date = self._date_in_range(ninety_days_ago, today)

            encounter = {
                "resourceType": "Encounter",
                "id": f"enc-{i + 1:04d}",
                "status": "finished",
                "class": enc_type,
                "type": enc_type,
                "subject": {
                    "reference": f"Patient/{patient['id']}",
                    "display": patient["name"][0]["text"],
                },
                "participant": [
                    {
                        "individual": {
                            "reference": f"Practitioner/{provider['id']}",
                            "display": provider["name"],
                        }
                    }
                ],
                "period": {
                    "start": (
                        f"{enc_date.isoformat()}T{self._rng.randint(8, 17):02d}"
                        f":{self._rng.choice(['00', '15', '30', '45'])}:00"
                    ),
                },
                "specialty": specialty,
                "cpt": cpt,
                "icd10": {"code": icd10_code, "display": icd10_desc},
                "provider": provider,
            }
            encounters.append(encounter)
        return encounters

    def generate_claims(self, encounters: list[dict]) -> list[dict]:
        """Generate claims from encounters with realistic status distribution.

        Distribution: 40% paid, 25% pending, 15% denied, 10% submitted, 10% appealing.
        """
        claims = []
        status_weights = ["paid"] * 40 + ["pending"] * 25 + ["denied"] * 15 + ["submitted"] * 10 + ["appealing"] * 10

        for i, encounter in enumerate(encounters):
            cpt = encounter["cpt"]
            low, high = CPT_AMOUNTS.get(cpt, (100, 300))
            billed = round(self._rng.uniform(low, high), 2)

            status = self._rng.choice(status_weights)

            claim: dict = {
                "resourceType": "Claim",
                "id": f"CLM-2026-{i + 1:04d}",
                "status": status,
                "patient": encounter["subject"],
                "provider": encounter["participant"][0]["individual"],
                "encounter": {"reference": f"Encounter/{encounter['id']}"},
                "cpt": cpt,
                "icd10": encounter["icd10"]["code"],
                "billedAmount": billed,
                "created": encounter["period"]["start"][:10],
                "specialty": encounter["specialty"],
            }

            if status == "paid":
                payment_pct = self._rng.uniform(0.85, 1.0)
                claim["paymentAmount"] = round(billed * payment_pct, 2)
                claim["paidDate"] = (
                    date.fromisoformat(claim["created"]) + timedelta(days=self._rng.randint(14, 45))
                ).isoformat()
            elif status == "denied":
                carc_code, carc_desc = self._rng.choice(CARC_CODES)
                claim["denialReason"] = {"code": carc_code, "display": carc_desc}
                claim["paymentAmount"] = 0.0
            elif status == "appealing":
                carc_code, carc_desc = self._rng.choice(CARC_CODES)
                claim["denialReason"] = {"code": carc_code, "display": carc_desc}
                claim["appealDate"] = (
                    date.fromisoformat(claim["created"]) + timedelta(days=self._rng.randint(30, 60))
                ).isoformat()
                claim["paymentAmount"] = 0.0

            claims.append(claim)
        return claims

    def generate_prior_auths(self, encounters: list[dict]) -> list[dict]:
        """Generate prior auth requests for ~20% of encounters (procedure-heavy)."""
        prior_auths = []
        pa_statuses = ["approved", "pending", "denied", "partially_approved"]
        pa_weights = [50, 25, 15, 10]

        # Prioritize procedure encounters for PA
        procedure_encounters = [e for e in encounters if e["type"] == "procedure"]
        other_encounters = [e for e in encounters if e["type"] != "procedure"]

        # All procedures need PA, then fill with ~5% of others
        pa_encounters = list(procedure_encounters)
        other_sample_size = max(1, int(len(other_encounters) * 0.05))
        pa_encounters.extend(self._rng.sample(other_encounters, min(other_sample_size, len(other_encounters))))

        # Limit to ~20% of total
        target = max(1, int(len(encounters) * 0.2))
        if len(pa_encounters) > target:
            pa_encounters = self._rng.sample(pa_encounters, target)

        for i, encounter in enumerate(pa_encounters):
            status = self._rng.choices(pa_statuses, weights=pa_weights, k=1)[0]
            request_date = date.fromisoformat(encounter["period"]["start"][:10]) - timedelta(
                days=self._rng.randint(3, 14)
            )
            turnaround_days = self._rng.randint(1, 10)

            pa: dict = {
                "id": f"PA-2026-{i + 1:04d}",
                "status": status,
                "encounter": {"reference": f"Encounter/{encounter['id']}"},
                "patient": encounter["subject"],
                "provider": encounter["participant"][0]["individual"],
                "cpt": encounter["cpt"],
                "icd10": encounter["icd10"]["code"],
                "requestDate": request_date.isoformat(),
                "turnaroundDays": turnaround_days,
                "specialty": encounter["specialty"],
            }

            if status == "approved":
                pa["responseDate"] = (request_date + timedelta(days=turnaround_days)).isoformat()
                pa["approvedUnits"] = self._rng.randint(1, 6)
            elif status == "partially_approved":
                pa["responseDate"] = (request_date + timedelta(days=turnaround_days)).isoformat()
                pa["approvedUnits"] = 1
                pa["requestedUnits"] = self._rng.randint(2, 6)
            elif status == "denied":
                pa["responseDate"] = (request_date + timedelta(days=turnaround_days)).isoformat()
                pa["denialReason"] = "Medical necessity not demonstrated"

            prior_auths.append(pa)
        return prior_auths

    def generate_appointments(self, patients: list[dict], count: int = 30) -> list[dict]:
        """Generate future appointments over the next 30 days."""
        appointments = []
        today = date.today()
        appt_types = ["Follow-up", "New Patient", "Procedure", "Telehealth", "Annual Exam", "Urgent"]
        statuses = ["confirmed", "pending", "waitlisted"]
        time_slots = [
            "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM",
            "10:30 AM", "11:00 AM", "11:30 AM", "01:00 PM", "01:30 PM",
            "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM",
        ]

        for i in range(count):
            patient = self._rng.choice(patients)
            provider = self._rng.choice(PROVIDERS)
            appt_date = today + timedelta(days=self._rng.randint(1, 30))

            appointment = {
                "id": f"apt-seed-{i + 1:04d}",
                "patientId": patient["id"],
                "patientName": patient["name"][0]["text"],
                "provider": provider["name"],
                "providerId": provider["id"],
                "date": appt_date.isoformat(),
                "time": self._rng.choice(time_slots),
                "type": self._rng.choice(appt_types),
                "status": self._rng.choice(statuses),
                "specialty": provider["specialty"],
            }
            appointments.append(appointment)
        return appointments

    def seed_all(self, tenant_id: str = "demo-tenant") -> SeedResult:
        """Generate all demo data and return summary."""
        patients = self.generate_patients(count=50)
        encounters = self.generate_encounters(patients, count=200)
        claims = self.generate_claims(encounters)
        prior_auths = self.generate_prior_auths(encounters)
        appointments = self.generate_appointments(patients, count=30)

        result = SeedResult(
            tenant_id=tenant_id,
            patients=len(patients),
            encounters=len(encounters),
            claims=len(claims),
            prior_auths=len(prior_auths),
            appointments=len(appointments),
            seed_timestamp=datetime.utcnow().isoformat(),
        )

        # Store generated data for retrieval
        self._last_seed = {
            "patients": patients,
            "encounters": encounters,
            "claims": claims,
            "prior_auths": prior_auths,
            "appointments": appointments,
            "result": result,
        }

        return result

    @property
    def last_seed(self) -> dict | None:
        return getattr(self, "_last_seed", None)
