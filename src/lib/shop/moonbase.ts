/** Our Moonbase account (hosted portal, and the URL the embedded storefront is set up with). */
export const MOONBASE_STOREFRONT_URL = 'https://pitchgrid.moonbase.sh';

/** Moonbase product id of the plugin (verified against /api/customer/storefront). */
export const MOONBASE_PRODUCT_ID = 'pitchgrid-plugin';

/** Hosted Moonbase checkout. Shopify is gone. */
export const MOONBASE_BUY_URL = 'https://pitchgrid.moonbase.sh/buy/pitchgrid-plugin';

/** Hosted portal pages, used as no-JS fallbacks for the embedded storefront's panels. */
export const MOONBASE_LOGIN_URL = 'https://pitchgrid.moonbase.sh/log-in';
export const MOONBASE_RESET_URL = 'https://pitchgrid.moonbase.sh/forgot-password';

// Price/trial wording lives in ./pricing.ts; re-exported for convenience.
export { PRICE_AMOUNT, PRICE_LABEL, PRICE_LABEL_ALL, TRIAL_DAYS } from './pricing';

/**
 * Query params we carry from a landing URL (e.g. a newsletter link) through
 * /download and /buy to the Moonbase checkout. Moonbase records all of them on
 * the order and can apply UTM-targeted discounts:
 * https://moonbase.sh/docs/guides/marketing-revenue-tracking/
 */
export const PASSTHROUGH_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_referrer'
] as const;

/** The passthrough params present in `search` (a query string or URLSearchParams). */
export function pickPassthrough(search: string | URLSearchParams): URLSearchParams {
    const from = typeof search === 'string' ? new URLSearchParams(search) : search;
    const out = new URLSearchParams();
    for (const key of PASSTHROUGH_PARAMS) {
        const value = from.get(key);
        if (value) out.set(key, value.slice(0, 200));
    }
    return out;
}

/** `href` with the passthrough params from `search` appended (existing params on `href` win). */
export function withPassthrough(href: string, search: string | URLSearchParams): string {
    const params = pickPassthrough(search);
    if ([...params.keys()].length === 0) return href;
    const url = new URL(href, 'https://pitchgrid.io');
    for (const [key, value] of params) {
        if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    const isAbsolute = /^https?:\/\//.test(href);
    return isAbsolute ? url.toString() : url.pathname + url.search + url.hash;
}

/** Moonbase checkout URL carrying the UTM params from `search`. */
export function moonbaseBuyUrl(search: string | URLSearchParams = ''): string {
    return withPassthrough(MOONBASE_BUY_URL, search);
}
