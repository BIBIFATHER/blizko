import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const STORE_PATH =
  process.env.BLIZKO_LEADS_FILE ||
  path.resolve(process.cwd(), '.local/recruiting/nanny-warm-pool.enc');
const KEYCHAIN_SERVICE = 'blizko-nanny-warm-pool';
const KEYCHAIN_ACCOUNT = process.env.USER || 'blizko';
const SOURCE_CHANNELS = ['hh', 'avito', 'profi', 'pomogatel', 'telegram', 'referral', 'other'];
const STATUSES = [
  'new',
  'contacted',
  'responded',
  'interested',
  'intro_scheduled',
  'pilot_waitlist',
  'declined',
  'archived',
];
const RECONTACT = ['unknown', 'yes', 'no'];
const RETENTION_DAYS = 90;
const RECONTACT_REQUIRED_STATUSES = ['intro_scheduled', 'pilot_waitlist'];

function runKeychain(args) {
  return execFileSync('security', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function getKey({ create = false } = {}) {
  try {
    return Buffer.from(
      runKeychain(['find-generic-password', '-w', '-a', KEYCHAIN_ACCOUNT, '-s', KEYCHAIN_SERVICE]),
      'base64',
    );
  } catch {
    if (!create) throw new Error('Registry key is missing. Run: npm run leads -- init');

    const encoded = crypto.randomBytes(32).toString('base64');
    runKeychain([
      'add-generic-password',
      '-U',
      '-a',
      KEYCHAIN_ACCOUNT,
      '-s',
      KEYCHAIN_SERVICE,
      '-w',
      encoded,
    ]);
    return Buffer.from(encoded, 'base64');
  }
}

function encrypt(value, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);

  return JSON.stringify({
    version: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  });
}

function decrypt(raw, key) {
  const envelope = JSON.parse(raw);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8'),
  );
}

function saveRegistry(registry, key) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true, mode: 0o700 });
  fs.writeFileSync(STORE_PATH, encrypt(registry, key), { mode: 0o600 });
  fs.chmodSync(STORE_PATH, 0o600);
}

function loadRegistry() {
  const key = getKey();
  if (!fs.existsSync(STORE_PATH)) {
    throw new Error('Registry file is missing. Run: npm run leads -- init');
  }
  return { key, registry: decrypt(fs.readFileSync(STORE_PATH, 'utf8'), key) };
}

function clean(value, maxLength = 160) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function validateMinimalText(label, value) {
  if (/@/.test(value) || /\+?\d[\d\s()-]{6,}\d/.test(value)) {
    throw new Error(
      `${label} appears to contain an email or phone. Keep direct contacts in the source platform.`,
    );
  }
}

function validateSourceReference(value) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error('Source reference is required.');
  if (
    /@|mailto:|tel:/i.test(normalized) ||
    /[?&](email|phone|tel|contact|mobile)=/i.test(normalized)
  ) {
    throw new Error('Source reference appears to contain direct contact data.');
  }
}

function validateRecontactState(status, permissionToRecontact) {
  if (RECONTACT_REQUIRED_STATUSES.includes(status) && permissionToRecontact !== 'yes') {
    throw new Error(`${status} requires explicit permissionToRecontact=yes.`);
  }
}

