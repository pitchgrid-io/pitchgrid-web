/**
 * Single source of truth for the price and trial wording shown on the site.
 *
 * The actual price is set in Moonbase; when it changes (e.g. with the unified
 * plugin release), change PRICE_AMOUNT here and every CTA, the /buy page and
 * the /download trial box follow. Do not hard-code prices in pages.
 */
export const PRICE_AMOUNT = 42;

/** Same number in all three currencies (Moonbase prices €, $ and £ identically). */
export const PRICE_LABEL = `€${PRICE_AMOUNT}`; // buttons: "Buy €42 — one-time license"
export const PRICE_LABEL_ALL = `${PRICE_AMOUNT} €/$/£`; // fine print, /buy

export const TRIAL_DAYS = 14;

/**
 * Optional one-liner shown under the buy CTAs (hero, final CTA, /download).
 * Empty = hidden. Example for before the unified release:
 *   'Current price. It goes up with the unified release (plugin + Mapper + synth in one).'
 */
export const PRICE_NOTE = '';
