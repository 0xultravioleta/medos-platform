import { test, expect } from '@playwright/test';
import {
  slowType,
  pauseForViewer,
  scrollToElement,
  highlightElement,
  chapterMarker,
  navigateTo,
} from './helpers';

test('MedOS Full Product Demo', async ({ page }) => {
  // ============================================================
  // ACT 1: LOGIN & FIRST IMPRESSION
  // ============================================================
  chapterMarker('ACT 1', 'Login & First Impression');

  await page.goto('/');
  await pauseForViewer(page, 2500, 'Landing page — appreciate the design');

  // Highlight the feature list on the left panel
  const featuresPanel = page.locator('text=AI-Powered Clinical Notes').first();
  if (await featuresPanel.isVisible()) {
    await highlightElement(page, 'text=AI-Powered Clinical Notes');
  }

  // Fill login credentials — slow typing for visual effect
  const emailInput = page.locator('#email');
  await emailInput.click();
  await emailInput.pressSequentially('justin@medos.ai', { delay: 70 });
  await pauseForViewer(page, 500);

  const passwordInput = page.locator('#password');
  await passwordInput.click();
  await passwordInput.pressSequentially('demo123', { delay: 70 });
  await pauseForViewer(page, 500);

  // Sign in
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await pauseForViewer(page, 2500, 'Dashboard loaded — first impression');

  // ============================================================
  // ACT 2: DASHBOARD EXPLORATION
  // ============================================================
  chapterMarker('ACT 2', 'Dashboard Exploration');

  // Greeting
  await highlightElement(page, 'h1', 1500);

  // KPI Card 1: Patients Today
  const patientsCard = page.getByText('Patients Today').first();
  await patientsCard.click();
  await pauseForViewer(page, 2000, 'Patients Today — drill-down expanded');

  // KPI Card 2: Pending Claims
  const claimsCard = page.getByText('Pending Claims').first();
  await claimsCard.click();
  await pauseForViewer(page, 2000, 'Pending Claims — payer breakdown');

  // KPI Card 3: AI Notes Today
  const aiNotesCard = page.getByText('AI Notes Today').first();
  await aiNotesCard.click();
  await pauseForViewer(page, 2000, 'AI Notes Today — confidence & time saved');

  // Scroll to AI Forecast
  await scrollToElement(page, 'text=Projected Monthly Revenue');
  await pauseForViewer(page, 2000, 'AI Forecast — revenue predictions');

  // Scroll to Today's Schedule
  await scrollToElement(page, "text=Today's Schedule");
  await pauseForViewer(page, 2000, "Today's Schedule — patient list");

  // Scroll to Revenue Overview
  await scrollToElement(page, 'text=Revenue this month');
  await pauseForViewer(page, 2000, 'Revenue Overview');

  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pauseForViewer(page, 1000);

  // ============================================================
  // ACT 3: PATIENT DEEP DIVE — ROBERT CHEN
  // ============================================================
  chapterMarker('ACT 3', 'Patient Deep Dive — Robert Chen');

  // Click Robert Chen from the schedule
  const robertLink = page.getByRole('link', { name: /Robert Chen/i }).first();
  await robertLink.click();
  await page.waitForURL('**/patients/**', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Patient detail loaded');

  // Highlight patient name
  await highlightElement(page, 'h1', 1500);

  // Scroll to Conditions
  const conditionsSection = page.getByText('Conditions').first();
  if (await conditionsSection.isVisible()) {
    await scrollToElement(page, 'text=Conditions');
    await pauseForViewer(page, 1500, 'Conditions badges');
  }

  // Scroll to Clinical Risk Scorecard
  await scrollToElement(page, 'text=Clinical Risk Scorecard');
  await highlightElement(page, 'text=Clinical Risk Scorecard', 2000);
  await pauseForViewer(page, 2500, 'Risk Scorecard — gauge, factors, alerts');

  // Look for AI Clinical Alerts
  const urgentAlert = page.getByText('URGENT').first();
  if (await urgentAlert.isVisible()) {
    await highlightElement(page, 'text=URGENT', 1500);
    await pauseForViewer(page, 1500, 'URGENT alert visible');
  }

  // Scroll to Clinical Timeline
  await scrollToElement(page, 'text=Clinical Timeline');
  await pauseForViewer(page, 2000, 'Clinical Timeline — history of encounters');

  // Back to patients list
  const backBtn = page.getByText('Back to Patients').first();
  if (await backBtn.isVisible()) {
    await backBtn.click();
  } else {
    await page.getByRole('link', { name: /Patients/i }).first().click();
  }
  await pauseForViewer(page, 1500, 'Patients list');

  // ============================================================
  // ACT 4: AI SCRIBE — THE STAR FEATURE
  // ============================================================
  chapterMarker('ACT 4', 'AI Scribe — The Star Feature');

  // Navigate to AI Notes
  await page.getByRole('link', { name: /AI Notes/i }).first().click();
  await page.waitForURL('**/ai-notes', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'AI Notes list — notes with confidence scores');

  // Highlight stats
  await highlightElement(page, 'text=Notes this month', 1500);

  // Click Start AI Scribe
  const startScribeLink = page.getByRole('link', { name: /Start AI Scribe/i });
  await startScribeLink.click();
  await page.waitForURL('**/ai-notes/new', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'AI Scribe — setup page');

  // Select patient from dropdown
  const patientSelect = page.locator('select').first();
  await patientSelect.waitFor({ state: 'visible', timeout: 5_000 });
  await patientSelect.selectOption({ index: 1 });
  await pauseForViewer(page, 1000, 'Patient selected');

  // Click the recording button
  const recordArea = page.locator('text=Start Recording').locator('..');
  const recordButton = recordArea.locator('button').first();
  const startBtn = page.locator('button:has(svg)').filter({
    has: page.locator('svg.w-10'),
  }).first();

  const btnToClick = await startBtn.isVisible().catch(() => false)
    ? startBtn
    : recordButton;

  await btnToClick.click();
  await pauseForViewer(page, 1000, 'Recording started');

  // Wait for transcript to populate
  await pauseForViewer(page, 18000, 'Live transcript streaming — DR/PT dialog');

  // Look for entity badges
  const medBadge = page.getByText('MEDICATION').first();
  if (await medBadge.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=MEDICATION', 1500);
  }

  // Stop recording
  const stopRecording = page.getByText('Stop Recording').first();
  if (await stopRecording.isVisible().catch(() => false)) {
    await stopRecording.click({ force: true });
  } else {
    const stopFallback = page.locator('button').filter({ hasText: /stop/i }).first();
    if (await stopFallback.isVisible().catch(() => false)) {
      await stopFallback.click();
    }
  }

  await pauseForViewer(page, 1000, 'Recording stopped — processing');
  await pauseForViewer(page, 8000, 'Processing pipeline — 3 stages');

  // Look for SOAP note result
  const soapResult = page.getByText('Subjective').first();
  if (await soapResult.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Subjective', 1500);
    await pauseForViewer(page, 3000, 'SOAP Note generated');
  }

  // Look for ICD-10/CPT codes
  const icdCode = page.getByText('ICD-10').first();
  if (await icdCode.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=ICD-10');
    await highlightElement(page, 'text=ICD-10', 1500);
    await pauseForViewer(page, 2000, 'AI coding suggestions — ICD-10 & CPT');
  }

  // ============================================================
  // ACT 5: CLAIMS INTELLIGENCE
  // ============================================================
  chapterMarker('ACT 5', 'Claims Intelligence');

  await page.getByRole('link', { name: /Claims/i }).first().click();
  await page.waitForURL('**/claims', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Claims page loaded — KPIs visible');

  // Highlight Revenue Intelligence
  const recoverableRevenue = page.getByText('Recoverable Revenue').first();
  if (await recoverableRevenue.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Recoverable Revenue');
    await highlightElement(page, 'text=Recoverable Revenue', 1500);
    await pauseForViewer(page, 1500);
  }

  // Expand AI Denial Prevention Insights
  const denialInsights = page.getByText('AI Denial Prevention Insights').first();
  if (await denialInsights.isVisible()) {
    await denialInsights.click();
    await pauseForViewer(page, 2500, 'Denial Prevention — AI Fix badges');
  }

  // Scroll to claims table
  const claimId = page.locator('text=CLM-').first();
  if (await claimId.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=CLM-');
    await pauseForViewer(page, 1500, 'Claims table — AI confidence per claim');
  }

  // Search for Aetna
  const searchInput = page.getByPlaceholder(/Search/i).first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await searchInput.pressSequentially('Aetna', { delay: 100 });
    await pauseForViewer(page, 2000, 'Filtered by Aetna — live search');
    await searchInput.clear();
    await pauseForViewer(page, 1000, 'Search cleared');
  }

  // ============================================================
  // ACT 6: PRIOR AUTH & DENIAL MANAGEMENT
  // ============================================================
  chapterMarker('ACT 6', 'Prior Authorization & Denial Management');

  // --- Prior Auth --- (navigate via claims page links)
  // Look for "Prior Auth" link on claims page
  const priorAuthLink = page.getByRole('link', { name: /Prior Auth/i }).first();
  if (await priorAuthLink.isVisible().catch(() => false)) {
    await priorAuthLink.click();
  } else {
    // Fallback: direct navigation preserving session
    await page.goto('/claims/prior-auth');
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'Prior Authorization Tracking — status overview');

  // Highlight PA stats
  const paApproved = page.getByText('Approved').first();
  if (await paApproved.isVisible()) {
    await highlightElement(page, 'text=Approved', 1500);
  }

  // Scroll to PA list
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await pauseForViewer(page, 1500, 'PA requests list with payer decisions');

  // Click on a PA to expand detail
  const paRow = page.locator('text=PA-').first();
  if (await paRow.isVisible().catch(() => false)) {
    await paRow.click();
    await pauseForViewer(page, 2500, 'PA detail — timeline, justification, payer response');
  }

  // Scroll to see AI justification
  const justification = page.getByText('Clinical Justification').first();
  if (await justification.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Clinical Justification');
    await highlightElement(page, 'text=Clinical Justification', 1500);
    await pauseForViewer(page, 2000, 'AI-generated clinical justification');
  }

  // --- Denial Management ---
  const denialsLink = page.getByRole('link', { name: /Denials/i }).first();
  if (await denialsLink.isVisible().catch(() => false)) {
    await denialsLink.click();
  } else {
    await page.goto('/claims/denials');
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'Denial Management Dashboard');

  // Highlight denial stats
  const denialRate = page.getByText('Denial Rate').first();
  if (await denialRate.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Denial Rate', 1500);
  }

  // Scroll to see CARC code distribution
  const carcSection = page.getByText('CARC').first();
  if (await carcSection.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=CARC');
    await pauseForViewer(page, 2000, 'CARC code distribution — denial reason analysis');
  }

  // Scroll down on denials page to see denial list
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'Denial list with CARC codes and appeal status');

  // Look for appeal letter
  const appealLetter = page.getByText('Appeal Letter').first();
  if (await appealLetter.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Appeal Letter');
    await highlightElement(page, 'text=Appeal Letter', 1500);
    await pauseForViewer(page, 2500, 'AI-drafted appeal letter with evidence');
  }

  // --- Claims Analytics ---
  const analyticsClaimsLink = page.getByRole('link', { name: /Analytics/i }).first();
  if (await analyticsClaimsLink.isVisible().catch(() => false)) {
    await analyticsClaimsLink.click();
  } else {
    await page.goto('/claims/analytics');
  }
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'Claims Analytics — KPI gauges and financial summary');

  // Scroll through analytics
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'Financial summary and pipeline status');

  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'AR aging and top denial reasons');

  // ============================================================
  // ACT 7: APPROVALS & PILOT METRICS
  // ============================================================
  chapterMarker('ACT 7', 'Approvals & Pilot Metrics');

  // --- Approvals ---
  await page.getByRole('link', { name: /Approvals/i }).first().click();
  await page.waitForURL('**/approvals', { timeout: 10_000 });
  await pauseForViewer(page, 2500, 'Approvals queue — AI tasks awaiting human review');

  // Highlight a pending approval
  const pendingBadge = page.getByText('pending_review').first();
  if (await pendingBadge.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=pending_review', 1500);
    await pauseForViewer(page, 1500, 'Pending review — human-in-the-loop');
  }

  // Scroll to see approval detail
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'Approval tasks with agent type and confidence');

  // --- Pilot Metrics ---
  await page.getByRole('link', { name: /Pilot/i }).first().click();
  await page.waitForURL('**/pilot', { timeout: 10_000 });
  await pauseForViewer(page, 2500, 'Pilot Metrics Dashboard — KPIs for Dr. Di Reze');

  // Highlight time saved
  const timeSaved = page.getByText('Time Saved').first();
  if (await timeSaved.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Time Saved', 2000);
    await pauseForViewer(page, 2000, 'Time saved per provider — the money metric');
  }

  // Scroll to revenue impact
  const revenueImpact = page.getByText('Revenue Impact').first();
  if (await revenueImpact.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Revenue Impact');
    await pauseForViewer(page, 2000, 'Revenue impact — clean claim rate, denial rate, days in AR');
  }

  // Scroll to AI performance
  const aiPerformance = page.getByText('AI Performance').first();
  if (await aiPerformance.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=AI Performance');
    await pauseForViewer(page, 2000, 'AI performance — coding accuracy, notes generated');
  }

  // Scroll to benchmark targets
  const benchmarks = page.getByText('Benchmark').first();
  if (await benchmarks.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=Benchmark');
    await highlightElement(page, 'text=Benchmark', 1500);
    await pauseForViewer(page, 2000, 'Benchmark targets — MedOS vs industry average');
  }

  // ============================================================
  // ACT 8: DOCUMENTATION CENTER
  // ============================================================
  chapterMarker('ACT 8', 'Documentation Center');

  await page.getByRole('link', { name: /Docs/i }).first().click();
  await page.waitForURL('**/docs', { timeout: 10_000 });
  await pauseForViewer(page, 2500, 'Docs overview — system architecture');

  // Scroll to see architecture diagram
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'Architecture diagram — full system overview');

  // Visit API docs
  await page.goto('/docs/api');
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'API Reference — Swagger-like endpoint cards');

  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'API endpoints with methods, paths, descriptions');

  // Visit Agent workflows
  await page.goto('/docs/agents');
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'Agent Workflows — LangGraph state diagrams');

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'Agent pipeline diagrams and confidence routing');

  // Visit MCP docs
  await page.goto('/docs/mcp');
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'MCP Protocol — 36 tools reference');

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'MCP tool catalog — FHIR, Scribe, Billing, Scheduling');

  // Visit Security docs
  await page.goto('/docs/security');
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'Security Pipeline — HIPAA compliance');

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'PHI access matrix and safety pipeline');

  // ============================================================
  // ACT 9: SETTINGS & PRACTICE CONFIGURATION
  // ============================================================
  chapterMarker('ACT 9', 'Settings & Practice Configuration');

  // --- Onboarding Wizard ---
  await page.goto('/settings/onboarding');
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'Onboarding Wizard — multi-step practice setup');

  // Scroll to see wizard steps
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await pauseForViewer(page, 2000, 'Step-by-step onboarding flow');

  // --- Practice Configuration ---
  await page.goto('/settings/practice');
  await page.waitForLoadState('networkidle');
  await pauseForViewer(page, 2500, 'Practice Configuration — providers, locations, fees');

  // Click through tabs if present
  const locationsTab = page.getByText('Locations').first();
  if (await locationsTab.isVisible().catch(() => false)) {
    await locationsTab.click();
    await pauseForViewer(page, 1500, 'Locations tab — practice locations');
  }

  const feeScheduleTab = page.getByText('Fee Schedule').first();
  if (await feeScheduleTab.isVisible().catch(() => false)) {
    await feeScheduleTab.click();
    await pauseForViewer(page, 1500, 'Fee Schedules tab — CPT codes and rates');
  }

  const payerTab = page.getByText('Payer').first();
  if (await payerTab.isVisible().catch(() => false)) {
    await payerTab.click();
    await pauseForViewer(page, 1500, 'Payer Contracts tab — payer agreements');
  }

  // --- Regular Settings ---
  await page.getByRole('link', { name: /Settings/i }).first().click();
  await page.waitForURL('**/settings', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'Settings page — notifications and security');

  // ============================================================
  // ACT 10: ANALYTICS & GRAND FINALE
  // ============================================================
  chapterMarker('ACT 10', 'Analytics & Grand Finale');

  // Analytics
  await page.getByRole('link', { name: /Analytics/i }).first().click();
  await page.waitForURL('**/analytics', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Analytics — charts, KPIs, tables');

  await scrollToElement(page, 'text=Monthly Revenue');
  await pauseForViewer(page, 1500, 'Revenue chart');

  await scrollToElement(page, 'text=Top Procedures');
  await pauseForViewer(page, 1500, 'Top procedures table');

  // Appointments
  await page.getByRole('link', { name: /Appointments/i }).first().click();
  await page.waitForURL('**/appointments', { timeout: 10_000 });
  await pauseForViewer(page, 2000, "Appointments — today's schedule");

  // Final: back to dashboard
  await page.getByRole('link', { name: /Dashboard/i }).first().click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'Back to dashboard — full circle');

  // Sign out
  const desktopSidebar = page.locator('aside').last();
  const signOutBtn = desktopSidebar.getByText('Sign out');
  await signOutBtn.scrollIntoViewIfNeeded();
  await signOutBtn.click();
  await page.waitForURL('**/', { timeout: 10_000 });
  await pauseForViewer(page, 2500, 'Signed out — MedOS Full Demo Complete!');

  chapterMarker('DONE', 'MedOS Full Product Demo Complete — 10 Acts, 21+ Pages');
});
