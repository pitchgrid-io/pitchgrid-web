/*
 * Website signup (Newsletter + Tuning Pack forms -> /api/subscribe). Pure logic, no network,
 * no SvelteKit imports, so it can be unit tested in plain Node.
 *
 * Decided 2026-10-08 (owner): double opt-in is NOT a gate any more.
 *  - Submitting the form adds the contact to the prospects list (6, BREVO_LIST_PROSPECTS) at once.
 *  - Contacts Brevo has blacklisted or that unsubscribed from any list are never re-added:
 *    the form answers with the same neutral success and nothing changes.
 *  - Optional confirmation email (SUBSCRIBE_CONFIRM_EMAIL=true, off by default) is measurement
 *    only: its link sets DOUBLE_OPT-IN=Yes (+ DOI_CONFIRMED / DOI_CONFIRMED_AT if created).
 *    List membership never depends on it.
 */

export type SubscribeConfig = {
    prospectsListId: number;
    /** SUBSCRIBE_CONFIRM_EMAIL=true and template + secret set. */
    confirmEmailEnabled: boolean;
    confirmTemplateId?: number;
    confirmSecret?: string;
    /** Optional proof attributes Peter has created in Brevo (BREVO_PROOF_ATTRIBUTES). */
    optionalAttributes: Set<string>;
};

export const DEFAULT_PROSPECTS_LIST = 6;
/** Attributes this code may write only once they exist in Brevo and are listed in BREVO_PROOF_ATTRIBUTES. */
export const OPTIONAL_ATTRIBUTES = [
    'CONSENT_AT',
    'CONSENT_URL',
    'CONSENT_TEXT_VERSION',
    'DOI_CONFIRMED',
    'DOI_CONFIRMED_AT'
] as const;

const int = (v: string | undefined): number | undefined => {
    const n = Number.parseInt((v ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function readSubscribeConfig(env: Record<string, string | undefined>): SubscribeConfig {
    const confirmTemplateId = int(env.BREVO_CONFIRM_TEMPLATE_ID);
    const confirmSecret = env.SUBSCRIBE_CONFIRM_SECRET?.trim() || undefined;
    const optional = new Set(
        (env.BREVO_PROOF_ATTRIBUTES ?? '')
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter((s) => (OPTIONAL_ATTRIBUTES as readonly string[]).includes(s))
    );
    return {
        prospectsListId: int(env.BREVO_LIST_PROSPECTS) ?? DEFAULT_PROSPECTS_LIST,
        confirmEmailEnabled:
            (env.SUBSCRIBE_CONFIRM_EMAIL ?? '').trim().toLowerCase() === 'true' && !!confirmTemplateId && !!confirmSecret,
        confirmTemplateId,
        confirmSecret,
        optionalAttributes: optional
    };
}

// ---------------------------------------------------------------- blocked contacts

export type BrevoContactLite = {
    id?: number;
    emailBlacklisted?: boolean;
    listUnsubscribed?: number[];
    attributes?: Record<string, unknown>;
} | null;

/** Blacklisted, or unsubscribed from any list: never re-add, change nothing. */
export function isBlocked(c: BrevoContactLite): boolean {
    return !!c && (c.emailBlacklisted === true || (Array.isArray(c.listUnsubscribed) && c.listUnsubscribed.length > 0));
}

/** Brevo's built-in DOUBLE_OPT-IN category: 1 = Yes, 2 = No. */
export function alreadyConfirmed(c: BrevoContactLite): boolean {
    const v = c?.attributes?.['DOUBLE_OPT-IN'];
    return v === 1 || v === '1' || v === 'Yes' || c?.attributes?.DOI_CONFIRMED === true;
}

// ---------------------------------------------------------------- proof of consent

export type ConsentProof = {
    source: string; // e.g. web:home
    at: string; // ISO timestamp, server time
    page: string | null; // origin + path of the form page, no query string
    textVersion: string;
};

/** Accept only an http(s) URL on the site's own host; keep origin + path (drop query/hash). */
export function sanitizePage(candidate: unknown, siteOrigin: string): string | null {
    if (typeof candidate !== 'string' || candidate.length > 2000) return null;
    try {
        const u = new URL(candidate);
        const site = new URL(siteOrigin);
        if (!/^https?:$/.test(u.protocol) || u.host !== site.host) return null;
        return `${u.origin}${u.pathname}`;
    } catch {
        return null;
    }
}

/**
 * Attributes sent to Brevo on signup. Only attributes that exist in Brevo (checked 2026-10-08):
 * SIGNUP_SOURCE, OPT_IN, FIRSTNAME, CK1_WAITLIST. CONSENT_* only if listed in BREVO_PROOF_ATTRIBUTES.
 * CK1_WAITLIST is only ever set to true, so a later signup without the box doesn't clear it.
 */
export function signupAttributes(
    cfg: SubscribeConfig,
    proof: ConsentProof,
    extra: { name?: string; ck1?: boolean }
): Record<string, string | boolean> {
    const a: Record<string, string | boolean> = { SIGNUP_SOURCE: proof.source, OPT_IN: true };
    if (extra.name) a.FIRSTNAME = extra.name;
    if (extra.ck1) a.CK1_WAITLIST = true;
    if (cfg.optionalAttributes.has('CONSENT_AT')) a.CONSENT_AT = proof.at;
    if (cfg.optionalAttributes.has('CONSENT_URL') && proof.page) a.CONSENT_URL = proof.page;
    if (cfg.optionalAttributes.has('CONSENT_TEXT_VERSION')) a.CONSENT_TEXT_VERSION = proof.textVersion;
    return a;
}

/** Attributes set when the confirmation link is clicked (measurement only). */
export function confirmAttributes(cfg: SubscribeConfig, at: string): Record<string, string | boolean | number> {
    const a: Record<string, string | boolean | number> = { 'DOUBLE_OPT-IN': 1 };
    if (cfg.optionalAttributes.has('DOI_CONFIRMED')) a.DOI_CONFIRMED = true;
    if (cfg.optionalAttributes.has('DOI_CONFIRMED_AT')) a.DOI_CONFIRMED_AT = at;
    return a;
}

// ---------------------------------------------------------------- signed confirm token

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
    return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
};

async function hmac(secret: string, data: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}

function safeEqual(a: string, b: string): boolean {
    const x = enc.encode(a);
    const y = enc.encode(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
    return diff === 0;
}

/** Token carries the Brevo contact id (no email in the URL) and the issue time. */
export async function signConfirmToken(secret: string, contactId: number, nowMs = Date.now()): Promise<string> {
    const payload = b64url(enc.encode(JSON.stringify({ c: contactId, t: Math.floor(nowMs / 1000) })));
    return `${payload}.${await hmac(secret, payload)}`;
}

export const CONFIRM_TOKEN_MAX_AGE_S = 60 * 60 * 24 * 60; // 60 days

export async function verifyConfirmToken(
    secret: string | undefined,
    token: string | null | undefined,
    nowMs = Date.now()
): Promise<{ contactId: number } | null> {
    if (!secret || !token || token.length > 500) return null;
    const [payload, sig, rest] = token.split('.');
    if (!payload || !sig || rest !== undefined) return null;
    if (!safeEqual(await hmac(secret, payload), sig)) return null;
    try {
        const { c, t } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
        if (!Number.isInteger(c) || c <= 0 || !Number.isInteger(t)) return null;
        const age = Math.floor(nowMs / 1000) - t;
        if (age < -300 || age > CONFIRM_TOKEN_MAX_AGE_S) return null;
        return { contactId: c };
    } catch {
        return null;
    }
}
