# [pitchgrid.io](https://pitchgrid.io)

This is the repo of the PitchGrid website.

PitchGrid is a new unifying approach to non-traditional intonations, enabling interactive, real time scale creation, tuning and mapping.

## Development

Clone, install dependencies with `npm install` and start a development server:

```bash
npm run dev -- --open
```

## Hosting

This app is hosted via Vercel at [pitchgrid.io](https://pitchgrid.io). Deploy by pushing to the main branch or using the Vercel CLI.

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Value | Used by |
| --- | --- | --- |
| `BREVO_API_KEY` | Brevo v3 API key (secret, server-only) | `src/routes/api/subscribe/+server.ts` |
| `BREVO_LIST_PROSPECTS` | optional, default `6` («PitchGrid prospects») | `src/routes/api/subscribe/+server.ts` |
| `SUBSCRIBE_CONFIRM_EMAIL` | `true` to send the confirmation email; **off by default** | same |
| `BREVO_CONFIRM_TEMPLATE_ID` | transactional template id with `{{ params.CONFIRM_URL }}`; unset = no email | same |
| `SUBSCRIBE_CONFIRM_SECRET` | random secret (e.g. `openssl rand -base64 32`) signing the confirm link; unset = no email | same + `src/routes/api/subscribe/confirm/+server.ts` |
| `BREVO_PROOF_ATTRIBUTES` | optional comma list of proof attributes once created in Brevo: `CONSENT_AT`, `CONSENT_URL`, `CONSENT_TEXT_VERSION`, `DOI_CONFIRMED`, `DOI_CONFIRMED_AT` | same |

Without `BREVO_API_KEY`, `/api/subscribe` answers 503 and the forms show a friendly error. The key never reaches the browser. `BREVO_LIST_ID`, `BREVO_DOI_TEMPLATE_ID` and `BREVO_DOI_REDIRECT_URL` are no longer used by the signup.

## Price and trial wording

`src/lib/shop/pricing.ts` is the only place with the price (`PRICE_AMOUNT`) and trial length. All CTAs, `/buy` and `/download` read from it. The real price is set in Moonbase; change both together. `PRICE_NOTE` (empty by default) adds a one-line note under the buy buttons, e.g. ahead of a price change.

## Mailing list (signup)

The footer form (`src/lib/components/Newsletter.svelte`, on every page) POSTs to `/api/subscribe`. Submitting the form is the consent (no checkbox; button, consent line and success message come from `src/lib/consent/signupCopy.ts`, bump `CONSENT_TEXT_VERSION` when the wording changes). The endpoint creates or updates the Brevo contact and adds it to the prospects list right away; the form then shows "You're on the list." Contacts that Brevo has blacklisted or that unsubscribed from any list are never re-added: they get the same neutral success and nothing changes.

Attributes written (all exist in Brevo): `SIGNUP_SOURCE` (`web:footer`, …), `OPT_IN=true`, `FIRSTNAME` (if given), `CK1_WAITLIST=true` if a form sends `ck1: true` (no current form does; never set to false). Proof of consent (form, timestamp, page URL, consent text version) is logged server-side as `subscribe.consent` with the Brevo contact id, never the email, and written to `CONSENT_AT`, `CONSENT_URL` and `CONSENT_TEXT_VERSION` (Brevo text attributes) when they are listed in `BREVO_PROOF_ATTRIBUTES`.

Optional confirmation email (measurement only): with `SUBSCRIBE_CONFIRM_EMAIL=true`, `BREVO_CONFIRM_TEMPLATE_ID` and `SUBSCRIBE_CONFIRM_SECRET` set, new or unconfirmed contacts get a transactional email whose link `/api/subscribe/confirm?t=<HMAC token with the contact id>` sets Brevo's `DOUBLE_OPT-IN=Yes` (plus `DOI_CONFIRMED=true` / `DOI_CONFIRMED_AT` when listed) and redirects to `/newsletter/confirmed?via=email` (invalid or expired links go to the homepage). List membership never depends on the click. Mail scanners may open links automatically, so read click rates as an upper bound.

Retired page URLs redirect permanently (308) to `/` and `/newsletter/confirmed`, same mechanism as `/datenschutz`: a route with only a `+page.ts` whose load calls `redirect()`.

Tests: `npm run test:subscribe`.

## Campaign links (UTM)

Tag every link in a newsletter, video description or post, e.g.

```
https://pitchgrid.io/?utm_source=newsletter&utm_medium=email&utm_campaign=2026-10
https://pitchgrid.io/download?utm_source=youtube&utm_medium=video&utm_campaign=move-demo
https://pitchgrid.io/buy?utm_source=newsletter&utm_medium=email&utm_campaign=2026-10
```

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` and `utm_referrer` are carried from the landing page onto the Try/Buy buttons (no cookies or storage) and the "Continue to checkout" button on `/buy` (a pre-checkout page, no auto-forward) passes them to the Moonbase checkout, which records them on each order and can run UTM-only discounts. Plausible shows the same params on page views.

## Acknowledgements

I am using the magical SvelteKit, thank you Rich Harris! 

## Support

[Buy me a coffee](https://buymeacoffee.com/peterjungx)

## Contribute

Just do your pull requests

