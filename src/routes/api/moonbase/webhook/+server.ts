import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isPaidOrder, planForOwner, planForPrefsChange, readConfig, verifyMoonbaseSignature, type Action } from '$lib/server/consent/logic';
import { brevoClient, DownstreamError, execute, moonbaseClient } from '$lib/server/consent/clients';

/*
 * Moonbase webhook receiver: keeps Brevo owner lists in line with purchases and Moonbase
 * communication preferences. See src/lib/server/consent/logic.ts for the list design.
 *
 * Events (https://moonbase.sh/docs/webhooks/):
 *   OrderCompleted        -> upsert buyer into owners-service (list 5); owners-news (list 8) only via
 *                            Brevo DOI (a Moonbase opt-in only triggers the DOI mail), or by moving a
 *                            member of a proven DOI list (BREVO_CONFIRMED_LIST_IDS, never 2/5/6).
 *                            Fully refunded orders skipped.
 *   CustomerSubscribed    -> payload has no preference fields, so re-read the customer
 *   CustomerUnsubscribed     (GET /api/customers/{id}) and reconcile owners-news.
 *   anything else         -> 200, ignored.
 *
 * Security: X-Signature = Base64(HMAC-SHA256(MOONBASE_WEBHOOK_SECRET, raw body)), upper-cased.
 * Without the secret the route answers 503 and does nothing.
 *
 * Writes: nothing is written to Brevo unless CONSENT_SYNC_WRITES=true; DOI mails additionally need
 * CONSENT_SYNC_DOI=true (they e-mail the customer). Until then the route only logs its plan.
 *
 * Retries: transient Brevo/Moonbase errors (network, 429, 5xx) return 503 so Moonbase can retry
 * (Moonbase does not document its retry policy). All actions are idempotent.
 *
 * TODO(legal): Lex's ruling of 2026-10-08: no UWG §7(3) existing-customer exception (Moonbase is
 * the seller and never offered buyers an objection). So owners-news is opt-in + DOI only, and
 * owners-service must only ever get service content. Revisit if checkout adds an objection notice.
 */

type MoonbasePayload = {
    eventType?: string;
    resource?: { type?: string; data?: Record<string, any> };
    customer?: { id?: string; email?: string; isDeleted?: boolean } | null;
};

export const POST: RequestHandler = async ({ request, url }) => {
    const secret = process.env.MOONBASE_WEBHOOK_SECRET?.trim();
    if (!secret) return json({ error: 'not configured' }, { status: 503 });

    const raw = await request.text();
    if (!(await verifyMoonbaseSignature(secret, raw, request.headers.get('x-signature')))) {
        return json({ error: 'invalid signature' }, { status: 401 });
    }

    let payload: MoonbasePayload;
    try {
        payload = JSON.parse(raw);
    } catch {
        return json({ error: 'invalid json' }, { status: 400 });
    }

    const event = payload.eventType ?? '';
    if (!['OrderCompleted', 'CustomerSubscribed', 'CustomerUnsubscribed'].includes(event)) {
        return json({ ok: true, ignored: event });
    }

    const cfg = readConfig(process.env);
    const brevoKey = process.env.BREVO_API_KEY?.trim();
    const mbKey = process.env.MOONBASE_API_KEY?.trim();
    if (!brevoKey || !mbKey) {
        console.warn('moonbase-webhook: BREVO_API_KEY or MOONBASE_API_KEY missing; nothing done', event);
        return json({ ok: true, skipped: 'api keys not configured' });
    }
    const brevo = brevoClient(brevoKey);
    const moonbase = moonbaseClient(mbKey, process.env.MOONBASE_BASE_URL?.trim() || undefined);

    try {
        const data = payload.resource?.data ?? {};
        if (payload.customer?.isDeleted) return json({ ok: true, skipped: 'customer deleted' });

        let email = '';
        let actions: Action[];
        if (event === 'OrderCompleted') {
            if (data.isFullyRefunded) return json({ ok: true, skipped: 'fully refunded' });
            email = String(payload.customer?.email ?? data.billingDetails?.email ?? '').trim().toLowerCase();
            if (!email) return json({ ok: true, skipped: 'no email on order' });
            const customer = await moonbase.getCustomer(payload.customer?.id || email);
            const contact = await brevo.getContact(email);
            actions = planForOwner(cfg, customer?.prefs ?? null, contact, isPaidOrder(data));
        } else {
            const id = payload.customer?.id ?? data.id;
            const customer = id ? await moonbase.getCustomer(String(id)) : null;
            email = String(customer?.email ?? payload.customer?.email ?? '').trim().toLowerCase();
            if (!email) return json({ ok: true, skipped: 'customer not found' });
            const contact = await brevo.getContact(email);
            actions = planForPrefsChange(cfg, customer?.prefs ?? null, contact, !!customer?.isOwner);
        }

        const results = await execute(cfg, brevo, email, actions, url.origin);
        // Log action kinds only, never the address.
        console.info('moonbase-webhook', event, results.map((r) => `${r.action.kind}:${r.done ? 'done' : r.note}`).join(', '));
        return json({ ok: true, event, results: results.map((r) => ({ kind: r.action.kind, done: r.done, note: r.note })) });
    } catch (err) {
        if (err instanceof DownstreamError) {
            console.error('moonbase-webhook', event, err.message);
            return json({ error: 'downstream error' }, { status: err.retryable ? 503 : 502 });
        }
        console.error('moonbase-webhook', event, (err as Error).message);
        return json({ error: 'internal error' }, { status: 500 });
    }
};
