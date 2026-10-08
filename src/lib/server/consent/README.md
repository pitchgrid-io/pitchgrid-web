# Consent sync: Moonbase ⇄ Brevo

Nothing here does anything until it is configured. Without the env vars below the routes answer
503 / no-op. With them set but write flags off, they only log what they would do.

| Route | Called by | Does |
|---|---|---|
| `POST /api/moonbase/webhook` | Moonbase webhook (`OrderCompleted`, `CustomerSubscribed`, `CustomerUnsubscribed`) | Buyer → owners-service (list 5). If Moonbase `newsletterOptIn` or `productUpdatesOptIn` is true → also owners-news (list 8) directly, no DOI. Contacts blacklisted or unsubscribed (any list) in Brevo are never (re-)added. Opt-out in Moonbase (both flags off) → removed from owners-news. |
| `POST /api/brevo/webhook?token=…` | Brevo marketing webhook (`unsubscribe`, `spam`) | PATCH Moonbase `communicationPreferences.newsletterOptIn=false` for that customer. |

Env (Vercel):

- `MOONBASE_WEBHOOK_SECRET`: secret of the Moonbase webhook (HMAC-SHA256, header `X-Signature`)
- `MOONBASE_API_KEY`, optional `MOONBASE_BASE_URL` (default `https://pitchgrid.moonbase.sh`)
- `BREVO_API_KEY`
- `BREVO_LIST_OWNERS_SERVICE=5` ("PitchGrid owners (service only)": all owners incl. granted licences)
- `BREVO_LIST_OWNERS_NEWS=8` ("PitchGrid owners-news")
- `BREVO_LIST_PROSPECTS=6`
  (these are also the code defaults when the vars are unset)
- `BREVO_WEBHOOK_SECRET`: shared token for the Brevo webhook URL
- Write gates, all default off:
  - `CONSENT_SYNC_WRITES=true`: Brevo list writes
  - `MOONBASE_PREFS_WRITE=true`: Brevo unsubscribe → Moonbase newsletterOptIn=false
    (productUpdatesOptIn is never written: undocumented in the Core API, and both Moonbase
    toggles are hidden in our embed, so Brevo is the only place consent is managed)

This code sends no email. `CONSENT_SYNC_DOI`, `BREVO_CONFIRMED_LIST_IDS` and `BREVO_DOI_TEMPLATE_ID_OWNERS_NEWS` /
`BREVO_DOI_REDIRECT_URL_OWNERS_NEWS` are no longer read (double opt-in is not a gate since 2026-10-08).

Tests: `npm run test:consent`. Backfill (counts only, GET requests only): `npm run backfill:owners:dry-run`
reports how many owners would be upserted into list 5 and added to list 8 directly. Set `BREVO_API_KEY`
for exact numbers (otherwise blacklist/unsubscribe state is unknown and the list-8 count is an upper bound).
A real backfill needs Peter's OK; there is no write mode.

Moonbase's own Newsletter / Product updates checkboxes are hidden in our embed
(`communicationPreferences.show` in `src/lib/shop/moonbaseEmbed.ts`). Pages hosted on
pitchgrid.moonbase.sh (checkout, manage-preferences) are not affected by that option.

Legal: no UWG §7(3) existing-customer exception (Lex, 2026-10-08). owners-service gets service content only.
owners-news needs an opt-in (a Moonbase flag); owner decision 2026-10-08: no DOI gate. To be confirmed by Lex:
whether Moonbase's opt-in wording and record are enough proof. Nothing here sets OPT_IN / DOUBLE_OPT-IN attributes. `PURCHASED=true` is set only for a real paid order
(amount > 0, not fully refunded), never for €0 coupon orders or granted licences, and is never cleared by this code.
