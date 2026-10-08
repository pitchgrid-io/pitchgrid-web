import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CONSENT_TEXT_VERSION, KNOWN_CONSENT_VERSIONS, PACK_PAGE } from '$lib/consent/signupCopy';
import {
    alreadyConfirmed,
    isBlocked,
    readSubscribeConfig,
    sanitizePage,
    signConfirmToken,
    signupAttributes,
    type BrevoContactLite,
    type ConsentProof
} from '$lib/server/subscribe/logic';

/*
 * Newsletter / Tuning Pack signup. Decided 2026-10-08: double opt-in is no longer a gate.
 *
 * Submitting the form is the consent (no checkbox). We create or update the contact in Brevo and
 * add it to the prospects list right away. Blacklisted / unsubscribed contacts are never re-added:
 * they get the same neutral success and nothing changes. An optional confirmation email
 * (off by default) is measurement only; see ./confirm/+server.ts.
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   BREVO_API_KEY              Brevo v3 API key (secret)
 *   BREVO_LIST_PROSPECTS       prospects list id, default 6
 *   SUBSCRIBE_CONFIRM_EMAIL    "true" to send the confirmation email (default off)
 *   BREVO_CONFIRM_TEMPLATE_ID  transactional template with {{ params.CONFIRM_URL }}; unset = no email
 *   SUBSCRIBE_CONFIRM_SECRET   HMAC secret for the confirm link; unset = no email
 *   BREVO_PROOF_ATTRIBUTES     optional, comma list of proof attributes created in Brevo
 *                              (CONSENT_AT, CONSENT_URL, CONSENT_TEXT_VERSION, DOI_CONFIRMED, DOI_CONFIRMED_AT)
 *
 * Process.env is used (not $env/static/private) so the build works without the vars.
 * Never log email addresses: logs carry the Brevo contact id only.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(['home', 'download', 'footer', 'confirmed', 'other']);
const BREVO = 'https://api.brevo.com/v3';

/** Same answer for real signups, bots (honeypot) and blocked contacts. */
const neutralSuccess = () =>
    json({ success: true, message: "You're on the list. Here's your Tuning Pack:", packUrl: PACK_PAGE });

export const POST: RequestHandler = async ({ request, url }) => {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const cfg = readSubscribeConfig(process.env);
    if (!apiKey) {
        console.error('subscribe: BREVO_API_KEY missing');
        return json({ error: 'Signup is temporarily unavailable. Please email peter@pitchgrid.io.' }, { status: 503 });
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request' }, { status: 400 });
    }

    // Honeypot: real users never see or fill this field. Pretend success for bots.
    if (typeof body.website === 'string' && body.website.trim() !== '') return neutralSuccess();

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
        return json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const source = typeof body.source === 'string' && SOURCES.has(body.source) ? body.source : 'other';
    const textVersion =
        typeof body.consentVersion === 'string' && KNOWN_CONSENT_VERSIONS.includes(body.consentVersion)
            ? body.consentVersion
            : CONSENT_TEXT_VERSION;
    const proof: ConsentProof = {
        source: `web:${source}`,
        at: new Date().toISOString(),
        page: sanitizePage(body.page, url.origin) ?? sanitizePage(request.headers.get('referer'), url.origin),
        textVersion
    };

    const headers = { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' };

    try {
        // 1. Existing contact? Blocked ones are never touched.
        const got = await fetch(`${BREVO}/contacts/${encodeURIComponent(email)}`, { headers });
        let existing: BrevoContactLite = null;
        if (got.ok) existing = await got.json();
        else if (got.status !== 404) {
            console.error('subscribe: Brevo lookup error', got.status);
            return json({ error: 'Signup failed. Please try again or email peter@pitchgrid.io.' }, { status: 502 });
        }
        if (isBlocked(existing)) {
            console.info(JSON.stringify({ event: 'subscribe.blocked', contactId: existing?.id ?? null, source: proof.source }));
            return neutralSuccess();
        }

        // 2. Create or update + add to prospects list. No DOI endpoint.
        const res = await fetch(`${BREVO}/contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                email,
                attributes: signupAttributes(cfg, proof, { name, ck1: body.ck1 === true }),
                listIds: [cfg.prospectsListId],
                updateEnabled: true
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('subscribe: Brevo create error', res.status, err?.code);
            return json({ error: 'Signup failed. Please try again or email peter@pitchgrid.io.' }, { status: 502 });
        }
        const created = res.status === 201 ? await res.json().catch(() => ({})) : {};
        const contactId: number | undefined = created?.id ?? existing?.id;

        // 3. Proof of consent, server-side (no email address).
        console.info(
            JSON.stringify({ event: 'subscribe.consent', contactId: contactId ?? null, new: !existing, listId: cfg.prospectsListId, ...proof })
        );

        // 4. Optional confirmation email: measurement only, failures never affect the signup.
        if (cfg.confirmEmailEnabled && contactId && !alreadyConfirmed(existing)) {
            try {
                const token = await signConfirmToken(cfg.confirmSecret!, contactId);
                const sent = await fetch(`${BREVO}/smtp/email`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        to: [{ email }],
                        templateId: cfg.confirmTemplateId,
                        params: { CONFIRM_URL: `${url.origin}/api/subscribe/confirm?t=${encodeURIComponent(token)}` },
                        tags: ['subscribe-confirm']
                    })
                });
                if (!sent.ok) console.error('subscribe: confirm email error', sent.status, 'contact', contactId);
            } catch (err) {
                console.error('subscribe: confirm email network error', contactId, err);
            }
        }

        return neutralSuccess();
    } catch (err) {
        console.error('subscribe: network error', err);
        return json({ error: 'Signup failed. Please try again.' }, { status: 502 });
    }
};
