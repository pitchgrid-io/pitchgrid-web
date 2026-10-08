/*
 * Consent sync between Moonbase (seller, merchant of record) and Brevo (our mailing tool).
 * Pure logic only: no network, no SvelteKit imports, so it can be unit tested in plain Node.
 *
 * Design (decided 2026-10-08 after legal review):
 *  - owners-service = Brevo list 5 "PitchGrid owners (service only)": every owner, granted
 *    licences included. Service mails only (releases, fixes, licence changes, no sales content),
 *    with an unsubscribe footer. Legal basis: contract, Art. 6(1)(b) GDPR. Not a DOI list.
 *  - owners-news = Brevo list 8 "PitchGrid owners-news (DOI opt-in)": only via Brevo double
 *    opt-in. A Moonbase opt-in (newsletterOptIn OR productUpdatesOptIn, e.g. the checkout box)
 *    only TRIGGERS the DOI mail; it is never enough on its own.
 *  - prospects = list 6. Lists 2/5/6 are NOT double opt-in proof (list 2 is mostly bulk imports;
 *    5 and 6 were split from it), so they must never be in BREVO_CONFIRMED_LIST_IDS.
 *  The UWG §7(3) existing-customer exception is NOT used: Moonbase is the seller and buyers were
 *  never offered an objection at checkout. Nobody is marked newsletter-consented by this code.
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
    /**
     * Lists whose members are proven double opt-in confirmations and may be moved into owners-news
     * without a second DOI. Default: none. Never lists 2, 5 or 6 (not DOI proof).
     */
    confirmedListIds: number[];
    /** CONSENT_SYNC_WRITES=true: actually write to Brevo. Otherwise plan + log only. */
    writesEnabled: boolean;
    /** CONSENT_SYNC_DOI=true: allowed to trigger Brevo DOI mails (sends email to the buyer). */
    doiEnabled: boolean;
    doiTemplateId?: number;
    doiRedirectUrl?: string;
    /**
     * MOONBASE_PREFS_WRITE=true: a Brevo unsubscribe may PATCH Moonbase newsletterOptIn=false
     * (the only preference field the Core API documents for PATCH). productUpdatesOptIn is never
     * written: not documented, and both toggles are hidden in our embed.
     */
    moonbasePrefsWrite: boolean;
};

/** Brevo list ids decided 2026-10-08. Env vars override; these are only fallbacks. */
export const DEFAULT_LISTS = { ownersService: 5, ownersNews: 8, prospects: 6 } as const;
/** List ids that must never count as DOI proof, even if configured by mistake. */
export const NEVER_CONFIRMED = [2, 5, 6] as const;

