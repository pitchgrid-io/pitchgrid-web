#!/usr/bin/env node
/*
 * DRY RUN ONLY: how existing Moonbase owners would be routed into the Brevo owner lists.
 * Makes GET requests only (Moonbase Core API; Brevo GET /contacts/{email} if BREVO_API_KEY is set)
 * and prints aggregate counts. It has no write mode on purpose: a real backfill would trigger Brevo
 * double opt-in mails to customers, which needs Peter's explicit OK first.
 * Never prints e-mail addresses or names.
 *
 *   MOONBASE_API_KEY=... [BREVO_API_KEY=...] [BREVO_LIST_OWNERS_SERVICE=..] [BREVO_LIST_OWNERS_NEWS=..]
 *   [BREVO_LIST_PROSPECTS=6] npm run backfill:owners:dry-run
 */
import { loadTs } from './load-ts.mjs';

const L = await loadTs('src/lib/server/consent/logic.ts');
const MB = process.env.MOONBASE_BASE_URL || 'https://pitchgrid.moonbase.sh';
const MB_KEY = process.env.MOONBASE_API_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
if (!MB_KEY) { console.error('MOONBASE_API_KEY missing'); process.exit(1); }

// Placeholder ids (-1) when not configured, so the plan still shows every branch.
const env = { BREVO_LIST_OWNERS_SERVICE: '-1', BREVO_LIST_OWNERS_NEWS: '-2', BREVO_DOI_TEMPLATE_ID: '-3', ...process.env };
const cfg = L.readConfig(env);
const asId = (v, fallback) => { const n = Number.parseInt(v ?? '', 10); return Number.isFinite(n) ? n : fallback; };
cfg.lists.ownersService = asId(env.BREVO_LIST_OWNERS_SERVICE, -1);
cfg.lists.ownersNews = asId(env.BREVO_LIST_OWNERS_NEWS, -2);
cfg.doiTemplateId = cfg.doiTemplateId ?? asId(env.BREVO_DOI_TEMPLATE_ID, -3);

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
let owners = 0;
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
        if (res.ok) { const b = await res.json(); contact = { exists: true, listIds: b.listIds ?? [], emailBlacklisted: !!b.emailBlacklisted }; }
        else if (res.status !== 404) throw new Error(`brevo ${res.status}`);
        count(brevoState, !contact.exists ? 'not in Brevo' : contact.emailBlacklisted ? 'in Brevo, blacklisted' :
            `in Brevo, lists [${contact.listIds.sort((a, b) => a - b).join(',')}]`);
    }
    const news = L.planForOwner(cfg, prefs, contact).find((a) => a.kind !== 'upsert_owner_service');
    count(plans, `${kind.padEnd(10)} ${news.kind === 'skip' ? 'service only (' + news.reason + ')' : news.kind}`);
}

const print = (title, m) => { console.log(`\n${title}`); [...m].sort().forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`)); };
console.log(`DRY RUN. customers=${customers.length} owners=${owners} (active licences; paid = from a completed order with amount > 0)`);
console.log(`Brevo lookups: ${BREVO_KEY ? 'yes' : 'NO (BREVO_API_KEY not set: prospect/blacklist state unknown, every owner treated as not in Brevo)'}`);
console.log(`Lists: service=${cfg.lists.ownersService} news=${cfg.lists.ownersNews} confirmed=[${cfg.confirmedListIds}] (negative = not configured)`);
print('Moonbase flag combos by owner kind:', combos);
if (BREVO_KEY) print('Owners by Brevo state:', brevoState);
print('Planned routing (every owner also gets upsert_owner_service):', plans);
const doi = [...plans].filter(([k]) => k.includes('trigger_doi_news')).reduce((s, [, v]) => s + v, 0);
console.log(`\nWould send ${doi} Brevo DOI e-mail(s). Not sent: this script has no write mode.`);
