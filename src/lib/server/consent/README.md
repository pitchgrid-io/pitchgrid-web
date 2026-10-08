# Consent sync: Moonbase ⇄ Brevo

Nothing here does anything until it is configured. Without the env vars below the routes answer
503 / no-op. With them set but write flags off, they only log what they would do.

| Route | Called by | Does |
|---|---|---|
| `POST /api/moonbase/webhook` | Moonbase webhook (`OrderCompleted`, `CustomerSubscribed`, `CustomerUnsubscribed`) | Buyer → owners-service. owners-news only via Brevo DOI, or by moving an already DOI-confirmed prospect. Opt-out in Moonbase (both flags off) → removed from owners-news. |
| `POST /api/brevo/webhook?token=…` | Brevo marketing webhook (`unsubscribe`, `spam`) | PATCH Moonbase `communicationPreferences.newsletterOptIn=false` for that customer. |

Env (Vercel):

- `MOONBASE_WEBHOOK_SECRET`: secret of the Moonbase webhook (HMAC-SHA256, header `X-Signature`)
- `MOONBASE_API_KEY`, optional `MOONBASE_BASE_URL` (default `https://pitchgrid.moonbase.sh`)
- `BREVO_API_KEY`
- `BREVO_LIST_OWNERS_SERVICE`, `BREVO_LIST_OWNERS_NEWS`, `BREVO_LIST_PROSPECTS`
- `BREVO_CONFIRMED_LIST_IDS`: optional, comma list of lists whose members are DOI-confirmed (default: prospects)
- `BREVO_DOI_TEMPLATE_ID_OWNERS_NEWS` (falls back to `BREVO_DOI_TEMPLATE_ID`), `BREVO_DOI_REDIRECT_URL_OWNERS_NEWS`
- `BREVO_WEBHOOK_SECRET`: shared token for the Brevo webhook URL
- Write gates, all default off:
  - `CONSENT_SYNC_WRITES=true`: Brevo list writes
  - `CONSENT_SYNC_DOI=true`: send DOI mails from the webhook (these e-mail customers)
  - `MOONBASE_PREFS_WRITE=true`: Brevo unsubscribe → Moonbase newsletterOptIn=false
  - `MOONBASE_PREFS_WRITE_PRODUCT_UPDATES=true`: also productUpdatesOptIn=false (undocumented in the Core API, needs Moonbase to confirm first)

Tests: `npm run test:consent`. Backfill (counts only, GET requests only): `npm run backfill:owners:dry-run`.

Legal: no UWG §7(3) existing-customer exception (Lex, 2026-10-08). owners-service gets service content only;
owners-news is opt-in + DOI only. Nothing here sets OPT_IN / DOUBLE_OPT-IN attributes.
