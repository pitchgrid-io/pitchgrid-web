import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/*
 * Newsletter / Tuning Pack signup with Brevo double opt-in (DOI).
 *
 * The browser never sees the API key: forms POST here, and we call Brevo's
 * DOI endpoint. Brevo emails a confirmation link (template BREVO_DOI_TEMPLATE_ID,
 * tagged "optin", containing {{ doubleoptin }}). Only after the click is the
 * contact added to BREVO_LIST_ID and sent to /tuning-pack/confirmed, which
 * hands out the Tuning Pack download.
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   BREVO_API_KEY           Brevo v3 API key (secret)
 *   BREVO_LIST_ID           list to add confirmed contacts to ("PitchGrid Emails" = 2)
 *   BREVO_DOI_TEMPLATE_ID   DOI confirmation template ("PitchGrid DOI - Tuning Pack signup" = 3)
 *   BREVO_DOI_REDIRECT_URL  optional; defaults to <site origin>/tuning-pack/confirmed
 *
 * Process.env is used (not $env/static/private) so the build works without the vars.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(['home', 'download', 'footer', 'confirmed', 'other']);

export const POST: RequestHandler = async ({ request, url }) => {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const listId = Number.parseInt(process.env.BREVO_LIST_ID?.trim() ?? '', 10);
    const templateId = Number.parseInt(process.env.BREVO_DOI_TEMPLATE_ID?.trim() ?? '', 10);
    const redirectionUrl =
        process.env.BREVO_DOI_REDIRECT_URL?.trim() || `${url.origin}/tuning-pack/confirmed`;

    if (!apiKey || !Number.isFinite(listId) || !Number.isFinite(templateId)) {
        console.error('subscribe: BREVO_API_KEY, BREVO_LIST_ID or BREVO_DOI_TEMPLATE_ID missing');
        return json({ error: 'Signup is temporarily unavailable. Please email peter@pitchgrid.io.' }, { status: 503 });
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request' }, { status: 400 });
    }

    // Honeypot: real users never see or fill this field. Pretend success for bots.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
        return json({ success: true, message: 'Almost there — check your inbox to confirm.' });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
        return json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (body.consent !== true) {
        return json({ error: 'Please tick the consent box to subscribe.' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const source = typeof body.source === 'string' && SOURCES.has(body.source) ? body.source : 'other';

    // Attributes are applied when the contact confirms. CK1_WAITLIST is only ever
    // set to true here, so a later signup without the box doesn't clear it.
    const attributes: Record<string, string | boolean> = { SIGNUP_SOURCE: `web:${source}` };
    if (name) attributes.FIRSTNAME = name;
    if (body.ck1 === true) attributes.CK1_WAITLIST = true;

    try {
        const res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'content-type': 'application/json',
                accept: 'application/json'
            },
            body: JSON.stringify({
                email,
                includeListIds: [listId],
                templateId,
                redirectionUrl,
                attributes
            })
        });

        // 201 = new DOI contact, 204 = existing contact updated; both send the confirmation mail.
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('subscribe: Brevo DOI error', res.status, err?.code, err?.message);
            return json({ error: 'Signup failed. Please try again or email peter@pitchgrid.io.' }, { status: 502 });
        }

        return json({
            success: true,
            message: 'Almost there — check your inbox and click the confirmation link to get the Tuning Pack.'
        });
    } catch (err) {
        console.error('subscribe: network error', err);
        return json({ error: 'Signup failed. Please try again.' }, { status: 502 });
    }
};
