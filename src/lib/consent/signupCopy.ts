/*
 * Signup consent copy (shared by the forms and /api/subscribe).
 * The form itself is the consent: no checkbox. Submitting adds the address to the mailing list.
 * Bump CONSENT_TEXT_VERSION whenever CONSENT_TEXT or a button label changes, so the recorded
 * proof says exactly which wording someone agreed to. Old versions stay in KNOWN_CONSENT_VERSIONS.
 */
export const CONSENT_TEXT = 'News about PitchGrid. Unsubscribe anytime with the link in every email.';
export const CONSENT_TEXT_VERSION = '2026-10-08-v2';
/** v1 = previous wording incl. a free download offer (retired 2026-10-08; text in git history, commit 9ad9bca). */
export const KNOWN_CONSENT_VERSIONS: readonly string[] = ['2026-10-08-v1', CONSENT_TEXT_VERSION];

export const BUTTON_NEWSLETTER = 'Join the mailing list';
export const SUCCESS_MESSAGE = "You're on the list.";

/** Landing page of the optional confirmation email link. */
export const CONFIRMED_PAGE = '/newsletter/confirmed';
