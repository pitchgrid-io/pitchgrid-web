#!/usr/bin/env node
/*
 * DRY RUN ONLY: how existing Moonbase owners would be routed into the Brevo owner lists.
 * Makes GET requests only (Moonbase Core API; Brevo GET /contacts/{email} if BREVO_API_KEY is set)
 * and prints aggregate counts, incl. how many owners would be added to owners-news (list 8)
 * directly (Moonbase newsletterOptIn or productUpdatesOptIn true, not blocked in Brevo).
 * It has no write mode on purpose: a real backfill needs Peter's explicit OK first.
 * Never prints e-mail addresses or names.
 *
 *   MOONBASE_API_KEY=... [BREVO_API_KEY=...] npm run backfill:owners:dry-run
 *   (lists default to 5 = owners-service, 8 = owners-news; override with BREVO_LIST_* env vars)
 */
import { loadTs } from './load-ts.mjs';

const L = await loadTs('src/lib/server/consent/logic.ts');
const MB = process.env.MOONBASE_BASE_URL || 'https://pitchgrid.moonbase.sh';
const MB_KEY = process.env.MOONBASE_API_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
if (!MB_KEY) { console.error('MOONBASE_API_KEY missing'); process.exit(1); }

const cfg = L.readConfig(process.env);

async function get(url, headers) {
    for (let i = 0; i < 5; i++) {
        const res = await fetch(url, { headers });
        if (res.status === 429) { await new Promise((r) => setTimeout(r, 1000 * Number(res.headers.get('retry-after') || 5))); continue; }
        return res;
    }
    throw new Error('rate limited');
}
async function mbAll(path) {
    const out = []; let p = path;
    while (p) {
        const res = await get(MB + p, { 'Api-Key': MB_KEY, accept: 'application/json' });
        if (!res.ok) throw new Error(`moonbase ${res.status} ${p.split('?')[0]}`);
        const d = await res.json(); out.push(...(d.items ?? [])); p = d.hasMore ? d.next : null;
    }
    return out;
}

const [customers, licenses, orders] = await Promise.all([
    mbAll('/api/customers?pageSize=500'), mbAll('/api/licenses?pageSize=500'), mbAll('/api/orders?pageSize=500&status=Completed')
]);
const orderById = new Map(orders.map((o) => [o.id, o]));
const ownerKind = new Map(); // customerId -> 'paid' | 'free_order' | 'granted'
const rank = { paid: 3, free_order: 2, granted: 1 };
for (const l of licenses) {
    if (l.status !== 'Active') continue;
    const o = l.source?.orderId ? orderById.get(l.source.orderId) : null;
    const k = o ? ((o.total?.due?.amount ?? 0) > 0 && !o.isFullyRefunded ? 'paid' : 'free_order') : 'granted';
    if (!ownerKind.has(l.ownerId) || rank[k] > rank[ownerKind.get(l.ownerId)]) ownerKind.set(l.ownerId, k);
}

const count = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
const combos = new Map(), plans = new Map(), brevoState = new Map();
let owners = 0, addNews = 0, addService = 0;
for (const c of customers) {
    if (c.isDeleted) continue;
    const kind = ownerKind.get(c.id) ?? 'not_owner';
    const cp = c.communicationPreferences ?? {};
    const prefs = { newsletterOptIn: !!cp.newsletterOptIn, productUpdatesOptIn: !!cp.productUpdatesOptIn };
    count(combos, `${kind.padEnd(10)} newsletter=${prefs.newsletterOptIn} productUpdates=${prefs.productUpdatesOptIn}`);
    if (kind === 'not_owner') continue;
    owners++;
    let contact = { exists: false };
    if (BREVO_KEY) {
        const res = await get(`https://api.brevo.com/v3/contacts/${encodeURIComponent(c.email)}?identifierType=email_id`, { 'api-key': BREVO_KEY, accept: 'application/json' });
        if (res.ok) { const b = await res.json(); contact = { exists: true, listIds: b.listIds ?? [], emailBlacklisted: !!b.emailBlacklisted, listUnsubscribed: b.listUnsubscribed ?? [] }; }
        else if (res.status !== 404) throw new Error(`brevo ${res.status}`);
        count(brevoState, !contact.exists ? 'not in Brevo' : contact.emailBlacklisted ? 'in Brevo, blacklisted' :
            contact.listUnsubscribed.length ? 'in Brevo, unsubscribed from a list' :
            `in Brevo, lists [${contact.listIds.sort((a, b) => a - b).join(',')}]`);
    }
    const plan = L.planForOwner(cfg, prefs, contact, kind === 'paid');
    const label = plan.map((a) => (a.kind === 'skip' ? `skip (${a.reason})` : `${a.kind}:${a.listId}`)).join(' + ');
    count(plans, `${kind.padEnd(10)} ${label}`);
    if (plan.some((a) => a.kind === 'add_to_news')) addNews++;
    if (plan.some((a) => a.kind === 'upsert_owner_service')) addService++;
}

const print = (title, m) => { console.log(`\n${title}`); [...m].sort().forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`)); };
console.log(`DRY RUN. customers=${customers.length} owners=${owners} (active licences; paid = from a completed order with amount > 0)`);
console.log(`Brevo lookups: ${BREVO_KEY ? 'yes' : 'NO (BREVO_API_KEY not set: prospect/blacklist state unknown, every owner treated as not in Brevo)'}`);
console.log(`Lists: service=${cfg.lists.ownersService} news=${cfg.lists.ownersNews}`);
print('Moonbase flag combos by owner kind:', combos);
if (BREVO_KEY) print('Owners by Brevo state:', brevoState);
print('Planned routing:', plans);
console.log(`\nWould upsert ${addService} owner(s) into list ${cfg.lists.ownersService} (already members are just updated).`);
console.log(`Would add ${addNews} owner(s) to list ${cfg.lists.ownersNews} directly (no DOI, no email). Nothing written: this script has no write mode.`);
