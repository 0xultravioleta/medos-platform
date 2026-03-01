import { type Page } from '@playwright/test';

/**
 * Type text character by character with a delay — looks natural on video.
 */
export async function slowType(page: Page, selector: string, text: string, delayMs = 80) {
  const el = page.locator(selector);
  await el.click();
  for (const char of text) {
    await el.pressSequentially(char, { delay: delayMs });
  }
}

/**
 * Pause execution so the viewer can read the screen.
 * Logs a chapter marker to the console for reference.
 */
export async function pauseForViewer(page: Page, ms: number, label?: string) {
  if (label) {
    console.log(`  [PAUSE] ${label} — ${ms}ms`);
  }
  await page.waitForTimeout(ms);
}

/**
 * Smooth-scroll to an element so camera follows naturally.
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).first().evaluate((el) => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(600); // let scroll finish
}

/**
 * Inject a pulsing red highlight around an element to draw the viewer's eye.
 * Auto-removes after `durationMs`.
 */
export async function highlightElement(page: Page, selector: string, durationMs = 2000) {
  const loc = page.locator(selector).first();
  await loc.evaluate(
    (el, dur) => {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes medos-highlight-pulse {
          0%, 100% { outline-color: rgba(255, 0, 0, 0.9); }
          50% { outline-color: rgba(255, 0, 0, 0.3); }
        }
      `;
      document.head.appendChild(style);

      el.style.outline = '3px solid rgba(255, 0, 0, 0.9)';
      el.style.outlineOffset = '4px';
      el.style.animation = 'medos-highlight-pulse 0.8s ease-in-out infinite';

      setTimeout(() => {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.animation = '';
        style.remove();
      }, dur);
    },
    durationMs,
  );
  await page.waitForTimeout(durationMs);
}

/**
 * Log a chapter title to console — useful for correlating video timestamps.
 */
export function chapterMarker(act: string, title: string) {
  console.log(`\n========================================`);
  console.log(`  ${act}: ${title}`);
  console.log(`========================================\n`);
}

/**
 * Click a navigation link within a specific scope (sidebar, aside, or page).
 * Uses actual DOM <Link> elements so navigation is client-side (no reload).
 */
export async function clickNavLink(page: Page, label: string | RegExp, scope?: string) {
  const container = scope ? page.locator(scope) : page;
  const link = container.getByRole('link', { name: label }).first();
  await link.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * @deprecated Use clickNavLink() or direct locator clicks instead.
 * This function creates a raw <a> tag which causes a full page reload,
 * losing sessionStorage auth state momentarily.
 *
 * Navigate to a path using client-side navigation (preserves auth state).
 * Falls back to clicking a sidebar/page link if available.
 */
export async function navigateTo(page: Page, path: string) {
  // Use Next.js client-side navigation via anchor click injection
  await page.evaluate((p) => {
    const a = document.createElement('a');
    a.href = p;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}
