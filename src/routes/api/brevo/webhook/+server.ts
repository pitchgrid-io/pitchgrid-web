import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isBrevoOptOutEvent, moonbaseOptOutPatch, readConfig, safeEqual } from '$lib/server/consent/logic';
import { DownstreamError, moonbaseClient } from '$lib/server/consent/clients';

/*
 * Brevo marketing webhook receiver (events "unsubscribe" and "spam",
 * https://developers.brevo.com/docs/marketing-webhooks). Brevo is the source of truth for
 * unsubscribes, so an opt-out there switches the buyer's Moonbase preference off.
 *
 * Auth: Brevo does not sign marketing webhooks. Register the URL with ?token=<BREVO_WEBHOOK_SECRET>
 * (or send it as "Authorization: Bearer <secret>"). Without the secret the route answers 503.
 *
 * Write: PATCH /api/customers/{id} {"communicationPreferences":{"newsletterOptIn":false}}, the only
 * preference field the Core API documents for PATCH. productUpdatesOptIn is not written (not
 * documented; both Moonbase toggles are hidden in our embed, Brevo is the source of truth).
 * Nothing is written unless MOONBASE_PREFS_WRITE=true. Opt-in events are never mirrored back.
 * Non-customers (footer prospects) are ignored: 404 from Moonbase => 200 no-op.
 */
export const POST: RequestHandler = async ({ request, url }) => {
    const secret = process.env.BREVO_WEBHOOK_SECRET?.trim();
    if (!secret) return json({ error: 'not configured' }, { status: 503 });
    const given = url.searchParams.get('token') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!safeEqual(given, secret)) return json({ error: 'unauthorized' }, { status: 401 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'invalid json' }, { status: 400 });
    }
    // Brevo may batch events in an array.
    const events = (Array.isArray(body) ? body : [body]) as Array<{ event?: string; email?: string }>;

    const cfg = readConfig(process.env);
    const mbKey = process.env.MOONBASE_API_KEY?.trim();
    const moonbase = mbKey ? moonbaseClient(mbKey, process.env.MOONBASE_BASE_URL?.trim() || undefined) : null;

    const results: string[] = [];
    try {
        for (const e of events) {
            if (!isBrevoOptOutEvent(e?.event) || !e?.email) { results.push(`ignored:${e?.event ?? '?'}`); continue; }
            if (!moonbase) { results.push('skipped:no MOONBASE_API_KEY'); continue; }
            const customer = await moonbase.getCustomer(e.email.trim().toLowerCase());
            if (!customer) { results.push('skipped:not a Moonbase customer'); continue; }
            if (!customer.prefs.newsletterOptIn) { results.push('noop:already off'); continue; }
            if (!cfg.moonbasePrefsWrite) { results.push('dry-run:MOONBASE_PREFS_WRITE not true'); continue; }
            await moonbase.patchPrefs(customer.id, moonbaseOptOutPatch());
            results.push('done:moonbase prefs off');
        }
    } catch (err) {
        if (err instanceof DownstreamError) {
            console.error('brevo-webhook', err.message);
            return json({ error: 'downstream error' }, { status: err.retryable ? 503 : 502 });
        }
        console.error('brevo-webhook', (err as Error).message);
        return json({ error: 'internal error' }, { status: 500 });
    }
    console.info('brevo-webhook', results.join(', '));
    return json({ ok: true, results });
};