const int = (v: string | undefined): number | undefined => {
    const n = Number.parseInt((v ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
};
const flag = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'true';

export function readConfig(env: Record<string, string | undefined>): ConsentConfig {
    const confirmed = (env.BREVO_CONFIRMED_LIST_IDS ?? '')
        .split(',')
        .map((s) => int(s))
        .filter((n): n is number => n !== undefined && !(NEVER_CONFIRMED as readonly number[]).includes(n));
    return {
        lists: {
            ownersService: int(env.BREVO_LIST_OWNERS_SERVICE) ?? DEFAULT_LISTS.ownersService,
            ownersNews: int(env.BREVO_LIST_OWNERS_NEWS) ?? DEFAULT_LISTS.ownersNews,
            prospects: int(env.BREVO_LIST_PROSPECTS) ?? DEFAULT_LISTS.prospects
        },
        confirmedListIds: confirmed,
        writesEnabled: flag(env.CONSENT_SYNC_WRITES),
        doiEnabled: flag(env.CONSENT_SYNC_DOI),
        doiTemplateId: int(env.BREVO_DOI_TEMPLATE_ID_OWNERS_NEWS) ?? int(env.BREVO_DOI_TEMPLATE_ID),
        doiRedirectUrl:
            env.BREVO_DOI_REDIRECT_URL_OWNERS_NEWS?.trim() || env.BREVO_DOI_REDIRECT_URL?.trim() || undefined,
        moonbasePrefsWrite: flag(env.MOONBASE_PREFS_WRITE)
    };
}

// ---------------------------------------------------------------- state + plan

export type MoonbasePrefs = { newsletterOptIn: boolean; productUpdatesOptIn: boolean };

export type BrevoContactState =
    | { exists: false }
    | { exists: true; listIds: number[]; emailBlacklisted: boolean };

export type Action =
    | { kind: 'upsert_owner_service'; listId: number }
    | { kind: 'move_prospect_to_news'; addListId: number; removeListIds: number[] }
    | { kind: 'trigger_doi_news'; listId: number; templateId: number }
    | { kind: 'remove_from_news'; listId: number }
    | { kind: 'skip'; reason: string };

export const optedIn = (p: MoonbasePrefs | null | undefined) =>
    !!p && (p.newsletterOptIn || p.productUpdatesOptIn);

/** Routing for OrderCompleted (also used by the backfill dry run). */
export function planForOwner(
    cfg: ConsentConfig,
    prefs: MoonbasePrefs | null,
    brevo: BrevoContactState
): Action[] {
    const actions: Action[] = [];
    const { ownersService, ownersNews } = cfg.lists;

    // 1. Every owner goes to owners-service (contract basis, service mails only).
    if (ownersService) actions.push({ kind: 'upsert_owner_service', listId: ownersService });
    else actions.push({ kind: 'skip', reason: 'BREVO_LIST_OWNERS_SERVICE not set' });

    // 2. owners-news only with consent we can prove.
    if (!ownersNews) {
        actions.push({ kind: 'skip', reason: 'BREVO_LIST_OWNERS_NEWS not set' });
        return actions;
    }
    if (brevo.exists && brevo.emailBlacklisted) {
        // Brevo is the source of truth for unsubscribes: never re-subscribe a blacklisted contact.
        actions.push({ kind: 'skip', reason: 'contact unsubscribed/blacklisted in Brevo' });
        return actions;
    }
    if (brevo.exists && brevo.listIds.includes(ownersNews)) {
        actions.push({ kind: 'skip', reason: 'already in owners-news' });
        return actions;
    }
    const confirmedIn = brevo.exists
        ? cfg.confirmedListIds.filter((id) => brevo.listIds.includes(id))
        : [];
    if (confirmedIn.length) {
        // Proven DOI confirmation (BREVO_CONFIRMED_LIST_IDS): move without a second DOI.
        actions.push({ kind: 'move_prospect_to_news', addListId: ownersNews, removeListIds: confirmedIn });
        return actions;
    }
    if (optedIn(prefs)) {
        if (!cfg.doiTemplateId) actions.push({ kind: 'skip', reason: 'no DOI template id configured' });
        else actions.push({ kind: 'trigger_doi_news', listId: ownersNews, templateId: cfg.doiTemplateId });
        return actions;
    }
    actions.push({ kind: 'skip', reason: 'no newsletter/product-updates opt-in: service list only' });
    return actions;
}

/**
 * CustomerSubscribed / CustomerUnsubscribed carry no preference fields, so the handler re-reads
 * the customer from the Core API and reconciles: both flags off => leave owners-news; a flag on =>
 * same news routing as for an order (DOI or move), but no owners-service change.
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
        if (brevo.exists && brevo.listIds.includes(ownersNews))
            return [{ kind: 'remove_from_news', listId: ownersNews }];
        return [{ kind: 'skip', reason: 'opted out and not in owners-news' }];
    }
    // Moonbase newsletter contacts without a licence are prospects, not owners: the website
    // DOI form handles those, so we don't add them to owner lists here.
    if (!isOwner) return [{ kind: 'skip', reason: 'not an owner' }];
    return planForOwner({ ...cfg, lists: { ...cfg.lists, ownersService: undefined } }, prefs, brevo).filter(
        (a) => !(a.kind === 'skip' && a.reason === 'BREVO_LIST_OWNERS_SERVICE not set')
    );
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
