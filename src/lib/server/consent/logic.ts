/*
 * Consent sync between Moonbase (seller, merchant of record) and Brevo (our mailing tool).
 * Pure logic only: no network, no SvelteKit imports, so it can be unit tested in plain Node.
 *
 * Design (owner decision 2026-10-08, revised: double opt-in is no longer a gate):
 *  - owners-service = Brevo list 5 "PitchGrid owners (service only)": every owner, granted
 *    licences included. Service mails only (releases, fixes, licence changes, no sales content),
 *    with an unsubscribe footer. Legal basis: contract, Art. 6(1)(b) GDPR.
 *  - owners-news = Brevo list 8: an owner whose Moonbase newsletterOptIn OR productUpdatesOptIn is
 *    true is added directly, no DOI mail and no waiting for a click.
 *  - prospects = list 6 (website signups, see src/lib/server/subscribe).
 *  - Brevo is the source of truth for opt-outs: a contact that is blacklisted or unsubscribed from
 *    any list is never (re-)added to any list by this code.
 *  - Both Moonbase flags off (CustomerSubscribed/Unsubscribed) removes the contact from list 8.
 */
// ---------------------------------------------------------------- signature

const enc = new TextEncoder();

/** Constant-time string compare (no early exit on the first differing byte). */
export function safeEqual(a: string, b: string): boolean {
    const x = enc.encode(a);
    const y = enc.encode(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
    return diff === 0;
}

/**
 * Moonbase signs webhooks with HMAC-SHA256 over the raw request body, keyed with the webhook's
 * secret, Base64-encoded and upper-cased, in the `X-Signature` header
 * (https://moonbase.sh/docs/webhooks/#security). Their reference code compares the upper-cased
 * values, so we do the same (case-insensitive compare of the Base64 string).
 * Web Crypto, so it runs on Node 20+ without @types/node.
 */
export async function moonbaseSignature(secret: string, rawBody: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)));
    let bin = '';
    for (const b of mac) bin += String.fromCharCode(b);
    return btoa(bin).toUpperCase();
}

export async function verifyMoonbaseSignature(
    secret: string,
    rawBody: string,
    header: string | null | undefined
): Promise<boolean> {
    if (!secret || !header) return false;
    return safeEqual(await moonbaseSignature(secret, rawBody), header.trim().toUpperCase());
}

// ---------------------------------------------------------------- config

export type ConsentConfig = {
    lists: { ownersService?: number; ownersNews?: number; prospects?: number };
    /** CONSENT_SYNC_WRITES=true: actually write to Brevo. Otherwise plan + log only. */
    writesEnabled: boolean;
    /**
     * MOONBASE_PREFS_WRITE=true: a Brevo unsubscribe may PATCH Moonbase newsletterOptIn=false
     * (the only preference field the Core API documents for PATCH). productUpdatesOptIn is never
     * written: not documented, and both toggles are hidden in our embed.
     */
    moonbasePrefsWrite: boolean;
};

/** Brevo list ids decided 2026-10-08. Env vars override; these are only fallbacks. */
export const DEFAULT_LISTS = { ownersService: 5, ownersNews: 8, prospects: 6 } as const;

