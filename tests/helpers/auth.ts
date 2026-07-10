import type { Page } from "@playwright/test";

/**
 * timeoutMs defaults to 25s. global-setup.ts's own HTTP-only warm-up (see that file) means
 * the server-side auth/route compilation is already done by the time any test runs — but an
 * individual login request can still, rarely, take longer than that in this environment for
 * reasons unrelated to app code (observed: an isolated single-request slowdown, never the
 * same test twice, with no error on the server side — see the Phase 8 SCRATCHPAD report).
 * One retry absorbs that without masking a real regression: if the app were actually broken,
 * the retry would fail exactly the same way and the test would still fail loudly.
 */
export async function loginAs(page: Page, email: string, password: string, timeoutMs = 25_000) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    try {
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: timeoutMs });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}
