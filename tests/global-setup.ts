import {
  createTestCompany,
  createTestUser,
  createTestProduct,
  createTestCustomer,
  createTestInvoice,
} from "./helpers/db";

const BASE_URL = "http://localhost:3000";

/**
 * Next.js dev mode compiles each route's module graph lazily, on its first request. Left
 * alone, whichever spec happens to hit a given route first pays that compile cost inline,
 * and that occasionally pushed a real `loginAs()` or navigation past its budget (documented
 * as a flake in the Phase 7 SCRATCHPAD report). This global setup pre-compiles every route
 * the suite touches, once, outside any individual test's timing budget, so the timed run
 * starts fully warm.
 *
 * Deliberately plain HTTP (fetch), not a browser: an earlier version of this file drove a
 * manually-launched Chromium page through a real login, but that browser — created outside
 * Playwright's own test-fixture lifecycle — intermittently hung after a successful login
 * POST with no further requests and no error, in a way individual test files (which use the
 * fixture-provided `page`) never did. Since the only thing that actually needs warming up is
 * server-side route *compilation*, a real browser was never necessary — plain requests with
 * a hand-rolled NextAuth cookie jar compile the same server code with far less moving parts.
 */
class CookieJar {
  private cookies = new Map<string, string>();

  applyFrom(response: Response) {
    for (const setCookie of response.headers.getSetCookie()) {
      const [pair] = setCookie.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Dev server at ${BASE_URL} never became reachable`);
}

/** Logs in via NextAuth's credentials callback directly (csrf token dance), no browser involved. */
async function loginViaHttp(jar: CookieJar, email: string, password: string): Promise<void> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, { signal: AbortSignal.timeout(60_000) });
  jar.applyFrom(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({ csrfToken, email, password, redirect: "false", json: "true" });
  const callbackRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar.header() },
    body: body.toString(),
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  jar.applyFrom(callbackRes);
}

export default async function globalSetup(): Promise<void> {
  await waitForServer();

  const company = await createTestCompany({ name: "Warmup Co", taxRate: 5 });
  const admin = await createTestUser(company.id, "ADMIN", "warmup-admin");
  const product = await createTestProduct(company.id, { name: "Warmup Panel", salePrice: 10000, stockQty: 20 });
  const customer = await createTestCustomer(company.id, "Warmup Customer");
  const invoice = await createTestInvoice(company.id, {
    customerId: customer.id,
    createdBy: admin.id,
    items: [{ productId: product.id, qty: 1, unitPrice: 10000 }],
  });

  const jar = new CookieJar();
  await loginViaHttp(jar, admin.email, admin.password);

  const routes = [
    "/dashboard",
    "/pos",
    "/inventory",
    `/inventory/${product.id}`,
    "/customers",
    `/customers/${customer.id}`,
    "/suppliers",
    "/purchases",
    "/purchases/new",
    "/purchases/warmup-placeholder", // 404s past the DB lookup, but still compiles the [id] route
    "/invoices",
    "/invoices/new",
    `/invoices/${invoice.id}`,
    "/quotations",
    "/quotations/new",
    "/quotations/warmup-placeholder", // 404s past the DB lookup, but still compiles the [id] route
    "/expenses",
    "/reports/sales",
    "/reports/profit",
    "/reports/stock-valuation",
    "/reports/customer-dues",
    "/reports/top-products",
    "/settings/branding",
    "/settings/tax",
    "/settings/users",
    "/settings/audit",
  ];

  for (const route of routes) {
    try {
      await fetch(`${BASE_URL}${route}`, { headers: { Cookie: jar.header() }, signal: AbortSignal.timeout(60_000) });
    } catch {
      // A cold-compile timeout/network hiccup here just means this route stays cold for the
      // real tests too — not fatal to warmup itself, so keep going through the rest.
    }
  }
}
