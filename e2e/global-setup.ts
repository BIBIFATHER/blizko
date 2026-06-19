import fs from 'node:fs';
import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

import {
  ADMIN_STATE,
  AUTH_DIR,
  PARENT_STATE,
  assertE2EProject,
  assertTestAuthAllowed,
  baseURL,
} from './support/env';

/** Hard-fail (not skip) when a required preview secret is missing. */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[e2e] missing required secret: ${name}`);
  return v;
}

function supabaseRef(url: string): string {
  const host = new URL(url).hostname; // <ref>.supabase.co
  const ref = host.split('.')[0];
  if (!ref) throw new Error(`[e2e] cannot derive Supabase ref from ${url}`);
  return ref;
}

/** Parent: real UI OTP flow (test phone) -> persisted storageState. */
async function createParentState(): Promise<void> {
  const phone = requireEnv('TEST_OTP_PHONE');
  const code = process.env.E2E_TEST_OTP_CODE || '000000';

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    baseURL: baseURL(),
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    // Open the auth modal if a trigger is present (the /login page may auto-open).
    const opener = page.getByRole('button', { name: /войти|вход|account|login/i }).first();
    if (await opener.isVisible().catch(() => false)) await opener.click();

    await page.getByTestId('auth-role-parent').click();
    await page
      .getByTestId('auth-method-phone')
      .click()
      .catch(() => {});
    // Masked phone input: type the 10 national digits.
    const contact = page.getByTestId('auth-contact');
    await contact.click();
    await contact.fill('');
    await page.keyboard.type(phone.replace(/^\+7/, ''), { delay: 30 });
    await page.getByTestId('auth-name').fill('E2E Parent');
    await page.getByTestId('auth-send-code').click();

    const otp = page.getByTestId('auth-otp');
    await otp.waitFor({ state: 'visible', timeout: 20_000 });
    await otp.fill(code);
    await page.getByTestId('auth-verify').click();

    // Session is persisted to localStorage by supabase-js once auth completes.
    await page.waitForFunction(
      () =>
        Object.keys(localStorage).some((k) => /-auth-token$/.test(k) && localStorage.getItem(k)),
      undefined,
      { timeout: 20_000 },
    );
    await ctx.storageState({ path: PARENT_STATE });
  } finally {
    await browser.close();
  }
}

/** Admin: server-side magiclink (service-role) -> session injected into storageState. */
async function createAdminState(): Promise<void> {
  const url = requireEnv('SUPABASE_URL');
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anon = requireEnv('E2E_SUPABASE_ANON_KEY');
  const adminEmail = requireEnv('E2E_ADMIN_EMAIL');
  const ref = supabaseRef(url);

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    throw new Error(`[e2e] admin generateLink failed: ${linkErr?.message ?? 'no hashed_token'}`);
  }

  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data: verified, error: verifyErr } = await client.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyErr || !verified?.session) {
    throw new Error(`[e2e] admin verifyOtp failed: ${verifyErr?.message ?? 'no session'}`);
  }

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: baseURL(),
        localStorage: [{ name: `sb-${ref}-auth-token`, value: JSON.stringify(verified.session) }],
      },
    ],
  };
  fs.writeFileSync(ADMIN_STATE, JSON.stringify(storageState, null, 2));
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  assertTestAuthAllowed(); // fail-closed: E2E_TEST_AUTH=1 + allow-listed non-prod host
  assertE2EProject(); // fail-closed: all creds target the declared E2E project, never prod
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await createParentState();
  await createAdminState();
}