function purgeExpiredLeads(registry, now = new Date(), retentionDays = RETENTION_DAYS) {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const removedIds = [];

  registry.leads = registry.leads.filter((lead) => {
    const updatedAt = Date.parse(lead.updatedAt || lead.createdAt || '');
    const mustDelete =
      lead.permissionToRecontact === 'no' ||
      lead.status === 'declined' ||
      !Number.isFinite(updatedAt) ||
      updatedAt < cutoff;
    if (mustDelete) removedIds.push(lead.id);
    return !mustDelete;
  });

  return { removedIds, remaining: registry.leads.length };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function ask(rl, label, current = '') {
  const suffix = current ? ` [${current}]` : '';
  const answer = clean(await rl.question(`${label}${suffix}: `), 240);
  return answer || current;
}

async function askEnum(rl, label, values, current = values[0]) {
  const answer = await ask(rl, `${label} (${values.join('/')})`, current);
  if (!values.includes(answer)) throw new Error(`${label} must be one of: ${values.join(', ')}`);
  return answer;
}

async function addLead(rl) {
  const { key, registry } = loadRegistry();
  const sourceChannel = await askEnum(rl, 'Source', SOURCE_CHANNELS, 'hh');
  const sourceReference = await ask(rl, 'Source response/profile ID or URL');
  validateSourceReference(sourceReference);

  const duplicate = registry.leads.find(
    (lead) => lead.sourceChannel === sourceChannel && lead.sourceReference === sourceReference,
  );
  if (duplicate) throw new Error(`Duplicate source reference: ${duplicate.id}`);

  const displayName = await ask(rl, 'First name only');
  const cityArea = await ask(rl, 'City / broad area');
  const experienceBand = await ask(rl, 'Experience band (for example 3-5 years)');
  const scheduleSummary = await ask(rl, 'Schedule summary');
  const rateSummary = await ask(rl, 'Rate summary');
  const status = await askEnum(rl, 'Status', STATUSES, 'new');
  const permissionToRecontact = await askEnum(rl, 'May we contact later', RECONTACT, 'unknown');
  const lastContactOn = await ask(rl, 'Last contact date YYYY-MM-DD', today());
  const nextActionOn = await ask(rl, 'Next action date YYYY-MM-DD');
  const notes = await ask(rl, 'Minimal note, no contacts/documents/health data');
  validateRecontactState(status, permissionToRecontact);

  for (const [label, value] of [
    ['First name', displayName],
    ['City/area', cityArea],
    ['Experience', experienceBand],
    ['Schedule', scheduleSummary],
    ['Rate', rateSummary],
    ['Notes', notes],
  ]) {
    validateMinimalText(label, value);
  }

  const now = new Date().toISOString();
  const lead = {
    id: `nwl_${crypto.randomUUID()}`,
    sourceChannel,
    sourceReference,
    displayName,
    cityArea,
    experienceBand,
    scheduleSummary,
    rateSummary,
    status,
    permissionToRecontact,
    lastContactOn,
    nextActionOn,
    notes,
    createdAt: now,
    updatedAt: now,
  };

  registry.leads.push(lead);
  saveRegistry(registry, key);
  console.log(`Added ${lead.id}`);
}

function findLead(registry, id) {
  const matches = registry.leads.filter((lead) => lead.id === id || lead.id.startsWith(id));
  if (matches.length !== 1)
    throw new Error(`Expected one lead for "${id}", found ${matches.length}.`);
  return matches[0];
}

// Hard-remove a lead (right to refuse / erasure). Resolves a unique exact or
// prefix id, then deletes it. Pure helper so it is unit-testable.
function removeLeadById(registry, id) {
  const lead = findLead(registry, id);
  registry.leads = registry.leads.filter((entry) => entry.id !== lead.id);
  return { removedId: lead.id, remaining: registry.leads.length };
}

function deleteLead(id) {
  const { key, registry } = loadRegistry();
  const { removedId } = removeLeadById(registry, id);
  saveRegistry(registry, key);
  console.log(`Deleted ${removedId}`);
}

async function updateLead(rl, id) {
  const { key, registry } = loadRegistry();
  const lead = findLead(registry, id);

  lead.status = await askEnum(rl, 'Status', STATUSES, lead.status);
  lead.permissionToRecontact = await askEnum(
    rl,
    'May we contact later',
    RECONTACT,
    lead.permissionToRecontact,
  );
  lead.lastContactOn = await ask(rl, 'Last contact date YYYY-MM-DD', lead.lastContactOn);
  lead.nextActionOn = await ask(rl, 'Next action date YYYY-MM-DD', lead.nextActionOn);
  lead.notes = await ask(rl, 'Minimal note, no contacts/documents/health data', lead.notes);
  validateMinimalText('Notes', lead.notes);
  validateRecontactState(lead.status, lead.permissionToRecontact);
  lead.updatedAt = new Date().toISOString();

  saveRegistry(registry, key);
  console.log(`Updated ${lead.id}`);
}

function listLeads() {
  const { registry } = loadRegistry();
  const rows = registry.leads
    .filter((lead) => !['archived', 'declined'].includes(lead.status))
    .map((lead) => ({
      id: lead.id.slice(0, 12),
      source: lead.sourceChannel,
      name: lead.displayName || '-',
      area: lead.cityArea || '-',
      status: lead.status,
      recontact: lead.permissionToRecontact,
      next: lead.nextActionOn || '-',
    }));
  console.table(rows);
}

function listFollowups() {
  const { registry } = loadRegistry();
  const rows = registry.leads
    .filter(
      (lead) =>
        lead.permissionToRecontact === 'yes' && !['archived', 'declined'].includes(lead.status),
    )
    .map((lead) => ({
      id: lead.id.slice(0, 12),
      source: lead.sourceChannel,
      area: lead.cityArea || '-',
      status: lead.status,
      next: lead.nextActionOn || '-',
    }));
  console.table(rows);
}

function showStats() {
  const { registry } = loadRegistry();
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const lead of registry.leads) byStatus[lead.status] += 1;
  console.table(byStatus);
  console.log(`Total: ${registry.leads.length}`);
}

