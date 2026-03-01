import { test, expect } from '@playwright/test';
import {
  slowType,
  pauseForViewer,
  scrollToElement,
  highlightElement,
  chapterMarker,
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
  const greeting = page.locator('h1').first();
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
  await scrollToElement(page, 'text=Today\'s Schedule');
  await pauseForViewer(page, 2000, 'Today\'s Schedule — patient list');

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

  // Try to dismiss an alert
  const dismissBtn = page.locator('[aria-label="Dismiss"]').first();
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click();
    await pauseForViewer(page, 1000, 'Alert dismissed');
  }

  // Scroll to Clinical Timeline
  await scrollToElement(page, 'text=Clinical Timeline');
  await pauseForViewer(page, 2000, 'Clinical Timeline — history of encounters');

  // Look for AI Insight badges
  const aiInsight = page.getByText('AI Insight').first();
  if (await aiInsight.isVisible().catch(() => false)) {
    await aiInsight.click();
    await pauseForViewer(page, 2000, 'AI Insight expanded');
  }

  // Scroll to AI-Generated Notes
  const soapSection = page.getByText('SOAP Note').first();
  if (await soapSection.isVisible().catch(() => false)) {
    await scrollToElement(page, 'text=SOAP Note');
    await highlightElement(page, 'text=Confidence', 1500);
    await pauseForViewer(page, 2500, 'AI-Generated SOAP Note — 92% confidence');
  }

  // Back to patients list
  const backBtn = page.getByText('Back to Patients').first();
  if (await backBtn.isVisible()) {
    await backBtn.click();
  } else {
    // Fallback: use sidebar
    await page.getByRole('link', { name: /Patients/i }).first().click();
  }
  await pauseForViewer(page, 1500, 'Patients list — 6 patients');

  // ============================================================
  // ACT 4: AI SCRIBE — THE STAR FEATURE
  // ============================================================
  chapterMarker('ACT 4', 'AI Scribe — The Star Feature');

  // Navigate to AI Notes
  await page.getByRole('link', { name: /AI Notes/i }).first().click();
  await page.waitForURL('**/ai-notes', { timeout: 10_000 });
  await pauseForViewer(page, 2000, 'AI Notes list — 5 notes with confidence scores');

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
  await patientSelect.selectOption({ index: 1 }); // Robert Chen
  await pauseForViewer(page, 1000, 'Patient selected: Robert Chen');

  // Highlight patient info card
  const patientInfoCard = page.getByText('Robert Chen').first();
  if (await patientInfoCard.isVisible().catch(() => false)) {
    await pauseForViewer(page, 1500, 'Patient info and conditions visible');
  }

  // Click the big round mic button to start recording
  // The button is a circular element with Mic icon; the text "Start Recording" is
  // in a sibling <p>, not inside the <button> itself.
  const micButton = page.locator('button').filter({ has: page.locator('svg') }).filter(
    (loc) => loc.locator('..').getByText('Start Recording')
  ).first();
  // Fallback: find the button nearest to "Start Recording" text
  const recordArea = page.locator('text=Start Recording').locator('..');
  const recordButton = recordArea.locator('button').first().or(micButton);

  // Most reliable: the button right before the "Start Recording" paragraph
  const startBtn = page.locator('button:has(svg)').filter({
    has: page.locator('svg.w-10'), // the big Mic icon is w-10 h-10
  }).first();

  // Try the most specific selector first, fall back
  const btnToClick = await startBtn.isVisible().catch(() => false)
    ? startBtn
    : page.locator('button').nth(0); // fallback to first button in recording area

  await btnToClick.click();
  await pauseForViewer(page, 1000, 'Recording started');

  // Wait for transcript to populate — the demo auto-streams text
  await pauseForViewer(page, 18000, 'Live transcript streaming — DR/PT dialog');

  // Look for entity badges
  const medBadge = page.getByText('MEDICATION').first();
  if (await medBadge.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=MEDICATION', 1500);
  }

  // Stop recording — find button with "Stop Recording" text
  const stopRecording = page.getByText('Stop Recording').first();
  if (await stopRecording.isVisible().catch(() => false)) {
    // Click the parent button or the text itself
    await stopRecording.click({ force: true });
  } else {
    // Fallback: look for any visible stop-related button
    const stopFallback = page.locator('button').filter({ hasText: /stop/i }).first();
    if (await stopFallback.isVisible().catch(() => false)) {
      await stopFallback.click();
    }
  }

  await pauseForViewer(page, 1000, 'Recording stopped — processing');

  // Wait for processing pipeline (stage transitions)
  await pauseForViewer(page, 8000, 'Processing pipeline — 3 stages');

  // Look for SOAP note result
  const soapResult = page.getByText('Subjective').first();
  if (await soapResult.isVisible().catch(() => false)) {
    await highlightElement(page, 'text=Subjective', 1500);
    await pauseForViewer(page, 3000, 'SOAP Note generated — reading result');
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
  await scrollToElement(page, 'text=Recoverable Revenue');
  await highlightElement(page, 'text=Recoverable Revenue', 1500);
  await pauseForViewer(page, 1500);

  // Expand AI Denial Prevention Insights
  const denialInsights = page.getByText('AI Denial Prevention Insights').first();
  if (await denialInsights.isVisible()) {
    await denialInsights.click();
    await pauseForViewer(page, 2500, 'Denial Prevention — AI Fix badges');
  }

  // Scroll to claims table
  await scrollToElement(page, 'text=CLM-');
  await pauseForViewer(page, 1500, 'Claims table — AI confidence per claim');

  // Search for Aetna
  const searchInput = page.getByPlaceholder(/Search/i).first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await searchInput.pressSequentially('Aetna', { delay: 100 });
    await pauseForViewer(page, 2000, 'Filtered by Aetna — live search');

    // Clear search
    await searchInput.clear();
    await pauseForViewer(page, 1000, 'Search cleared');
  }

  // Click on a claim row to expand — target the <td> in the table (font-mono styled)
  const claimCell = page.locator('td.font-mono').filter({ hasText: 'CLM-2026-0847' }).first();
  if (await claimCell.isVisible().catch(() => false)) {
    await claimCell.scrollIntoViewIfNeeded();
    await claimCell.click({ force: true });
    await pauseForViewer(page, 2500, 'Claim expanded — timeline + billing breakdown');
  } else {
    // Fallback: click a table row directly
    const tableRow = page.locator('tr').filter({ hasText: 'Maria Garcia' }).first();
    if (await tableRow.isVisible().catch(() => false)) {
      await tableRow.click({ force: true });
      await pauseForViewer(page, 2500, 'Claim expanded — timeline + billing breakdown');
    }
  }

  // ============================================================
  // ACT 6: ANALYTICS, APPOINTMENTS & SETTINGS
  // ============================================================
  chapterMarker('ACT 6', 'Analytics, Appointments & Settings');

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
  await pauseForViewer(page, 2000, 'Appointments — today\'s schedule');

  // Settings
  await page.getByRole('link', { name: /Settings/i }).first().click();
  await page.waitForURL('**/settings', { timeout: 10_000 });
  await pauseForViewer(page, 1500, 'Settings page');

  // Toggle Two-Factor Authentication
  const twoFaToggle = page.getByRole('switch').nth(1); // Second toggle = 2FA
  if (await twoFaToggle.isVisible()) {
    await highlightElement(page, '[role="switch"]:nth-of-type(1)', 1000);
    await twoFaToggle.click();
    await pauseForViewer(page, 1000, 'Two-Factor Authentication toggled ON');
  }

  // Save Changes
  const saveBtn = page.getByRole('button', { name: /Save Changes/i });
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await pauseForViewer(page, 2000, 'Settings saved — green confirmation banner');
  }

  // Sign out — target the desktop sidebar (second aside), not the hidden mobile one
  const desktopSidebar = page.locator('aside').last();
  const signOutBtn = desktopSidebar.getByText('Sign out');
  await signOutBtn.scrollIntoViewIfNeeded();
  await signOutBtn.click();
  await page.waitForURL('**/', { timeout: 10_000 });
  await pauseForViewer(page, 2500, 'Signed out — back to login. Demo complete!');

  chapterMarker('DONE', 'MedOS Full Product Demo Complete');
});
