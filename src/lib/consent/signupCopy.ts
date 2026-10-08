/*
 * Signup consent copy (shared by the forms and /api/subscribe).
 * The form itself is the consent: no checkbox. Submitting adds the address to the mailing list.
 * Bump CONSENT_TEXT_VERSION whenever CONSENT_TEXT or a button label changes, so the recorded
 * proof says exactly which wording someone agreed to. Old versions stay in KNOWN_CONSENT_VERSIONS.
 */
export const CONSENT_TEXT =
    'News about PitchGrid and the free Tuning Pack. Unsubscribe anytime with the link in every email.';
export const CONSENT_TEXT_VERSION = '2026-10-08-v1';
export const KNOWN_CONSENT_VERSIONS: readonly string[] = [CONSENT_TEXT_VERSION];

export const BUTTON_NEWSLETTER = 'Join the mailing list';
export const BUTTON_TUNING_PACK = 'Get the Tuning Pack';

/** Where the pack is handed out (also the landing page of the optional confirmation email). */
export const PACK_PAGE = '/tuning-pack/confirmed';
