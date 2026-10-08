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
| `BREVO_LIST_ID` | `2` («PitchGrid Emails») | same |
| `BREVO_DOI_TEMPLATE_ID` | `3` («PitchGrid DOI - Tuning Pack signup», must be **active** in Brevo) | same |
| `BREVO_DOI_REDIRECT_URL` | optional, default `<origin>/tuning-pack/confirmed` | same |

Without the first three, `/api/subscribe` answers 503 and the forms show a friendly error. The key never reaches the browser.

## Price and trial wording

`src/lib/shop/pricing.ts` is the only place with the price (`PRICE_AMOUNT`) and trial length. All CTAs, `/buy` and `/download` read from it. The real price is set in Moonbase; change both together. `PRICE_NOTE` (empty by default) adds a one-line note under the buy buttons, e.g. ahead of a price change.

## Newsletter and Tuning Pack (double opt-in)

The signup forms (homepage, `/download`, `/tuning-pack`, footer) POST to `/api/subscribe`, which calls Brevo's DOI endpoint (`POST /v3/contacts/doubleOptinConfirmation`). Brevo emails the confirmation link; only after the click is the contact added to list 2 and redirected to `/tuning-pack/confirmed`, which links the pack. Attributes set on confirmation: `SIGNUP_SOURCE` (`web:home`, `web:download`, …), `FIRSTNAME` (footer form), `CK1_WAITLIST=true` if the CK1 box was ticked (never set to false).

The pack itself is `static/downloads/pitchgrid-tuning-pack.zip`, built by `node utility/tuning-pack/build-tuning-pack.mjs` from the PitchGrid preset table (`utility/tuning-pack/move-presets.json`, from move-anything-pitchgrid) and the guide `utility/tuning-pack/GUIDE.md`. The build is deterministic; rerun it after editing either file.

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