const int = (v: string | undefined): number | undefined => {
    const n = Number.parseInt((v ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
};
const flag = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'true';

export function readConfig(env: Record<string, string | undefined>): ConsentConfig {
    return {
        lists: {
            ownersService: int(env.BREVO_LIST_OWNERS_SERVICE) ?? DEFAULT_LISTS.ownersService,
            ownersNews: int(env.BREVO_LIST_OWNERS_NEWS) ?? DEFAULT_LISTS.ownersNews,
            prospects: int(env.BREVO_LIST_PROSPECTS) ?? DEFAULT_LISTS.prospects
        },
        writesEnabled: flag(env.CONSENT_SYNC_WRITES),
        moonbasePrefsWrite: flag(env.MOONBASE_PREFS_WRITE)
    };
}

// ---------------------------------------------------------------- state + plan

export type MoonbasePrefs = { newsletterOptIn: boolean; productUpdatesOptIn: boolean };

export type BrevoContactState =
    | { exists: false }
    | { exists: true; listIds: number[]; emailBlacklisted: boolean; listUnsubscribed?: number[] };

export type Action =
    | { kind: 'upsert_owner_service'; listId: number; /** sets PURCHASED=true; only for a real paid order */ purchased: boolean }
    | { kind: 'add_to_news'; listId: number }
    | { kind: 'remove_from_news'; listId: number }
    | { kind: 'skip'; reason: string };

export const optedIn = (p: MoonbasePrefs | null | undefined) =>
    !!p && (p.newsletterOptIn || p.productUpdatesOptIn);

/** Blacklisted, or unsubscribed from any list: Brevo says stop, so we never (re-)add. */
export function isBlocked(brevo: BrevoContactState): boolean {
    return brevo.exists && (brevo.emailBlacklisted || (brevo.listUnsubscribed?.length ?? 0) > 0);
}

const BLOCKED = 'contact blacklisted/unsubscribed in Brevo: not (re-)added';

/** Routing for OrderCompleted (also used by the backfill dry run). */
export function planForOwner(
    cfg: ConsentConfig,
    prefs: MoonbasePrefs | null,
    brevo: BrevoContactState,
    /** true only for a completed order with an amount > 0 (not €0 coupons, not granted licences) */
    paidOrder = false
): Action[] {
    const { ownersService, ownersNews } = cfg.lists;
    if (isBlocked(brevo)) return [{ kind: 'skip', reason: BLOCKED }];
    const actions: Action[] = [];

    // 1. Every owner goes to owners-service (contract basis, service mails only).
    if (ownersService) actions.push({ kind: 'upsert_owner_service', listId: ownersService, purchased: paidOrder });
    else actions.push({ kind: 'skip', reason: 'BREVO_LIST_OWNERS_SERVICE not set' });

    // 2. owners-news directly when either Moonbase flag is on.
    actions.push(...newsActions(ownersNews, prefs, brevo));
    return actions;
}

function newsActions(ownersNews: number | undefined, prefs: MoonbasePrefs | null, brevo: BrevoContactState): Action[] {
    if (!ownersNews) return [{ kind: 'skip', reason: 'BREVO_LIST_OWNERS_NEWS not set' }];
    if (!optedIn(prefs)) return [{ kind: 'skip', reason: 'no newsletter/product-updates opt-in: service list only' }];
    if (brevo.exists && brevo.listIds.includes(ownersNews)) return [{ kind: 'skip', reason: 'already in owners-news' }];
    return [{ kind: 'add_to_news', listId: ownersNews }];
}

/**
 * CustomerSubscribed / CustomerUnsubscribed carry no preference fields, so the handler re-reads
 * the customer from the Core API and reconciles: both flags off => leave owners-news; a flag on =>
 * owner added to owners-news directly (no owners-service change, no DOI).
 */
export function planForPrefsChange(
    cfg: ConsentConfig,
    prefs: MoonbasePrefs | null,
    brevo: BrevoContactState,
    isOwner: boolean
): Action[] {
    const { ownersNews } = cfg.lists;
    if (!ownersNews) return [{ kind: 'skip', reason: 'BREVO_LIST_OWNERS_NEWS not set' }];
    if (!prefs) return [{ kind: 'skip', reason: 'customer not found in Moonbase' }];
    if (!optedIn(prefs)) {
        // Removing is always allowed, blocked or not.
        if (brevo.exists && brevo.listIds.includes(ownersNews))
            return [{ kind: 'remove_from_news', listId: ownersNews }];
        return [{ kind: 'skip', reason: 'opted out and not in owners-news' }];
    }
    if (isBlocked(brevo)) return [{ kind: 'skip', reason: BLOCKED }];
    // Moonbase newsletter contacts without a licence are prospects, not owners: the website
    // signup handles those, so we don't add them to owner lists here.
    if (!isOwner) return [{ kind: 'skip', reason: 'not an owner' }];
    return newsActions(ownersNews, prefs, brevo);
}

/** PURCHASED means a real paid order: amount due > 0 and not fully refunded. */
export function isPaidOrder(order: { total?: { due?: { amount?: number } }; isFullyRefunded?: boolean } | null | undefined): boolean {
    return !!order && (order.total?.due?.amount ?? 0) > 0 && !order.isFullyRefunded;
}

/** Which Brevo marketing webhook events mean "stop marketing to me". */
export function isBrevoOptOutEvent(event: unknown): boolean {
    return event === 'unsubscribe' || event === 'unsubscribed' || event === 'spam';
}

/** Body for PATCH /api/customers/{id} when Brevo reports an opt-out (newsletter flag only). */
export function moonbaseOptOutPatch(): { communicationPreferences: { newsletterOptIn: false } } {
    return { communicationPreferences: { newsletterOptIn: false } };
}

/** Status for a failed downstream call: retryable errors become 5xx so the sender retries. */
export function isRetryable(status: number): boolean {
    return status === 0 || status === 429 || status >= 500;
}
