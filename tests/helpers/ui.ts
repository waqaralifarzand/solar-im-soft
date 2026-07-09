import type { Locator } from "@playwright/test";

/**
 * Selects a <select> option by a substring of its visible text. Playwright's built-in
 * selectOption({ label }) requires an exact match, which breaks for options rendered as
 * "Name — phone" or with a unique-suffixed test name — this matches by substring instead.
 */
export async function selectOptionByText(select: Locator, text: string): Promise<void> {
  const value = await select.locator("option", { hasText: text }).first().getAttribute("value");
  if (value === null) throw new Error(`No <option> containing "${text}" found`);
  await select.selectOption(value);
}
