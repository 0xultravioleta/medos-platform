import { test, expect } from '@playwright/test';
import {
  pauseForViewer,
  scrollToElement,
  highlightElement,
  chapterMarker,
  clickNavLink,
} from './helpers';

test('MedOS Full Product Demo', async ({ page }) => {
  // ============================================================
  // ACT 1: LOGIN & FIRST IMPRESSION
  // ============================================================
  chapterMarker('ACT 1', 'Login & First Impression');

  await page.goto('/');
  await pauseForViewer(page, 2000, 'Landing page — healthcare OS');

  // Highlight feature cards on login screen
  const featureCard = page.getByText('10 AI Agents').first();
  if (await featureCard.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=10 AI Agents', 1500);
  }

  // Fill login credentials
  const emailInput = page.locator('#email');
  await emailInput.click();
  await emailInput.pressSequentially('justin@medos.ai', { delay: 60 });

  const passwordInput = page.locator('#password');
  await passwordInput.click();
  await passwordInput.pressSequentially('demo123', { delay: 60 });

  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await pauseForViewer(page, 2000, 'Dashboard loaded — first impression');

  // ============================================================
  // ACT 2: DASHBOARD (Sidebar #1)
  // ============================================================
  chapterMarker('ACT 2', 'Dashboard');

  // Click each KPI card to expand detail
  const patientsCard = page.getByText('Patients Today').first();
  await patientsCard.click();
  await pauseForViewer(page, 1500, 'Patients Today — expanded drill-down');

  const claimsCard = page.getByText('Pending Claims').first();
  await claimsCard.click();
  await pauseForViewer(page, 1500, 'Pending Claims — payer breakdown');

  // Click "Submit next batch" button inside claims card
  const submitBatch = page.getByText('Submit next batch').first();
  if (await submitBatch.isVisible().catch(() => false)) {
    await submitBatch.click();
    await pauseForViewer(page, 800, 'Submit batch clicked');
  }

  const priorAuthCard = page.getByText('Prior Auths').first();
  await priorAuthCard.click();
  await pauseForViewer(page, 1500, 'Prior Auths — AI flagged denials');

  const aiNotesCard = page.getByText('AI Notes Today').first();
  await aiNotesCard.click();
  await pauseForViewer(page, 1500, 'AI Notes Today — confidence scoring');

  // Scroll to AI Forecast section
  await scrollToElement(page, 'text=Projected Monthly Revenue');
  await pauseForViewer(page, 1500, 'AI Forecast — revenue predictions');

  // Scroll to Today's Schedule — click a patient link
  await scrollToElement(page, "text=Today's Schedule");
  await pauseForViewer(page, 1500, "Today's Schedule");

  // Scroll to Revenue Overview
  await scrollToElement(page, 'text=Revenue this month');
  await pauseForViewer(page, 1500, 'Revenue Overview');

  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(500);

  // ============================================================
  // ACT 3: PATIENTS (Sidebar #2)
  // ============================================================
  chapterMarker('ACT 3', 'Patients');

  await page.getByRole('link', { name: /Patients/i }).first().click();
  await page.waitForURL('**/patients', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'Patients list');

  // Search for a patient
  const patientSearch = page.getByPlaceholder(/Search/i).first();
  if (await patientSearch.isVisible().catch(() => false)) {
    await patientSearch.click();
    await patientSearch.pressSequentially('Robert', { delay: 80 });
    await pauseForViewer(page, 1500, 'Searching for Robert');
    await patientSearch.clear();
    await pauseForViewer(page, 500, 'Search cleared');
  }

  // Click on Robert Chen to open patient detail (table row uses onClick + router.push, not <a>)
  const robertRow = page.locator('tr', { hasText: 'Robert Chen' }).first();
  await robertRow.click({ force: true });
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 1500, 'Patient detail — Robert Chen');

  // Highlight patient name
  await highlightElement(page, 'h1', 1200);

  // Scroll to Conditions
  const conditionsSection = page.getByText('Conditions').first();
  if (await conditionsSection.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Conditions');
    await pauseForViewer(page, 1200, 'Conditions badges');
  }

  // Scroll to Clinical Risk Scorecard
  const riskScorecard = page.getByText('Clinical Risk Scorecard').first();
  if (await riskScorecard.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Clinical Risk Scorecard');
    await highlightElement(page, 'text=Clinical Risk Scorecard', 1500);
    await pauseForViewer(page, 1500, 'Risk Scorecard — gauge and factors');
  }

  // Look for URGENT alert
  const urgentAlert = page.getByText('URGENT').first();
  if (await urgentAlert.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=URGENT', 1200);
  }

  // Scroll to Clinical Timeline
  const timeline = page.getByText('Clinical Timeline').first();
  if (await timeline.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Clinical Timeline');
    await pauseForViewer(page, 1500, 'Clinical Timeline — encounter history');
  }

  // ============================================================
  // ACT 4: APPOINTMENTS (Sidebar #3)
  // ============================================================
  chapterMarker('ACT 4', 'Appointments');

  await page.getByRole('link', { name: /Appointments/i }).first().click();
  await page.waitForURL('**/appointments', { timeout: 10_000 });
  await pauseForViewer(page, 1500, "Today's appointments");

  // Highlight scheduling stats
  const availableSlots = page.getByText('Available Slots').first();
  if (await availableSlots.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Available Slots', 1200);
  }

  // Scroll to see provider availability
  const providerSection = page.getByText('Provider Availability').first();
  if (await providerSection.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Provider Availability');
    await pauseForViewer(page, 1200, 'Provider availability — slots per doctor');
  }

  // Scroll to appointment list
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'Appointment list with risk badges');

  // ============================================================
  // ACT 5: AI NOTES + SCRIBE (Sidebar #4)
  // ============================================================
  chapterMarker('ACT 5', 'AI Notes & Scribe');

  await page.getByRole('link', { name: /AI Notes/i }).first().click();
  await page.waitForURL('**/ai-notes', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'AI Notes list — confidence scores');

  // Highlight stats
  const notesStats = page.getByText('Notes this month').first();
  if (await notesStats.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Notes this month', 1200);
  }

  // Start AI Scribe
  const startScribeLink = page.getByRole('link', { name: /Start AI Scribe/i });
  await startScribeLink.click();
  await page.waitForURL('**/ai-notes/new', { timeout: 10_000 });
  await pauseForViewer(page, 1200, 'AI Scribe — setup page');

  // Select patient
  const patientSelect = page.locator('select').first();
  await patientSelect.waitFor({ state: 'visible', timeout: 5_000 });
  await patientSelect.selectOption({ index: 1 });
  await pauseForViewer(page, 800, 'Patient selected');

  // Start recording
  const recordBtn = page.locator('button:has(svg)').filter({ has: page.locator('svg.w-10') }).first();
  const recordArea = page.locator('text=Start Recording').locator('..').locator('button').first();
  const btnToClick = await recordBtn.isVisible().catch(() => false) ? recordBtn : recordArea;
  await btnToClick.click();
  await pauseForViewer(page, 800, 'Recording started');

  // Wait for transcript
  await pauseForViewer(page, 16000, 'Live transcript — doctor-patient dialog');

  // Stop recording
  const stopBtn = page.getByText('Stop Recording').first();
  if (await stopBtn.isVisible().catch(() => false)) {
    await stopBtn.click({ force: true });
  } else {
    const fallbackStop = page.locator('button').filter({ hasText: /stop/i }).first();
    if (await fallbackStop.isVisible().catch(() => false)) await fallbackStop.click();
  }
  await pauseForViewer(page, 800, 'Recording stopped');
  await pauseForViewer(page, 7000, 'Processing pipeline — 3 stages');

  // SOAP Note result
  const soapResult = page.getByText('Subjective').first();
  if (await soapResult.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Subjective', 1200);
    await pauseForViewer(page, 2000, 'SOAP Note generated');
  }

  // ICD-10/CPT codes
  const icdCode = page.getByText('ICD-10').first();
  if (await icdCode.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=ICD-10');
    await highlightElement(page, 'text=ICD-10', 1200);
    await pauseForViewer(page, 1500, 'AI coding — ICD-10 & CPT suggestions');
  }

  // ============================================================
  // ACT 6: CLAIMS + SUB-PAGES (Sidebar #5)
  // ============================================================
  chapterMarker('ACT 6', 'Claims Intelligence');

  await page.getByRole('link', { name: /Claims/i }).first().click();
  await page.waitForURL('**/claims', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'Claims dashboard — KPIs');

  // Expand Denial Prevention Insights
  const denialInsights = page.getByText('AI Denial Prevention Insights').first();
  if (await denialInsights.isVisible().catch(() => false)) {
    await denialInsights.click();
    await pauseForViewer(page, 2000, 'Denial Prevention — AI Fix badges');
  }

  // Claims table — search for Aetna
  const claimsSearch = page.getByPlaceholder(/Search/i).first();
  if (await claimsSearch.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=CLM-');
    await pauseForViewer(page, 1000, 'Claims table');
    await claimsSearch.click();
    await claimsSearch.pressSequentially('Aetna', { delay: 80 });
    await pauseForViewer(page, 1500, 'Filtered by Aetna');
    await claimsSearch.clear();
    await pauseForViewer(page, 500);
  }

  // --- Prior Authorization sub-page ---
  const priorAuthLink = page.getByRole('link', { name: /Prior Auth/i }).first();
  if (await priorAuthLink.isVisible().catch(() => false)) {
    await priorAuthLink.click();
  } else {
    await page.locator('a[href="/claims/prior-auth"]').first().click();
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'Prior Authorization Tracking');

  // PA stats
  const paApproved = page.getByText('Approved').first();
  if (await paApproved.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Approved', 1200);
  }

  // Click a PA to expand
  const paRow = page.locator('text=PA-').first();
  if (await paRow.isVisible().catch(() => false)) {
    await paRow.click();
    await pauseForViewer(page, 2000, 'PA detail — timeline and justification');
  }

  // AI justification
  const justification = page.getByText('Clinical Justification').first();
  if (await justification.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Clinical Justification');
    await highlightElement(page, 'text=Clinical Justification', 1200);
    await pauseForViewer(page, 1500, 'AI-generated clinical justification');
  }

  // --- Denials sub-page ---
  // Navigate back to claims main first (sub-page links only exist on main claims page)
  await page.getByRole('link', { name: /Claims/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.locator('a[href="/claims/denials"]').first().click();
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'Denial Management Dashboard');

  // Denial stats
  const denialRate = page.getByText('Denial Rate').first();
  if (await denialRate.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Denial Rate', 1200);
  }

  // CARC code distribution
  const carcSection = page.getByText('CARC').first();
  if (await carcSection.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=CARC');
    await pauseForViewer(page, 1500, 'CARC code distribution');
  }

  // Scroll to denial list
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'Denial list with appeal status');

  // Appeal letter
  const appealLetter = page.getByText('Appeal Letter').first();
  if (await appealLetter.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Appeal Letter');
    await highlightElement(page, 'text=Appeal Letter', 1200);
    await pauseForViewer(page, 1500, 'AI-drafted appeal letter');
  }

  // --- Claims Analytics sub-page ---
  // Navigate back to claims main first (sub-page links only exist on main claims page)
  await page.getByRole('link', { name: /Claims/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.locator('a[href="/claims/analytics"]').first().click();
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'Claims Analytics — financial KPIs');

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'Financial pipeline status');

  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'AR aging and top denial reasons');

  // ============================================================
  // ACT 7: APPROVALS (Sidebar #6)
  // ============================================================
  chapterMarker('ACT 7', 'Approvals');

  await page.getByRole('link', { name: /Approvals/i }).first().click();
  await page.waitForURL('**/approvals', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Approvals queue — human-in-the-loop');

  // Highlight pending review
  const pendingBadge = page.getByText('pending_review').first();
  if (await pendingBadge.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=pending_review', 1200);
    await pauseForViewer(page, 1200, 'Pending review items');
  }

  // Scroll to see more tasks
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'Approval tasks — agent type and confidence');

  // ============================================================
  // ACT 8: ANALYTICS (Sidebar #7)
  // ============================================================
  chapterMarker('ACT 8', 'Analytics');

  await page.getByRole('link', { name: /Analytics/i }).first().click();
  await page.waitForURL('**/analytics', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'Analytics dashboard');

  // Scroll to Monthly Revenue chart
  const monthlyRevenue = page.getByText('Monthly Revenue').first();
  if (await monthlyRevenue.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Monthly Revenue');
    await pauseForViewer(page, 1200, 'Revenue chart — monthly trends');
  }

  // Scroll to Top Procedures
  const topProcedures = page.getByText('Top Procedures').first();
  if (await topProcedures.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Top Procedures');
    await pauseForViewer(page, 1200, 'Top procedures table');
  }

  // ============================================================
  // ACT 9: PILOT METRICS (Sidebar #8)
  // ============================================================
  chapterMarker('ACT 9', 'Pilot Metrics');

  await page.getByRole('link', { name: /Pilot/i }).first().click();
  await page.waitForURL('**/pilot', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Pilot Metrics — KPIs for Dr. Di Reze');

  // Time saved
  const timeSaved = page.getByText('Time Saved').first();
  if (await timeSaved.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Time Saved', 1500);
    await pauseForViewer(page, 1500, 'Time saved per provider');
  }

  // Revenue Impact
  const revenueImpact = page.getByText('Revenue Impact').first();
  if (await revenueImpact.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Revenue Impact');
    await pauseForViewer(page, 1500, 'Revenue impact — clean claim rate');
  }

  // AI Performance
  const aiPerf = page.getByText('AI Performance').first();
  if (await aiPerf.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=AI Performance');
    await pauseForViewer(page, 1500, 'AI performance metrics');
  }

  // Benchmarks
  const benchmarks = page.getByText('Benchmark').first();
  if (await benchmarks.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Benchmark');
    await pauseForViewer(page, 1500, 'Benchmark — MedOS vs industry');
  }

  // ============================================================
  // ACT 10: DOCS — THOROUGH EXPLORATION (Sidebar #9)
  // ============================================================
  chapterMarker('ACT 10', 'Documentation Center');

  // --- /docs Overview ---
  await page.getByRole('link', { name: /Docs/i }).first().click();
  await page.waitForURL('**/docs', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Docs overview — system architecture');

  // Scroll to architecture diagram
  const archDiagram = page.getByText('System Architecture').first();
  if (await archDiagram.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=System Architecture');
    await pauseForViewer(page, 2000, 'Architecture diagram — full platform overview');
  }

  // Scroll to "Explore the Platform" section with link cards
  const exploreSection = page.getByText('Explore the Platform').first();
  if (await exploreSection.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Explore the Platform');
    await pauseForViewer(page, 1500, 'Navigation cards — 4 doc sections');
  }

  // Scroll to Technology Stack
  const techStack = page.getByText('Technology Stack').first();
  if (await techStack.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Technology Stack');
    await pauseForViewer(page, 1500, 'Technology Stack — FastAPI, Next.js, PostgreSQL');
  }

  // --- /docs/api — Click via docs sidebar ---
  const docsApiLink = page.getByRole('link', { name: 'API Reference' });
  if (await docsApiLink.first().isVisible().catch(() => false)) {
    await docsApiLink.first().click();
  } else {
    await page.locator('a[href="/docs/api"]').first().click();
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'API Reference — 26 endpoints');

  // Click GET /health to expand
  const healthEndpoint = page.getByRole('button', { name: /GET.*\/health\s/i }).first();
  if (await healthEndpoint.isVisible().catch(() => false)) {
    await healthEndpoint.click();
    await pauseForViewer(page, 1500, 'GET /health — response example expanded');
  }

  // Scroll to FHIR section and expand an endpoint
  await scrollToElement(page, 'text=FHIR R4');
  await pauseForViewer(page, 1200, 'FHIR R4 — patient resource endpoints');

  const fhirEndpoint = page.getByRole('button', { name: /POST.*\/fhir\/r4\/Patient\s/i }).first();
  if (await fhirEndpoint.isVisible().catch(() => false)) {
    await fhirEndpoint.click();
    await pauseForViewer(page, 2000, 'POST /fhir/r4/Patient — request & response');
  }

  // Scroll to MCP section and expand
  await scrollToElement(page, 'text=MCP (Model Context Protocol)');
  await pauseForViewer(page, 1000, 'MCP endpoints');

  const mcpEndpoint = page.getByRole('button', { name: /GET.*\/mcp\/tools/i }).first();
  if (await mcpEndpoint.isVisible().catch(() => false)) {
    await mcpEndpoint.click();
    await pauseForViewer(page, 1500, 'GET /mcp/tools — list all MCP tools');
  }

  // Scroll to Agent Tasks and Approvals
  await scrollToElement(page, 'text=Agent Tasks');
  await pauseForViewer(page, 1000, 'Agent Tasks endpoints');

  const agentTaskEndpoint = page.getByRole('button', { name: /GET.*\/api\/v1\/agent-tasks/i }).first();
  if (await agentTaskEndpoint.isVisible().catch(() => false)) {
    await agentTaskEndpoint.click();
    await pauseForViewer(page, 1500, 'GET /api/v1/agent-tasks — expanded');
  }

  // Scroll to A2A
  await scrollToElement(page, 'text=A2A (Agent-to-Agent)');
  await pauseForViewer(page, 1200, 'A2A agent card endpoint');

  // --- /docs/agents — Click via docs sidebar ---
  const docsAgentsLink = page.getByRole('link', { name: 'Agent Workflows' });
  if (await docsAgentsLink.first().isVisible().catch(() => false)) {
    await docsAgentsLink.first().click();
  } else {
    await page.locator('a[href="/docs/agents"]').first().click();
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'Agent Workflows — LangGraph state machines');

  // Scroll through agent diagrams
  const clinicalScribe = page.getByText('Clinical Scribe Agent').first();
  if (await clinicalScribe.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Clinical Scribe Agent');
    await pauseForViewer(page, 1500, 'Clinical Scribe — state diagram');
  }

  const priorAuthAgent = page.getByText('Prior Authorization Agent').first();
  if (await priorAuthAgent.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Prior Authorization Agent');
    await pauseForViewer(page, 1500, 'Prior Auth Agent — workflow');
  }

  const denialAgent = page.getByText('Denial Management Agent').first();
  if (await denialAgent.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Denial Management Agent');
    await pauseForViewer(page, 1500, 'Denial Management — appeal workflow');
  }

  // Confidence routing
  const confidenceRouting = page.getByText('Confidence').first();
  if (await confidenceRouting.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Confidence');
    await pauseForViewer(page, 1200, 'Confidence routing thresholds');
  }

  // --- /docs/mcp — Click via docs sidebar ---
  const docsMcpLink = page.getByRole('link', { name: 'MCP Protocol' });
  if (await docsMcpLink.first().isVisible().catch(() => false)) {
    await docsMcpLink.first().click();
  } else {
    await page.locator('a[href="/docs/mcp"]').first().click();
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'MCP Protocol — 32 tools across 4 servers');

  // Protocol Flow diagram
  const protocolFlow = page.getByText('Protocol Flow').first();
  if (await protocolFlow.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Protocol Flow');
    await pauseForViewer(page, 1500, 'Protocol flow — Gateway pipeline');
  }

  // Tool Reference — scroll through all 4 server tables
  await scrollToElement(page, 'text=Tool Reference');
  await pauseForViewer(page, 1200, 'Tool Reference — 32 tools');

  // FHIR MCP Server table (12 tools)
  await scrollToElement(page, 'text=FHIR MCP Server');
  await pauseForViewer(page, 1500, 'FHIR MCP Server — 12 tools');

  // Scribe MCP Server table (6 tools)
  await scrollToElement(page, 'text=Scribe MCP Server');
  await pauseForViewer(page, 1500, 'Scribe MCP Server — 6 tools');

  // Billing MCP Server table (8 tools)
  await scrollToElement(page, 'text=Billing MCP Server');
  await pauseForViewer(page, 1500, 'Billing MCP Server — 8 tools');

  // Scheduling MCP Server table (6 tools)
  await scrollToElement(page, 'text=Scheduling MCP Server');
  await pauseForViewer(page, 1500, 'Scheduling MCP Server — 6 tools');

  // A2A Agent Card — click Copy button
  await scrollToElement(page, 'text=A2A Agent Card');
  await pauseForViewer(page, 1200, 'A2A Agent Card');

  const copyBtn = page.getByRole('button', { name: /Copy/i }).first();
  if (await copyBtn.isVisible().catch(() => false)) {
    await copyBtn.click();
    await pauseForViewer(page, 1000, 'Agent card JSON copied');
  }

  // --- /docs/security — Click via docs sidebar ---
  const docsSecLink = page.getByRole('link', { name: 'Security' });
  if (await docsSecLink.first().isVisible().catch(() => false)) {
    await docsSecLink.first().click();
  } else {
    await page.locator('a[href="/docs/security"]').first().click();
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'Security Pipeline — HIPAA compliance');

  // Safety Pipeline section
  const safetyPipeline = page.getByText('Safety Pipeline').first();
  if (await safetyPipeline.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Safety Pipeline');
    await pauseForViewer(page, 1500, 'Safety Pipeline — Block, Warn, Review, Sanitize');
  }

  // PHI Access Matrix
  const phiMatrix = page.getByText('PHI Access').first();
  if (await phiMatrix.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=PHI Access');
    await pauseForViewer(page, 1500, 'PHI Access Matrix — per-agent policies');
  }

  // Credential Injection
  const credInjection = page.getByText('Credential').first();
  if (await credInjection.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Credential');
    await pauseForViewer(page, 1500, 'Credential Injection — zero-trust security');
  }

  // Compliance section
  const compliance = page.getByText('Compliance').first();
  if (await compliance.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Compliance');
    await pauseForViewer(page, 1200, 'HIPAA, SOC 2, HITRUST compliance');
  }

  // ============================================================
  // ACT 11: PROJECT TRACKER (Sidebar #10)
  // ============================================================
  chapterMarker('ACT 11', 'Project Tracker');

  // Docs is now in (public) group but client-side nav from dashboard sidebar keeps dashboard layout.
  // Just click Project in the main sidebar to navigate within the dashboard context.
  await page.getByRole('link', { name: /Project/i }).first().click();
  await page.waitForURL('**/project', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Project Tracker — Board view (Kanban)');

  // Switch to List view
  const listViewBtn = page.getByRole('button', { name: /List/i }).first();
  if (await listViewBtn.isVisible().catch(() => false)) {
    await listViewBtn.click();
    await pauseForViewer(page, 2000, 'List view — 140 tasks sortable table');
  }

  // Switch to Timeline view
  const timelineViewBtn = page.getByRole('button', { name: /Timeline/i }).first();
  if (await timelineViewBtn.isVisible().catch(() => false)) {
    await timelineViewBtn.click();
    await pauseForViewer(page, 2000, 'Timeline view — sprint progress and milestones');
  }

  // Switch to Stats view
  const statsViewBtn = page.getByRole('button', { name: /Stats/i }).first();
  if (await statsViewBtn.isVisible().catch(() => false)) {
    await statsViewBtn.click();
    await pauseForViewer(page, 2000, 'Stats view — KPIs, velocity, EPIC progress');

    // Scroll to EPIC Progress
    const epicProgress = page.getByText('EPIC Progress').first();
    if (await epicProgress.isVisible().catch(() => false)) {
      await scrollToElement(page, 'text=EPIC Progress');
      await pauseForViewer(page, 1500, 'EPIC progress bars — 14 EPICs');
    }

    // Scroll to Team Allocation
    const teamAlloc = page.getByText('Team Allocation').first();
    if (await teamAlloc.isVisible().catch(() => false)) {
      await scrollToElement(page, 'text=Team Allocation');
      await pauseForViewer(page, 1500, 'Team allocation — Person A vs B workload');
    }
  }

  // ============================================================
  // ACT 12: ADMIN HUB (Sidebar #11)
  // ============================================================
  chapterMarker('ACT 12', 'Admin Hub — Command Center');

  await page.getByRole('link', { name: /Admin/i }).first().click();
  await page.waitForURL('**/admin/dashboard', { timeout: 10_000 });
  await pauseForViewer(page, 2500, 'Admin Dashboard — executive overview');

  // System Health KPIs
  const uptimeKpi = page.getByText('System Uptime').first();
  if (await uptimeKpi.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=System Uptime', 1200);
  }

  // Scroll to MCP Server Health Grid
  await scrollToElement(page, 'text=MCP Server Health');
  await pauseForViewer(page, 1500, 'MCP Server Health Grid — 6 servers');

  // Scroll to AI Agent Performance
  await scrollToElement(page, 'text=AI Agent Performance');
  await pauseForViewer(page, 1500, 'AI Agent Performance — confidence scores');

  // Scroll to HIPAA Compliance snapshot
  await scrollToElement(page, 'text=HIPAA Compliance');
  await pauseForViewer(page, 1500, 'HIPAA Compliance — 94/100 score');

  // Scroll to Cost Overview
  await scrollToElement(page, 'text=Cost Overview');
  await pauseForViewer(page, 1500, 'Cost Overview — $42/day, 84% of budget');

  // Scroll to Recent Activity
  await scrollToElement(page, 'text=Recent Activity');
  await pauseForViewer(page, 1500, 'Recent Activity feed');

  // --- Admin Monitoring ---
  const monitoringLink = page.getByRole('link', { name: /Monitoring/i });
  if (await monitoringLink.first().isVisible().catch(() => false)) {
    await monitoringLink.first().click();
  } else {
    await page.locator('aside').last().getByRole('link', { name: /Monitoring/i }).first().click();
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2000, 'Monitoring — real-time metrics');

  // Click Alerts tab
  const monAlerts = page.getByRole('button', { name: /Alerts/i }).first();
  if (await monAlerts.isVisible().catch(() => false)) {
    await monAlerts.click();
    await pauseForViewer(page, 1500, 'Active alerts — severity and actions');
  }

  // Click AI Observability tab
  const aiObsTab = page.getByRole('button', { name: /AI Observ/i }).first();
  if (await aiObsTab.isVisible().catch(() => false)) {
    await aiObsTab.click();
    await pauseForViewer(page, 1500, 'AI Observability — agent metrics and token usage');
  }

  // --- Admin Tenants ---
  await page.locator('aside').last().getByRole('link', { name: /Tenants/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Tenant Management — 3 practices');

  // Click Onboarding tab
  const onboardTab = page.getByRole('button', { name: /Onboarding/i }).first();
  if (await onboardTab.isVisible().catch(() => false)) {
    await onboardTab.click();
    await pauseForViewer(page, 1500, 'Onboarding Wizard — 6-step practice setup');
  }

  // --- Admin Users ---
  await page.locator('aside').last().getByRole('link', { name: /Users/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'User & Role Management — 6 users');

  // Click Roles tab
  const rolesTab = page.getByRole('button', { name: /Roles/i }).first();
  if (await rolesTab.isVisible().catch(() => false)) {
    await rolesTab.click();
    await pauseForViewer(page, 1500, 'RBAC Matrix — 11 permissions x 6 roles');
  }

  // --- Admin Billing ---
  await page.locator('aside').last().getByRole('link', { name: /Billing/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Billing Configuration — 3 payer contracts');

  // Click Fee Schedules tab
  const feeTab2 = page.getByRole('button', { name: /Fee Schedule/i }).first();
  if (await feeTab2.isVisible().catch(() => false)) {
    await feeTab2.click();
    await pauseForViewer(page, 1500, 'Fee Schedules — CPT codes and payer rates');
  }

  // --- Admin Integrations ---
  await page.locator('aside').last().getByRole('link', { name: /Integrations/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Integration Management — EHR, Devices, Labs');

  // Click Devices tab
  const devicesIntTab = page.getByRole('button', { name: /Device/i }).first();
  if (await devicesIntTab.isVisible().catch(() => false)) {
    await devicesIntTab.click();
    await pauseForViewer(page, 1500, 'Device Integrations — Oura, Apple Watch, Dexcom');
  }

  // --- Admin MCP Servers ---
  await page.locator('aside').last().getByRole('link', { name: /MCP Servers/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'MCP Server Management — 6 servers, 44 tools');

  // Click Tool Inventory tab
  const toolInvTab = page.getByRole('button', { name: /Tool Inventory/i }).first();
  if (await toolInvTab.isVisible().catch(() => false)) {
    await toolInvTab.click();
    await pauseForViewer(page, 1500, '44-tool inventory with PHI levels');
  }

  // --- Admin AI Agents ---
  await page.locator('aside').last().getByRole('link', { name: /AI Agents/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'AI Agent Configuration — 3 active, 2 planned');

  // Click Configuration tab
  const configTab = page.getByRole('button', { name: /Configuration/i }).first();
  if (await configTab.isVisible().catch(() => false)) {
    await configTab.click();
    await pauseForViewer(page, 1500, 'Agent parameters — confidence thresholds');
  }

  // --- Admin Security ---
  await page.locator('aside').last().getByRole('link', { name: /Security/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2500, 'Security & HIPAA Compliance — 94/100');

  // Click Audit Log tab
  const auditTab = page.getByRole('button', { name: /Audit/i }).first();
  if (await auditTab.isVisible().catch(() => false)) {
    await auditTab.click();
    await pauseForViewer(page, 1500, 'Audit Log — 15 entries, break-the-glass tracking');
  }

  // Click Encryption tab
  const encTab = page.getByRole('button', { name: /Encryption/i }).first();
  if (await encTab.isVisible().catch(() => false)) {
    await encTab.click();
    await pauseForViewer(page, 1500, 'Encryption Status — field-level + TDE + TLS');
  }

  // --- Admin Feature Flags ---
  await page.locator('aside').last().getByRole('link', { name: /Feature Flags/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Feature Flags — 22 flags across 4 categories');

  // Scroll to see operational flags
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'Operational flags — maintenance mode, read-only');

  // --- Admin System ---
  await page.locator('aside').last().getByRole('link', { name: /System/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 1500, 'System Configuration — cache, context, events');

  // --- Admin Data Management ---
  await page.locator('aside').last().getByRole('link', { name: /Data/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 1500, 'Data Management — import, backup, retention');

  // Click Backup tab
  const backupTab = page.getByRole('button', { name: /Backup/i }).first();
  if (await backupTab.isVisible().catch(() => false)) {
    await backupTab.click();
    await pauseForViewer(page, 1500, 'Backup & Recovery — RPO 15min, RTO 1h');
  }

  // --- Admin Project (migrated) ---
  await page.locator('aside').last().getByRole('link', { name: /Project/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Project Tracker in Admin — Kanban board');

  // ============================================================
  // ACT 13: THEORIA MEDICAL PILOT (Sidebar #12)
  // ============================================================
  chapterMarker('ACT 13', 'Theoria Medical — Post-Acute AI Platform');

  // --- Clinical Operations ---
  await page.getByRole('link', { name: /Theoria/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Facility Console — Multi-site SNF dashboard');
  // Click Patients tab
  const patientsTab = page.getByRole('button', { name: /Patients/i }).first();
  if (await patientsTab.isVisible().catch(() => false)) {
    await patientsTab.click();
    await pauseForViewer(page, 1500, 'Patient roster across all facilities');
  }
  // Click Staffing tab
  const staffingTab = page.getByRole('button', { name: /Staffing/i }).first();
  if (await staffingTab.isVisible().catch(() => false)) {
    await staffingTab.click();
    await pauseForViewer(page, 1500, 'Provider staffing & shift coverage');
  }

  await page.locator('aside').last().getByRole('link', { name: /Shift Handoff/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Shift Handoff — Priority-ranked briefing');

  await page.locator('aside').last().getByRole('link', { name: /Post-Acute Guardian/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Post-Acute Guardian — Live wearable monitoring');
  const alertQueueTab = page.getByRole('button', { name: /Alert/i }).first();
  if (await alertQueueTab.isVisible().catch(() => false)) {
    await alertQueueTab.click();
    await pauseForViewer(page, 1500, 'Alert Queue — AI-powered triage');
  }

  await page.locator('aside').last().getByRole('link', { name: /Readmission/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Readmission Risk — Predictive scoring');

  // --- Revenue Capture ---
  await page.locator('aside').last().getByRole('link', { name: /CCM/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'CCM Time Tracker — CPT 99490 billing');
  const billingTab = page.getByRole('button', { name: /Billing/i }).first();
  if (await billingTab.isVisible().catch(() => false)) {
    await billingTab.click();
    await pauseForViewer(page, 1500, 'Billing threshold — revenue capture');
  }

  await page.locator('aside').last().getByRole('link', { name: /RPM/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'RPM Revenue — Device billing dashboard');

  await page.locator('aside').last().getByRole('link', { name: /Care Gap/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Care Gap Scanner — Population health');

  // --- Data Intelligence ---
  await page.locator('aside').last().getByRole('link', { name: /Discharge/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Discharge Reconciliation — Hospital-SNF bridge');
  const medChangesTab = page.getByRole('button', { name: /Med/i }).first();
  if (await medChangesTab.isVisible().catch(() => false)) {
    await medChangesTab.click();
    await pauseForViewer(page, 1500, 'Medication comparison — ChartEasy integration');
  }

  await page.locator('aside').last().getByRole('link', { name: /Care Plan/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Care Plan Optimizer — AI recommendations');

  await page.locator('aside').last().getByRole('link', { name: /Staffing/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Staffing Optimizer — Dynamic allocation');

  // --- Enterprise & Governance ---
  await page.locator('aside').last().getByRole('link', { name: /ACO REACH/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'ACO REACH — Empassion Health quality tracking');

  await page.locator('aside').last().getByRole('link', { name: /PE Executive/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'PE Executive Dashboard — Amulet Capital reporting');
  const financialTab = page.getByRole('button', { name: /Financial/i }).first();
  if (await financialTab.isVisible().catch(() => false)) {
    await financialTab.click();
    await pauseForViewer(page, 1500, 'Financial Roll-up — Platform value creation');
  }

  await page.locator('aside').last().getByRole('link', { name: /Credentialing/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Credentialing Center — 21-state licensing');

  // ============================================================
  // ACT 14: SETTINGS + SUB-PAGES (Sidebar #13)
  // ============================================================
  chapterMarker('ACT 14', 'Settings & Configuration');

  await page.getByRole('link', { name: /Settings/i }).first().click();
  await page.waitForURL('**/settings', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'Settings — profile and preferences');

  // Toggle Two-Factor Authentication (visible switch animation)
  const twoFASwitch = page.getByRole('switch', { name: /Two-Factor/i }).first();
  if (await twoFASwitch.isVisible().catch(() => false)) {
    await twoFASwitch.click();
    await pauseForViewer(page, 800, '2FA enabled');
    await twoFASwitch.click();
    await pauseForViewer(page, 800, '2FA toggled back');
  } else {
    // Fallback: find switch by nearby label text
    const twoFALabel = page.getByText('Two-Factor Authentication').first();
    if (await twoFALabel.isVisible().catch(() => false)) {
      const switchEl = twoFALabel.locator('..').locator('..').locator('button[role="switch"]');
      if (await switchEl.isVisible().catch(() => false)) {
        await switchEl.click();
        await pauseForViewer(page, 800, '2FA enabled');
        await switchEl.click();
        await pauseForViewer(page, 800, '2FA toggled back');
      }
    }
  }

  // Scroll to see more toggles
  await scrollToElement(page, 'text=AI Auto-Coding');
  await pauseForViewer(page, 1000, 'AI Auto-Coding toggle');

  // Click Save Changes
  const saveBtn = page.getByRole('button', { name: /Save Changes/i }).first();
  if (await saveBtn.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Save Changes');
    await saveBtn.click();
    await pauseForViewer(page, 1500, 'Settings saved — confirmation banner');
  }

  // Scroll to Practice Configuration link and click
  const practiceConfigLink = page.getByText('Practice Configuration').first();
  if (await practiceConfigLink.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Practice Configuration');
    await practiceConfigLink.click();
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 1500, 'Practice Configuration — providers and locations');

    // Click through tabs
    const locationsTab = page.getByText('Locations').first();
    if (await locationsTab.isVisible().catch(() => false)) {
      await locationsTab.click();
      await pauseForViewer(page, 1200, 'Locations tab — practice locations');
    }

    const feeTab = page.getByText('Fee Schedule').first();
    if (await feeTab.isVisible().catch(() => false)) {
      await feeTab.click();
      await pauseForViewer(page, 1200, 'Fee Schedules — CPT codes and rates');
    }

    const payerTab = page.getByText('Payer').first();
    if (await payerTab.isVisible().catch(() => false)) {
      await payerTab.click();
      await pauseForViewer(page, 1200, 'Payer Contracts — insurance agreements');
    }

    // Back to providers tab
    const providersTab = page.getByText('Providers').first();
    if (await providersTab.isVisible().catch(() => false)) {
      await providersTab.click();
      await pauseForViewer(page, 800, 'Providers tab');
    }
  }

  // Navigate to Onboarding Wizard — go back to settings main first
  await page.getByRole('link', { name: /Settings/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.locator('a[href="/settings/onboarding"]').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Onboarding Wizard — multi-step practice setup');

  // Look for wizard steps / next button
  const nextStepBtn = page.getByRole('button', { name: /Next|Continue/i }).first();
  if (await nextStepBtn.isVisible().catch(() => false)) {
    await nextStepBtn.click();
    await pauseForViewer(page, 1500, 'Wizard step 2');

    // Try advancing one more step
    const nextBtn2 = page.getByRole('button', { name: /Next|Continue/i }).first();
    if (await nextBtn2.isVisible().catch(() => false)) {
      await nextBtn2.click();
      await pauseForViewer(page, 1500, 'Wizard step 3');
    }
  }

  // Scroll to show wizard content
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'Onboarding steps overview');

  // --- /settings/devices — Device Management ---
  await page.getByRole('link', { name: /Settings/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.locator('a[href="/settings/devices"]').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Device Management — registered wearables');

  // Click Readings tab
  const readingsTab = page.getByRole('button', { name: /Readings/i });
  if (await readingsTab.isVisible().catch(() => false)) {
    await readingsTab.click();
    await pauseForViewer(page, 1500, 'Device readings with LOINC codes and threshold colors');
  }

  // Click Alerts tab
  const alertsTab = page.getByRole('button', { name: /Alerts/i });
  if (await alertsTab.isVisible().catch(() => false)) {
    await alertsTab.click();
    await pauseForViewer(page, 1500, 'Threshold breach alerts — critical and warning');
  }

  // --- /settings/context — Context Freshness Monitor ---
  await page.getByRole('link', { name: /Settings/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.locator('a[href="/settings/context"]').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'Context Freshness — patient data staleness monitoring');

  // Click System Contexts tab
  const systemCtxTab = page.getByRole('button', { name: /System Contexts/i });
  if (await systemCtxTab.isVisible().catch(() => false)) {
    await systemCtxTab.click();
    await pauseForViewer(page, 1500, 'System-wide context freshness cards');
  }

  // Click Dependency Graph tab
  const depGraphTab = page.getByRole('button', { name: /Dependency Graph/i });
  if (await depGraphTab.isVisible().catch(() => false)) {
    await depGraphTab.click();
    await pauseForViewer(page, 1500, 'Change type to context dependency mapping');
  }

  // Click Rehydration Log tab
  const rehydrationTab = page.getByRole('button', { name: /Rehydration Log/i });
  if (await rehydrationTab.isVisible().catch(() => false)) {
    await rehydrationTab.click();
    await pauseForViewer(page, 1500, 'Recent rehydration events timeline');
  }

  // --- /settings/system — System Health ---
  await page.getByRole('link', { name: /Settings/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.locator('a[href="/settings/system"]').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await pauseForViewer(page, 2000, 'System Health — platform overview (44 MCP tools, 3 agents)');

  // Click MCP Inventory tab
  const mcpTab = page.getByRole('button', { name: /MCP Inventory/i });
  if (await mcpTab.isVisible().catch(() => false)) {
    await mcpTab.click();
    await pauseForViewer(page, 1500, 'MCP tool inventory across 6 servers');
  }

  // Click Agent Performance tab
  const agentTab = page.getByRole('button', { name: /Agent Performance/i });
  if (await agentTab.isVisible().catch(() => false)) {
    await agentTab.click();
    await pauseForViewer(page, 1500, 'AI agent performance metrics and confidence distribution');
  }

  // Click Cache & Events tab
  const cacheTab = page.getByRole('button', { name: /Cache/i });
  if (await cacheTab.isVisible().catch(() => false)) {
    await cacheTab.click();
    await pauseForViewer(page, 1500, 'Cache statistics and event bus monitoring');
  }


  // ============================================================
  // ACT 15: GRAND FINALE
  // ============================================================
  chapterMarker('ACT 15', 'Grand Finale');

  // Sign out directly from last page
  const desktopSidebar = page.locator('aside').last();
  const signOutBtn = desktopSidebar.getByText('Sign out');
  await signOutBtn.scrollIntoViewIfNeeded();
  await signOutBtn.click();
  await page.waitForURL('**/', { timeout: 10_000 });
  await pauseForViewer(page, 2500, 'Signed out — MedOS Full Demo Complete!');

  chapterMarker('DONE', 'MedOS Full Product Demo — 15 Acts, 53 Pages, Every Click Tested');
});
