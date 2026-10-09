import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CONFIRMED_PAGE } from '$lib/consent/signupCopy';
import { confirmAttributes, readSubscribeConfig, verifyConfirmToken } from '$lib/server/subscribe/logic';

/*
 * Link in the optional confirmation email: /api/subscribe/confirm?t=<signed token>.
 * Measurement only. A valid token sets DOUBLE_OPT-IN=Yes on the Brevo contact (plus DOI_CONFIRMED /
 * DOI_CONFIRMED_AT once created and listed in BREVO_PROOF_ATTRIBUTES). It never changes lists:
 * the contact was added when the form was submitted. Valid links land on /newsletter/confirmed,
 * invalid or expired ones on the homepage.
 * Note: some mail security scanners open links automatically, so treat clicks as an upper bound.
 */
export const GET: RequestHandler = async ({ url }) => {
    const cfg = readSubscribeConfig(process.env);
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const verified = await verifyConfirmToken(cfg.confirmSecret, url.searchParams.get('t'));

    if (verified && apiKey) {
        try {
            const res = await fetch(`https://api.brevo.com/v3/contacts/${verified.contactId}?identifierType=contact_id`, {
                method: 'PUT',
                headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify({ attributes: confirmAttributes(cfg, new Date().toISOString()) })
            });
            if (!res.ok) console.error('subscribe/confirm: Brevo update error', res.status, 'contact', verified.contactId);
            else console.info(JSON.stringify({ event: 'subscribe.confirmed', contactId: verified.contactId }));
        } catch (err) {
            console.error('subscribe/confirm: network error', verified.contactId, err);
        }
    } else if (!verified) {
        console.info(JSON.stringify({ event: 'subscribe.confirm_invalid' }));
    }

    redirect(303, verified ? `${CONFIRMED_PAGE}?via=email` : '/');
};