function purgeRegistry() {
  const { key, registry } = loadRegistry();
  const { removedIds, remaining } = purgeExpiredLeads(registry);
  saveRegistry(registry, key);
  console.log(`Purged ${removedIds.length}; remaining ${remaining}.`);
}

function exportForMigration(target) {
  if (process.env.BLIZKO_ALLOW_PLAINTEXT_EXPORT !== '1') {
    throw new Error(
      'Plaintext export is disabled. Enable it only during an approved RU-core migration.',
    );
  }
  const { registry } = loadRegistry();
  const destination = path.resolve(target || `nanny-warm-pool-export-${today()}.json`);
  fs.writeFileSync(destination, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(destination, 0o600);
  console.log(`Plaintext export created at ${destination}. Import it immediately, then delete it.`);
}

async function main() {
  const [command = 'help', argument] = process.argv.slice(2);
  const rl = createInterface({ input, output });
  try {
    if (command === 'init') {
      const key = getKey({ create: true });
      if (!fs.existsSync(STORE_PATH)) {
        saveRegistry({ version: 1, createdAt: new Date().toISOString(), leads: [] }, key);
      }
      console.log(`Encrypted registry initialized at ${STORE_PATH}`);
    } else if (command === 'add') {
      await addLead(rl);
    } else if (command === 'update') {
      if (!argument) throw new Error('Usage: npm run leads -- update <id>');
      await updateLead(rl, argument);
    } else if (command === 'list') {
      listLeads();
    } else if (command === 'followups') {
      listFollowups();
    } else if (command === 'stats') {
      showStats();
    } else if (command === 'purge') {
      purgeRegistry();
    } else if (command === 'delete') {
      if (!argument) throw new Error('Usage: npm run leads -- delete <id>');
      deleteLead(argument);
    } else if (command === 'export') {
      exportForMigration(argument);
    } else {
      console.log(`Commands:
  npm run leads -- init
  npm run leads -- add
  npm run leads -- list
  npm run leads -- followups
  npm run leads -- update <id>
  npm run leads -- delete <id>
  npm run leads -- purge
  npm run leads -- stats

Plaintext migration export is intentionally blocked until RU-core is approved.`);
    }
  } finally {
    rl.close();
  }
}

// Only run the CLI when executed directly, so tests can import the pure helpers.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export {
  validateMinimalText,
  validateSourceReference,
  validateRecontactState,
  removeLeadById,
  purgeExpiredLeads,
};
