/*
 * Thin Brevo v3 and Moonbase Core API clients for the consent sync.
 * Reads are always allowed; every write goes through `execute()`, which is a no-op
 * unless CONSENT_SYNC_WRITES=true. Nothing here sends email.
 */
import type { Action, BrevoContactState, ConsentConfig, MoonbasePrefs } from './logic';
import { isRetryable } from './logic';

export class DownstreamError extends Error {
    constructor(
        public service: 'brevo' | 'moonbase',
        public status: number,
        message: string
    ) {
        super(`${service} ${status}: ${message}`);
    }
    get retryable() {
        return isRetryable(this.status);
    }
}

const BREVO = 'https://api.brevo.com/v3';

async function call(
    service: 'brevo' | 'moonbase',
    url: string,
    init: RequestInit,
    okStatuses: number[] = []
): Promise<Response> {
    let res: Response;
    try {
        res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    } catch (err) {
        throw new DownstreamError(service, 0, (err as Error).message);
    }
    if (!res.ok && !okStatuses.includes(res.status)) {
        const body = await res.json().catch(() => ({}));
        // Log codes only, never the e-mail address.
        throw new DownstreamError(service, res.status, String(body?.code ?? body?.title ?? res.statusText));
    }
    return res;
}

export function brevoClient(apiKey: string) {
    const headers = { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json' };
    return {
        async getContact(email: string): Promise<BrevoContactState> {
            const res = await call('brevo', `${BREVO}/contacts/${encodeURIComponent(email)}?identifierType=email_id`, { headers }, [404]);
            if (res.status === 404) return { exists: false };
            const c = await res.json();
            return {
                exists: true,
                listIds: Array.isArray(c.listIds) ? c.listIds : [],
                emailBlacklisted: !!c.emailBlacklisted,
                listUnsubscribed: Array.isArray(c.listUnsubscribed) ? c.listUnsubscribed : []
            };
        },
        /** Create or update; adds to listIds, never touches blacklist / opt-in attributes. */
        async upsertToList(email: string, listId: number, attributes: Record<string, unknown>) {
            await call('brevo', `${BREVO}/contacts`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ email, listIds: [listId], attributes, updateEnabled: true })
            });
        },
        async addToList(email: string, listId: number) {
            await call('brevo', `${BREVO}/contacts/lists/${listId}/contacts/add`, {
                method: 'POST', headers, body: JSON.stringify({ emails: [email] })
            }, [400]); // 400 = already in list
        },
        async removeFromList(email: string, listId: number) {
            await call('brevo', `${BREVO}/contacts/lists/${listId}/contacts/remove`, {
                method: 'POST', headers, body: JSON.stringify({ emails: [email] })
            }, [400]); // 400 = not in list
        },
    };
}
export type BrevoClient = ReturnType<typeof brevoClient>;

export function moonbaseClient(apiKey: string, baseUrl = 'https://pitchgrid.moonbase.sh') {
    const headers = { 'Api-Key': apiKey, accept: 'application/json', 'content-type': 'application/json' };
    return {
        /** GET /api/customers/{id|email}. Returns null on 404. */
        async getCustomer(idOrEmail: string): Promise<{ id: string; email: string; isOwner: boolean; prefs: MoonbasePrefs } | null> {
            const res = await call('moonbase', `${baseUrl}/api/customers/${encodeURIComponent(idOrEmail)}`, { headers }, [404]);
            if (res.status === 404) return null;
            const c = await res.json();
            const cp = c.communicationPreferences ?? {};
            return {
                id: c.id,
                email: c.email,
                isOwner: Array.isArray(c.ownedProducts) && c.ownedProducts.length > 0,
                prefs: { newsletterOptIn: !!cp.newsletterOptIn, productUpdatesOptIn: !!cp.productUpdatesOptIn }
            };
        },
        /** PATCH /api/customers/{id} (documented field: communicationPreferences.newsletterOptIn). */
        async patchPrefs(id: string, body: { communicationPreferences: Partial<MoonbasePrefs> }) {
            await call('moonbase', `${baseUrl}/api/customers/${encodeURIComponent(id)}`, {
                method: 'PATCH', headers, body: JSON.stringify(body)
            });
        }
    };
}
export type MoonbaseClient = ReturnType<typeof moonbaseClient>;

export type ExecResult = { action: Action; done: boolean; note?: string };

/** Apply planned actions to Brevo. Dry-run unless cfg.writesEnabled. */
export async function execute(
    cfg: ConsentConfig,
    brevo: BrevoClient | null,
    email: string,
    actions: Action[]
): Promise<ExecResult[]> {
    const out: ExecResult[] = [];
    for (const action of actions) {
        if (action.kind === 'skip') { out.push({ action, done: false, note: action.reason }); continue; }
        if (!cfg.writesEnabled || !brevo) { out.push({ action, done: false, note: 'dry-run (CONSENT_SYNC_WRITES not true)' }); continue; }
        switch (action.kind) {
            case 'upsert_owner_service':
                // PURCHASED (existing Brevo attribute) only for a real paid order; never cleared here.
                // No OPT_IN / DOUBLE_OPT-IN or other consent attributes.
                await brevo.upsertToList(email, action.listId, action.purchased ? { PURCHASED: true } : {});
                break;
            case 'add_to_news':
                await brevo.addToList(email, action.listId);
                break;
            case 'remove_from_news':
                await brevo.removeFromList(email, action.listId);
                break;
        }
        out.push({ action, done: true });
    }
    return out;
}
