"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  Square,
  Pause,
  Play,
  Sparkles,
  Check,
  Loader2,
  FileText,
  ChevronDown,
} from "lucide-react";
import { MOCK_PATIENTS, type MockPatient } from "@/lib/mock-data";

/* ============================================
   Types
   ============================================ */

type Stage = "setup" | "processing" | "result";
type VisitType = "Follow-up" | "New Patient" | "Consultation" | "Lab Review" | "Procedure";

interface ProcessingStep {
  label: string;
  duration: number;
  status: "pending" | "active" | "done";
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface CodeSuggestion {
  code: string;
  description: string;
  confidence: number;
  type: "ICD-10" | "CPT";
}

type EntityType = "MEDICATION" | "LAB VALUE" | "VITALS" | "DIAGNOSIS";

interface MedicalEntity {
  term: string;
  type: EntityType;
}

interface TranscriptLine {
  speaker: "DR" | "PT";
  text: string;
  entities: MedicalEntity[];
}

/* ============================================
   Transcript Data & Helpers
   ============================================ */

const TRANSCRIPT_LINES: TranscriptLine[] = [
  {
    speaker: "DR",
    text: "Good morning, Mr. Chen. How have you been since our last visit?",
    entities: [],
  },
  {
    speaker: "PT",
    text: "The new medication has been helping. My blood sugars have been more stable.",
    entities: [
      { term: "blood sugars", type: "LAB VALUE" },
    ],
  },
  {
    speaker: "DR",
    text: "That's great to hear. Let me check your latest labs... HbA1c is down to 7.2 from 7.8. That's excellent progress.",
    entities: [
      { term: "labs", type: "LAB VALUE" },
      { term: "HbA1c", type: "LAB VALUE" },
    ],
  },
  {
    speaker: "PT",
    text: "I've also been walking 30 minutes every day like you suggested.",
    entities: [],
  },
  {
    speaker: "DR",
    text: "Wonderful. I want to continue the current dose of Metformin 1000mg twice daily.",
    entities: [
      { term: "Metformin", type: "MEDICATION" },
      { term: "1000mg", type: "MEDICATION" },
    ],
  },
  {
    speaker: "DR",
    text: "Let's also schedule a follow-up in 3 months with another A1c check.",
    entities: [
      { term: "A1c", type: "LAB VALUE" },
    ],
  },
];

const MEDICAL_TERMS_PATTERN = /\b(HbA1c|A1c|Metformin|blood sugars?|labs?|mg|1000mg|BP|mmHg|SpO2|HR|bpm)\b/gi;

const ENTITY_COLORS: Record<EntityType, string> = {
  "MEDICATION": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "LAB VALUE": "bg-blue-100 text-blue-700 border-blue-300",
  "VITALS": "bg-orange-100 text-orange-700 border-orange-300",
  "DIAGNOSIS": "bg-purple-100 text-purple-700 border-purple-300",
};

/**
 * Build an entity lookup from term -> EntityType for a given line.
 */
function buildEntityMap(entities: MedicalEntity[]): Map<string, EntityType> {
  const map = new Map<string, EntityType>();
  for (const e of entities) {
    map.set(e.term.toLowerCase(), e.type);
  }
  return map;
}

/**
 * Renders transcript text with highlighted medical terms and inline entity badges.
 */
function renderTranscriptText(text: string, entities: MedicalEntity[]): React.ReactNode {
  const entityMap = buildEntityMap(entities);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // Use the global medical terms pattern to find all highlights
  const regex = new RegExp(MEDICAL_TERMS_PATTERN.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    const matchedText = match[0];
    const entityType = entityMap.get(matchedText.toLowerCase());

    parts.push(
      <span key={key++} className="relative inline-flex items-center gap-1">
        <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-900 font-medium">
          {matchedText}
        </span>
        {entityType && (
          <span
            className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-bold border leading-tight ${ENTITY_COLORS[entityType]}`}
          >
            {entityType}
          </span>
        )}
      </span>
    );

    lastIndex = match.index + matchedText.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

/* ============================================
   SOAP Note Data (per patient)
   ============================================ */

function getSOAPNote(patient: MockPatient): SOAPNote {
  const name = patient.name;

  if (name === "Maria Garcia") {
    return {
      subjective:
        "Patient presents for follow-up of Type 2 Diabetes Mellitus and Hypertension. She reports improved adherence to metformin 1000mg BID and lisinopril 20mg daily over the past month. She denies polyuria, polydipsia, or blurred vision. She notes occasional mild headaches in the morning, typically resolving by midday. Diet has been moderately controlled with reduced carbohydrate intake per nutritionist recommendations.",
      objective:
        "Vitals: BP 138/82 mmHg (improved from 148/90), HR 76 bpm, Temp 98.4F, SpO2 98% on RA, Weight 168 lbs (down 3 lbs). General: Well-appearing, no acute distress. HEENT: PERRLA, no retinal changes on fundoscopic exam. Cardiovascular: RRR, no murmurs, gallops, or rubs. Extremities: No peripheral edema, pedal pulses 2+ bilaterally. Neuro: Sensation intact to monofilament bilaterally. Labs: HbA1c 7.2% (down from 7.8%), fasting glucose 142 mg/dL, BMP within normal limits, eGFR 88 mL/min.",
      assessment:
        "1. Type 2 Diabetes Mellitus with improving glycemic control (HbA1c 7.2%, down from 7.8%). Current regimen showing efficacy. 2. Essential Hypertension - partially controlled. BP trending toward goal but still above 130/80 target. Morning headaches may correlate with residual elevation.",
      plan:
        "1. Continue metformin 1000mg BID - patient tolerating well. 2. Increase lisinopril from 20mg to 40mg daily for better BP control. 3. Continue home blood glucose monitoring BID, target fasting glucose <130 mg/dL. 4. Repeat HbA1c in 3 months, target <7.0%. 5. Referral to ophthalmology for annual diabetic eye exam. 6. Follow up in 6 weeks to reassess BP on adjusted medication. 7. Continue nutrition counseling - reinforce Mediterranean diet approach.",
    };
  }

  if (name === "Robert Chen") {
    return {
      subjective:
        "Patient presents for follow-up of Atrial Fibrillation and Chronic Kidney Disease Stage 3. He reports two episodes of palpitations last week, each lasting approximately 10-15 minutes, occurring at rest. He denies chest pain, syncope, or dyspnea on exertion. He has been compliant with apixaban 5mg BID and metoprolol succinate 50mg daily. He notes mild fatigue but attributes it to poor sleep quality.",
      objective:
        "Vitals: BP 126/78 mmHg, HR 68 bpm (irregularly irregular), Temp 98.2F, SpO2 97% on RA, Weight 185 lbs. General: Alert, oriented, no acute distress. Cardiovascular: Irregularly irregular rhythm, rate controlled, no murmurs, no JVD. Lungs: CTAB, no wheezes or crackles. Extremities: Trace bilateral ankle edema. Labs: BMP - Creatinine 1.6 mg/dL (stable), eGFR 48 mL/min (stable CKD3), BUN 28, K+ 4.3 mEq/L. INR not applicable (on DOAC). ECG: AFib with controlled ventricular rate, no ST changes.",
      assessment:
        "1. Atrial Fibrillation - rate controlled on current regimen, though breakthrough palpitations noted. CHA2DS2-VASc score 4, appropriately anticoagulated. 2. Chronic Kidney Disease Stage 3 - stable, eGFR 48 mL/min, no progression from prior visit. Apixaban dose appropriate for renal function. 3. Hypertension - well controlled on current regimen.",
      plan:
        "1. Continue apixaban 5mg BID - renal function stable, no dose adjustment needed. 2. Increase metoprolol succinate from 50mg to 75mg daily to reduce breakthrough palpitations. 3. Order Holter monitor for 48-hour continuous rhythm assessment. 4. Repeat BMP and CBC in 6 weeks to monitor renal function. 5. Echocardiogram in 3 months to reassess LV function and LA size. 6. Sleep study referral given reported poor sleep quality and fatigue - rule out OSA. 7. Follow up in 4 weeks after Holter results available.",
    };
  }

  if (name === "William Torres") {
    return {
      subjective:
        "Patient presents for follow-up of Heart Failure NYHA Class II and Type 2 Diabetes with Peripheral Neuropathy. He reports stable exercise tolerance - able to walk two blocks without significant dyspnea, consistent with prior visits. He has been weighing daily and notes weight has been stable within 2 lbs. He reports persistent tingling and numbness in bilateral feet, worse at night. He denies orthopnea, PND, or chest pain. Adherence to medications including sacubitril/valsartan, carvedilol, and gabapentin has been good.",
      objective:
        "Vitals: BP 118/72 mmHg, HR 62 bpm, Temp 98.6F, SpO2 96% on RA, Weight 202 lbs (stable). General: Pleasant, no acute distress, mild fatigue appearance. Cardiovascular: RRR, S1/S2 present, no S3 or S4, no murmurs. JVP estimated at 7 cm. Lungs: Clear bilaterally, no rales or wheezes. Abdomen: Soft, non-distended, no hepatomegaly. Extremities: No peripheral edema today. Neuro: Decreased sensation to light touch and vibration in stocking distribution bilaterally. Labs: BNP 245 pg/mL (down from 310), BMP - Na 138, K 4.1, Cr 1.2, eGFR 62. HbA1c 7.5%. Lipid panel: TC 188, LDL 95, HDL 42, TG 180.",
      assessment:
        "1. Heart Failure NYHA Class II - stable on GDMT, BNP trending down, no volume overload. 2. Type 2 Diabetes Mellitus - suboptimally controlled, HbA1c 7.5%. 3. Diabetic Peripheral Neuropathy - symptomatic, affecting sleep quality. 4. Hyperlipidemia - LDL at goal on statin, but TG elevated and HDL low.",
      plan:
        "1. Continue sacubitril/valsartan 49/51mg BID and carvedilol 12.5mg BID - HF stable. 2. Add empagliflozin 10mg daily - dual benefit for HF and glycemic control (cardiovascular and renal protection). 3. Increase gabapentin from 300mg TID to 400mg TID for neuropathy symptoms. 4. Add icosapent ethyl 2g BID for elevated triglycerides. 5. Continue daily weights, 2g sodium restriction, fluid limit 2L/day. 6. Repeat BNP, BMP, and HbA1c in 8 weeks. 7. Podiatry referral for diabetic foot care assessment. 8. Follow up in 6 weeks to reassess HF status and medication tolerance.",
    };
  }

  // Default fallback
  return {
    subjective:
      `Patient ${patient.name} presents for a ${patient.conditions.length > 0 ? "follow-up" : "routine"} visit. ${patient.conditions.length > 0 ? `Current conditions include ${patient.conditions.join(", ")}. ` : ""}Patient reports overall stable symptoms with good medication adherence. No new complaints or acute concerns reported. Patient denies fever, chills, or unintentional weight changes.`,
    objective:
      "Vitals: BP 122/76 mmHg, HR 72 bpm, Temp 98.4F, SpO2 98% on RA. General: Well-appearing, no acute distress. HEENT: Normocephalic, atraumatic. Cardiovascular: RRR, no murmurs. Lungs: CTAB bilaterally. Abdomen: Soft, non-tender, non-distended. Extremities: No edema, pulses intact.",
    assessment:
      `${patient.conditions.length > 0 ? patient.conditions.map((c, i) => `${i + 1}. ${c} - stable on current management`).join(". ") : "1. Routine wellness visit - no acute findings"}. Patient is clinically stable with no evidence of decompensation.`,
    plan:
      "1. Continue current medication regimen - patient tolerating well. 2. Routine lab work ordered: CBC, CMP, lipid panel. 3. Age-appropriate preventive screenings reviewed and up to date. 4. Follow up in 3 months or sooner if symptoms change. 5. Patient counseled on maintaining healthy lifestyle including regular exercise and balanced diet.",
  };
}

function getCodeSuggestions(patient: MockPatient): CodeSuggestion[] {
  const name = patient.name;

  if (name === "Maria Garcia") {
    return [
      { code: "E11.65", description: "Type 2 DM with hyperglycemia", confidence: 96, type: "ICD-10" },
      { code: "I10", description: "Essential hypertension", confidence: 94, type: "ICD-10" },
      { code: "Z79.84", description: "Long-term use of oral hypoglycemic", confidence: 88, type: "ICD-10" },
      { code: "99214", description: "Office visit, established, moderate complexity", confidence: 91, type: "CPT" },
    ];
  }

  if (name === "Robert Chen") {
    return [
      { code: "I48.91", description: "Unspecified atrial fibrillation", confidence: 95, type: "ICD-10" },
      { code: "N18.3", description: "Chronic kidney disease, stage 3", confidence: 93, type: "ICD-10" },
      { code: "I10", description: "Essential hypertension", confidence: 90, type: "ICD-10" },
      { code: "99215", description: "Office visit, established, high complexity", confidence: 89, type: "CPT" },
    ];
  }

  if (name === "William Torres") {
    return [
      { code: "I50.22", description: "Chronic systolic heart failure, NYHA II", confidence: 97, type: "ICD-10" },
      { code: "E11.42", description: "Type 2 DM with diabetic polyneuropathy", confidence: 94, type: "ICD-10" },
      { code: "E78.5", description: "Hyperlipidemia, unspecified", confidence: 91, type: "ICD-10" },
      { code: "G62.9", description: "Polyneuropathy, unspecified", confidence: 86, type: "ICD-10" },
      { code: "99215", description: "Office visit, established, high complexity", confidence: 93, type: "CPT" },
    ];
  }

  return [
    { code: "Z00.00", description: "General adult medical examination", confidence: 85, type: "ICD-10" },
    { code: "99213", description: "Office visit, established, low complexity", confidence: 82, type: "CPT" },
  ];
}

/* ============================================
   Component
   ============================================ */

export default function AIScribeNewPage() {
  // Stage management
  const [stage, setStage] = useState<Stage>("setup");

  // Setup state
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [visitType, setVisitType] = useState<VisitType>("Follow-up");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Processing state
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);

  // Result state
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [typedText, setTypedText] = useState<Record<string, string>>({});
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transcript state
  const [transcriptVisibleLines, setTranscriptVisibleLines] = useState<number>(0);
  const [transcriptCharIndex, setTranscriptCharIndex] = useState<number>(0);
  const [transcriptConfidence, setTranscriptConfidence] = useState<number>(98.2);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const transcriptIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confidenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPatient = MOCK_PATIENTS.find((p) => p.id === selectedPatientId) || null;

  /* ---- Recording timer ---- */

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  /* ---- Live transcript simulation ---- */

  /**
   * We use a single "global cursor" approach:
   * - Compute the total number of characters across all lines
   *   (with a gap of PAUSE_CHARS between lines to simulate thinking pauses)
   * - A single setInterval advances a counter; we derive lineIdx + charIdx from it
   */
  const PAUSE_CHARS = 30; // "virtual" chars between lines = pause duration at 40ms each = 1.2s

  useEffect(() => {
    if (!isRecording || isPaused) {
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
        transcriptIntervalRef.current = null;
      }
      if (confidenceIntervalRef.current) {
        clearInterval(confidenceIntervalRef.current);
        confidenceIntervalRef.current = null;
      }
      return;
    }

    // Compute boundaries: each line occupies line.text.length + PAUSE_CHARS (except last)
    const boundaries: { lineStart: number; lineEnd: number }[] = [];
    let cursor = 0;
    for (let i = 0; i < TRANSCRIPT_LINES.length; i++) {
      const start = cursor;
      const end = cursor + TRANSCRIPT_LINES[i].text.length;
      boundaries.push({ lineStart: start, lineEnd: end });
      cursor = end + (i < TRANSCRIPT_LINES.length - 1 ? PAUSE_CHARS : 0);
    }
    const totalVirtualChars = cursor;

    // Use a ref-like approach via closure for the global position
    let globalPos = 0;

    // Determine initial position from current state so pause/resume works
    for (let i = 0; i < transcriptVisibleLines && i < boundaries.length; i++) {
      globalPos = boundaries[i].lineEnd + PAUSE_CHARS;
    }
    if (transcriptVisibleLines < TRANSCRIPT_LINES.length) {
      globalPos = (boundaries[transcriptVisibleLines]?.lineStart ?? globalPos) + transcriptCharIndex;
    }

    const startDelay = setTimeout(() => {
      transcriptIntervalRef.current = setInterval(() => {
        globalPos += 2; // advance 2 chars per tick

        if (globalPos >= totalVirtualChars) {
          // All lines done
          globalPos = totalVirtualChars;
          setTranscriptVisibleLines(TRANSCRIPT_LINES.length);
          setTranscriptCharIndex(TRANSCRIPT_LINES[TRANSCRIPT_LINES.length - 1].text.length);
          if (transcriptIntervalRef.current) clearInterval(transcriptIntervalRef.current);
          return;
        }

        // Find which line we are in
        let foundLine = 0;
        let charInLine = 0;
        for (let i = 0; i < boundaries.length; i++) {
          const { lineStart, lineEnd } = boundaries[i];
          if (globalPos < lineEnd) {
            // Currently typing this line
            foundLine = i;
            charInLine = Math.min(globalPos - lineStart, TRANSCRIPT_LINES[i].text.length);
            break;
          } else if (globalPos >= lineEnd && (i === boundaries.length - 1 || globalPos < boundaries[i + 1].lineStart)) {
            // In the pause gap after this line
            foundLine = i;
            charInLine = TRANSCRIPT_LINES[i].text.length;
            break;
          }
          // Otherwise check next line
          foundLine = i + 1;
          charInLine = 0;
        }

        // Update state: all lines before foundLine are fully visible
        // foundLine itself is partially visible at charInLine chars
        setTranscriptVisibleLines(foundLine);
        setTranscriptCharIndex(charInLine);
      }, 40);

      // Confidence fluctuation
      confidenceIntervalRef.current = setInterval(() => {
        setTranscriptConfidence((prev) => {
          const delta = (Math.random() - 0.5) * 0.6;
          const next = prev + delta;
          return Math.min(99.4, Math.max(96.5, next));
        });
      }, 800);
    }, transcriptVisibleLines === 0 && transcriptCharIndex === 0 ? 1500 : 0);

    return () => {
      clearTimeout(startDelay);
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
        transcriptIntervalRef.current = null;
      }
      if (confidenceIntervalRef.current) {
        clearInterval(confidenceIntervalRef.current);
        confidenceIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isPaused]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcriptVisibleLines, transcriptCharIndex]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  /* ---- Recording controls ---- */

  const startRecording = () => {
    if (!selectedPatientId) return;
    setIsRecording(true);
    setIsPaused(false);
    setRecordingSeconds(0);
    setTranscriptVisibleLines(0);
    setTranscriptCharIndex(0);
    setTranscriptConfidence(98.2);
  };

  const togglePause = () => {
    setIsPaused((p) => !p);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    startProcessing();
  };

  /* ---- Processing simulation ---- */

  const startProcessing = () => {
    setStage("processing");

    const steps: ProcessingStep[] = [
      { label: "Transcribing audio...", duration: 1500, status: "pending" },
      { label: "Identifying clinical entities...", duration: 1200, status: "pending" },
      { label: "Generating SOAP note...", duration: 2000, status: "pending" },
      { label: "Suggesting ICD-10 codes...", duration: 1000, status: "pending" },
      { label: "Recommending CPT codes...", duration: 800, status: "pending" },
    ];

    setProcessingSteps(steps);
    setProgressPercent(0);

    let currentIdx = 0;
    const totalDuration = steps.reduce((acc, s) => acc + s.duration, 0);
    let elapsed = 0;

    const processStep = () => {
      if (currentIdx >= steps.length) {
        setProgressPercent(100);
        setTimeout(() => setStage("result"), 400);
        return;
      }

      // Mark current step as active
      setProcessingSteps((prev) =>
        prev.map((s, i) => ({
          ...s,
          status: i === currentIdx ? "active" : i < currentIdx ? "done" : "pending",
        }))
      );

      const stepDuration = steps[currentIdx].duration;

      // Animate progress during this step
      const progressStart = (elapsed / totalDuration) * 100;
      const progressEnd = ((elapsed + stepDuration) / totalDuration) * 100;
      const progressInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev >= progressEnd) {
            clearInterval(progressInterval);
            return progressEnd;
          }
          return prev + (progressEnd - progressStart) / (stepDuration / 50);
        });
      }, 50);

      setTimeout(() => {
        clearInterval(progressInterval);
        elapsed += stepDuration;
        setProgressPercent((elapsed / totalDuration) * 100);

        // Mark current step as done
        setProcessingSteps((prev) =>
          prev.map((s, i) => ({
            ...s,
            status: i <= currentIdx ? "done" : s.status,
          }))
        );

        currentIdx++;
        processStep();
      }, stepDuration);
    };

    processStep();
  };

  /* ---- Result typewriter ---- */

  const typeText = useCallback((key: string, fullText: string, onDone: () => void) => {
    let i = 0;
    const speed = 8; // ms per character
    const tick = () => {
      i += 3; // type 3 chars at a time for speed
      if (i >= fullText.length) {
        setTypedText((prev) => ({ ...prev, [key]: fullText }));
        onDone();
        return;
      }
      setTypedText((prev) => ({ ...prev, [key]: fullText.slice(0, i) }));
      typingRef.current = setTimeout(tick, speed);
    };
    tick();
  }, []);

  useEffect(() => {
    if (stage !== "result" || !selectedPatient) return;

    const soap = getSOAPNote(selectedPatient);
    const sections = ["subjective", "objective", "assessment", "plan"] as const;
    let idx = 0;

    const showNext = () => {
      if (idx >= sections.length) return;
      const key = sections[idx];
      setVisibleSections((prev) => [...prev, key]);
      typeText(key, soap[key], () => {
        idx++;
        setTimeout(showNext, 300);
      });
    };

    const timer = setTimeout(showNext, 400);
    return () => {
      clearTimeout(timer);
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [stage, selectedPatient, typeText]);

  /* ============================================
     Render
     ============================================ */

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top nav */}
      <Link
        href="/ai-notes"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--medos-gray-500)] hover:text-[var(--medos-primary)] transition-default"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notes
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--medos-primary-light)]">
          <Mic className="w-5 h-5 text-[var(--medos-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--medos-navy)]">AI Scribe</h1>
          <p className="text-sm text-[var(--medos-gray-500)]">
            Ambient clinical documentation
          </p>
        </div>
      </div>

      {/* ==================== STAGE 1: Setup & Recording ==================== */}
      {stage === "setup" && (
        <div className="space-y-6">
          {/* Patient & visit type selectors */}
          {!isRecording && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient selector */}
              <div>
                <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
                  Patient
                </label>
                <div className="relative">
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full h-11 pl-3 pr-10 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="">Select patient...</option>
                    {MOCK_PATIENTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.mrn}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)] pointer-events-none" />
                </div>
              </div>

              {/* Visit type selector */}
              <div>
                <label className="block text-sm font-medium text-[var(--medos-gray-700)] mb-1.5">
                  Visit Type
                </label>
                <div className="relative">
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as VisitType)}
                    className="w-full h-11 pl-3 pr-10 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm text-[var(--medos-gray-900)] focus:outline-none focus:ring-2 focus:ring-[var(--medos-primary)] focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="Follow-up">Follow-up</option>
                    <option value="New Patient">New Patient</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Lab Review">Lab Review</option>
                    <option value="Procedure">Procedure</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--medos-gray-400)] pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Selected patient info card */}
          {selectedPatient && !isRecording && (
            <div className="bg-[var(--medos-primary-50)] border border-[var(--medos-primary-light)] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">
                    {selectedPatient.name}
                  </p>
                  <p className="text-xs text-[var(--medos-gray-500)] mt-0.5">
                    {selectedPatient.mrn} | {selectedPatient.gender} | DOB: {selectedPatient.birthDate}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPatient.conditions.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white text-[var(--medos-gray-700)] border border-[var(--medos-gray-200)]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recording area */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-8">
            {!isRecording ? (
              /* Start recording button */
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={startRecording}
                  disabled={!selectedPatientId}
                  className="group flex items-center justify-center w-24 h-24 rounded-full bg-[var(--medos-primary)] text-white hover:bg-[var(--medos-primary-hover)] transition-default disabled:opacity-40 disabled:cursor-not-allowed shadow-medos-lg hover:shadow-medos-xl"
                >
                  <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--medos-navy)]">
                    Start Recording
                  </p>
                  <p className="text-xs text-[var(--medos-gray-400)] mt-1">
                    {selectedPatientId
                      ? "Click to begin ambient capture"
                      : "Select a patient first"}
                  </p>
                </div>
              </div>
            ) : (
              /* Active recording UI with transcript panel */
              <div className="flex flex-col gap-6">
                {/* Top bar: pulsing indicator + timer + confidence */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                    </span>
                    <span className="text-lg font-mono font-bold text-[var(--medos-navy)]">
                      {formatTime(recordingSeconds)}
                    </span>
                    {isPaused && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--medos-gray-500)]">
                    <span className="font-medium">
                      {selectedPatient?.name}
                    </span>
                    <span className="text-[var(--medos-gray-300)]">&middot;</span>
                    <span>{visitType}</span>
                  </div>
                </div>

                {/* Main recording area: waveform left + transcript right */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left: Waveform + recording info */}
                  <div className="flex flex-col items-center justify-center gap-5">
                    {/* Waveform visualization */}
                    <div className="flex items-center justify-center gap-[3px] h-16 w-full max-w-md">
                      {Array.from({ length: 28 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-full"
                          style={{
                            backgroundColor: isPaused ? "var(--medos-gray-300)" : "var(--medos-primary)",
                            animation: isPaused ? "none" : `waveform 1.2s ease-in-out ${i * 0.04}s infinite alternate`,
                            height: isPaused ? "8px" : undefined,
                            opacity: isPaused ? 0.5 : 0.7 + Math.random() * 0.3,
                          }}
                        />
                      ))}
                    </div>

                    {/* Recording info */}
                    <div className="text-center">
                      <p className="text-sm font-medium text-[var(--medos-gray-700)]">
                        {isPaused ? "Recording paused" : "Listening..."}
                      </p>
                    </div>

                    {/* Confidence indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--medos-gray-50)] border border-[var(--medos-gray-100)]">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium text-[var(--medos-gray-600)]">
                        Transcription Confidence:
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-600">
                        {transcriptConfidence.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Right: Live Transcript Panel */}
                  <div className="flex flex-col rounded-lg border border-[var(--medos-gray-200)] bg-[var(--medos-gray-50)] overflow-hidden min-h-[240px] max-h-[320px]">
                    {/* Transcript header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--medos-gray-200)] bg-white">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-xs font-semibold text-[var(--medos-navy)] uppercase tracking-wide">
                          Live Transcript
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--medos-gray-400)]">
                        {transcriptVisibleLines >= TRANSCRIPT_LINES.length
                          ? TRANSCRIPT_LINES.length
                          : transcriptVisibleLines + (transcriptCharIndex > 0 ? 1 : 0)
                        } / {TRANSCRIPT_LINES.length} utterances
                      </span>
                    </div>

                    {/* Transcript body */}
                    <div
                      ref={transcriptScrollRef}
                      className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                    >
                      {TRANSCRIPT_LINES.map((line, lineIdx) => {
                        // Determine what to show for this line
                        const isFullyVisible = lineIdx < transcriptVisibleLines;
                        const isCurrentlyTyping = lineIdx === transcriptVisibleLines && transcriptCharIndex > 0;

                        if (!isFullyVisible && !isCurrentlyTyping) return null;

                        const displayText = isFullyVisible
                          ? line.text
                          : line.text.slice(0, transcriptCharIndex);

                        const showEntities = isFullyVisible;

                        return (
                          <div
                            key={lineIdx}
                            className="transcript-line-enter"
                            style={{
                              animation: "transcriptFadeIn 0.3s ease-out forwards",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              {/* Speaker label */}
                              <span
                                className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold mt-0.5 ${
                                  line.speaker === "DR"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-violet-100 text-violet-700"
                                }`}
                              >
                                {line.speaker}
                              </span>

                              {/* Text content */}
                              <p className="text-sm text-[var(--medos-gray-700)] leading-relaxed flex-1">
                                {showEntities
                                  ? renderTranscriptText(displayText, line.entities)
                                  : displayText
                                }
                                {/* Typing cursor for current line */}
                                {isCurrentlyTyping && (
                                  <span className="inline-block w-0.5 h-3.5 bg-[var(--medos-primary)] ml-0.5 animate-pulse align-text-bottom" />
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty state before transcript starts */}
                      {transcriptVisibleLines === 0 && transcriptCharIndex === 0 && (
                        <div className="flex items-center justify-center h-full min-h-[160px]">
                          <div className="text-center">
                            <Loader2 className="w-5 h-5 text-[var(--medos-gray-300)] animate-spin mx-auto mb-2" />
                            <p className="text-xs text-[var(--medos-gray-400)]">
                              Initializing speech recognition...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={togglePause}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-default"
                  >
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== STAGE 2: Processing ==================== */}
      {stage === "processing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-8">
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[var(--medos-gray-700)]">
                  Processing encounter
                </p>
                <p className="text-sm font-mono text-[var(--medos-gray-500)]">
                  {Math.round(progressPercent)}%
                </p>
              </div>
              <div className="w-full h-2 bg-[var(--medos-gray-100)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--medos-primary)] rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {processingSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {step.status === "done" ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    ) : step.status === "active" ? (
                      <Loader2 className="w-5 h-5 text-[var(--medos-primary)] animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--medos-gray-200)]" />
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      step.status === "done"
                        ? "text-emerald-700 font-medium"
                        : step.status === "active"
                        ? "text-[var(--medos-navy)] font-medium"
                        : "text-[var(--medos-gray-400)]"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Patient context */}
            <div className="mt-8 pt-6 border-t border-[var(--medos-gray-100)]">
              <div className="flex items-center gap-2 text-xs text-[var(--medos-gray-400)]">
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {selectedPatient?.name} - {visitType} - {formatTime(recordingSeconds)} recorded
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STAGE 3: Result ==================== */}
      {stage === "result" && selectedPatient && (
        <div className="space-y-6">
          {/* Confidence badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--medos-primary)]" />
              <span className="text-sm font-semibold text-[var(--medos-primary)]">
                94% Confidence
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--medos-gray-400)]">
              <span>{selectedPatient.name}</span>
              <span>&middot;</span>
              <span>{visitType}</span>
              <span>&middot;</span>
              <span>{formatTime(recordingSeconds)} recorded</span>
            </div>
          </div>

          {/* SOAP Note */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm divide-y divide-[var(--medos-gray-100)]">
            {(["subjective", "objective", "assessment", "plan"] as const).map((section) => {
              const titles: Record<string, string> = {
                subjective: "Subjective",
                objective: "Objective",
                assessment: "Assessment",
                plan: "Plan",
              };
              const colors: Record<string, string> = {
                subjective: "bg-blue-50 text-blue-700 border-blue-200",
                objective: "bg-violet-50 text-violet-700 border-violet-200",
                assessment: "bg-amber-50 text-amber-700 border-amber-200",
                plan: "bg-emerald-50 text-emerald-700 border-emerald-200",
              };

              if (!visibleSections.includes(section)) return null;

              return (
                <div
                  key={section}
                  className="p-5 animate-fadeIn"
                  style={{
                    animation: "fadeIn 0.4s ease-out forwards",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[section]}`}
                    >
                      {titles[section]}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--medos-gray-700)] leading-relaxed whitespace-pre-wrap">
                    {typedText[section] || ""}
                    {typedText[section] !== getSOAPNote(selectedPatient)[section] && (
                      <span className="inline-block w-0.5 h-4 bg-[var(--medos-primary)] ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Suggested Codes */}
          <div className="bg-white rounded-xl border border-[var(--medos-gray-200)] shadow-medos-sm p-5">
            <h3 className="text-sm font-semibold text-[var(--medos-navy)] mb-4">
              Suggested Codes
            </h3>
            <div className="space-y-3">
              {/* ICD-10 */}
              <div>
                <p className="text-xs font-medium text-[var(--medos-gray-500)] mb-2">ICD-10</p>
                <div className="flex flex-wrap gap-2">
                  {getCodeSuggestions(selectedPatient)
                    .filter((c) => c.type === "ICD-10")
                    .map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--medos-gray-50)] border border-[var(--medos-gray-200)] text-xs"
                      >
                        <span className="font-mono font-bold text-[var(--medos-navy)]">
                          {c.code}
                        </span>
                        <span className="text-[var(--medos-gray-600)]">{c.description}</span>
                        <span className="ml-1 text-emerald-600 font-medium">{c.confidence}%</span>
                      </div>
                    ))}
                </div>
              </div>
              {/* CPT */}
              <div>
                <p className="text-xs font-medium text-[var(--medos-gray-500)] mb-2">CPT</p>
                <div className="flex flex-wrap gap-2">
                  {getCodeSuggestions(selectedPatient)
                    .filter((c) => c.type === "CPT")
                    .map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--medos-primary-50)] border border-[var(--medos-primary-light)] text-xs"
                      >
                        <span className="font-mono font-bold text-[var(--medos-primary)]">
                          {c.code}
                        </span>
                        <span className="text-[var(--medos-gray-600)]">{c.description}</span>
                        <span className="ml-1 text-emerald-600 font-medium">{c.confidence}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--medos-primary)] text-white text-sm font-semibold hover:bg-[var(--medos-primary-hover)] transition-default">
              <Check className="w-4 h-4" />
              Sign & Close
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default">
              <FileText className="w-4 h-4" />
              Edit Note
            </button>
            <button
              onClick={() => {
                setStage("setup");
                setIsRecording(false);
                setIsPaused(false);
                setRecordingSeconds(0);
                setVisibleSections([]);
                setTypedText({});
                setTranscriptVisibleLines(0);
                setTranscriptCharIndex(0);
                setTranscriptConfidence(98.2);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--medos-gray-300)] bg-white text-sm font-medium text-[var(--medos-gray-700)] hover:bg-[var(--medos-gray-50)] transition-default"
            >
              <Sparkles className="w-4 h-4" />
              Regenerate
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-[var(--medos-gray-400)] py-2">
            Generated by MedOS AI — Review required before signing
          </p>
        </div>
      )}

      {/* ==================== CSS Keyframes ==================== */}
      <style jsx>{`
        @keyframes waveform {
          0% {
            height: 8px;
          }
          100% {
            height: 48px;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes transcriptFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
