# Consent sync: Moonbase ⇄ Brevo

Nothing here does anything until it is configured. Without the env vars below the routes answer
503 / no-op. With them set but write flags off, they only log what they would do.

| Route | Called by | Does |
|---|---|---|
| `POST /api/moonbase/webhook` | Moonbase webhook (`OrderCompleted`, `CustomerSubscribed`, `CustomerUnsubscribed`) | Buyer → owners-service (list 5). owners-news (list 8) only via Brevo DOI (a Moonbase opt-in just triggers the DOI mail), or by moving a member of a proven DOI list. Opt-out in Moonbase (both flags off) → removed from owners-news. |
| `POST /api/brevo/webhook?token=…` | Brevo marketing webhook (`unsubscribe`, `spam`) | PATCH Moonbase `communicationPreferences.newsletterOptIn=false` for that customer. |

Env (Vercel):

- `MOONBASE_WEBHOOK_SECRET`: secret of the Moonbase webhook (HMAC-SHA256, header `X-Signature`)
- `MOONBASE_API_KEY`, optional `MOONBASE_BASE_URL` (default `https://pitchgrid.moonbase.sh`)
- `BREVO_API_KEY`
- `BREVO_LIST_OWNERS_SERVICE=5` ("PitchGrid owners (service only)": all owners incl. granted licences; not DOI)
- `BREVO_LIST_OWNERS_NEWS=8` ("PitchGrid owners-news (DOI opt-in)")
- `BREVO_LIST_PROSPECTS=6`
  (these are also the code defaults when the vars are unset)
- `BREVO_CONFIRMED_LIST_IDS`: optional, comma list of lists whose members are *proven* double opt-in
  confirmations and may move into owners-news without a second DOI. Default empty. Never 2, 5 or 6:
  list 2 is mostly bulk imports and 5/6 were split from it; the code drops those ids even if set.
- `BREVO_DOI_TEMPLATE_ID_OWNERS_NEWS` (falls back to `BREVO_DOI_TEMPLATE_ID`), `BREVO_DOI_REDIRECT_URL_OWNERS_NEWS`
- `BREVO_WEBHOOK_SECRET`: shared token for the Brevo webhook URL
- Write gates, all default off:
  - `CONSENT_SYNC_WRITES=true`: Brevo list writes
  - `CONSENT_SYNC_DOI=true`: send DOI mails from the webhook (these e-mail customers)
  - `MOONBASE_PREFS_WRITE=true`: Brevo unsubscribe → Moonbase newsletterOptIn=false
    (productUpdatesOptIn is never written: undocumented in the Core API, and both Moonbase
    toggles are hidden in our embed, so Brevo is the only place consent is managed)

Tests: `npm run test:consent`. Backfill (counts only, GET requests only): `npm run backfill:owners:dry-run`.
The real DOI backfill for opted-in owners is on hold until the unified release and Peter's OK.

Moonbase's own Newsletter / Product updates checkboxes are hidden in our embed
(`communicationPreferences.show` in `src/lib/shop/moonbaseEmbed.ts`). Pages hosted on
pitchgrid.moonbase.sh (checkout, manage-preferences) are not affected by that option.

Legal: no UWG §7(3) existing-customer exception (Lex, 2026-10-08). owners-service gets service content only;
owners-news is opt-in + DOI only. Nothing here sets OPT_IN / DOUBLE_OPT-IN attributes.
