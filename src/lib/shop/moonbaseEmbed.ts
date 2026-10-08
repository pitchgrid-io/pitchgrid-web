/**
 * Moonbase embedded storefront (https://moonbase.sh/docs/storefronts/embedded).
 *
 * Used for sign-in, forgot password, account, licenses and downloads on
 * pitchgrid.io, and to start checkout from /buy. Checkout always redirects to
 * Moonbase's hosted checkout (never the overlay iframe), so Apple Pay / Google
 * Pay are available on every device.
 *
 * Browser-only: initMoonbase() is called from the root layout's onMount, so SSR
 * and prerendering never touch it. Every element wired here keeps a plain href
 * to the hosted Moonbase page, which is what happens without JS, if
 * moonbase.js fails to load, or if the embed errors.
 *
 * Store mode is NOT switched here: Moonbase emails keep pointing at the hosted
 * portal until Peter OKs the switch to "Embedded widget" at launch. The embed
 * already handles ?mb_intent=... deep links on any page (it reads them from
 * the URL in setup()), so links for the embedded mode will work once switched.
 */
import { trackEvent } from '$lib/analytics';
import { MOONBASE_PRODUCT_ID, MOONBASE_STOREFRONT_URL } from './moonbase';

export const MOONBASE_SCRIPT_URL = 'https://assets.moonbase.sh/storefront/moonbase.js';

/**
 * Options for Moonbase.setup(). Names and values are the documented ones from
 * https://moonbase.sh/docs/storefronts/embedded ("Look & Feel", "Configure
 * options", "Checkout").
 */
export const MOONBASE_OPTIONS = {
    // Our own header link / page links open the panels; no floating toolbar.
    toolbar: { enabled: false },
    // 'always' = full-page redirect to the hosted checkout on every device.
    checkout: { redirect: 'always' },
    // No Moonbase sale banners/popups on the site; we present sales ourselves.
    promotions: { enabled: false },
    // Hide Moonbase's Newsletter and Product updates checkboxes (account panel, subscribe and
    // manage-preferences views). Brevo is the source of truth for marketing consent
    // (see src/lib/server/consent). Shape matches the bundle's defaults
    // (communicationPreferences.show.{newsletter,productUpdates}, both true by default, deep-merged).
    // Only affects our embed; pages hosted on pitchgrid.moonbase.sh (e.g. checkout) are unaffected.
    communicationPreferences: { show: { newsletter: false, productUpdates: false } },
    theme: {
        dark: true,
        // background only accepts 'white' | 'gray'; in dark mode 'white' is the
        // darkest surface. An exact #131516 is not a documented option.
        colors: { primary: '#ffab00', background: 'white' },
        // Same stacks as /buy and /download; no stylesheet, so nothing extra loads.
        fonts: {
            heading: { family: 'Rubik, system-ui, sans-serif' },
            body: { family: "'Instrument Sans', system-ui, sans-serif" }
        },
        corners: 'soft',
        cards: 'outlined'
    }
} as const;

type MoonbaseUser = { id?: string; email?: string; name?: string };
type MoonbaseMoney = { amount: number; currency: string };
type MoonbaseLineItem = { productId?: string; bundleId?: string };
type MoonbaseOrder = {
    currency?: string;
    total?: { due?: MoonbaseMoney } | null;
    items?: MoonbaseLineItem[];
};

type MoonbaseEvents = {
    'checkout-initiated': { order: MoonbaseOrder; total: MoonbaseMoney; user?: MoonbaseUser | null };
    'checkout-completed': { order: MoonbaseOrder; user?: MoonbaseUser | null };
    'signed-in': { user: MoonbaseUser };
};

/** The subset of the documented MoonbaseInstance API we use. */
type MoonbaseApi = {
    setup(url: string, options?: unknown): Promise<void>;
    on<E extends keyof MoonbaseEvents>(event: E, callback: (event: MoonbaseEvents[E]) => void): void;
    sign_in(parameters?: { email?: string }): unknown;
    forgot_password(parameters?: { email?: string }): unknown;
    view_account(): unknown;
    view_products(): unknown;
    purchase(parameters: { product_id: string; quantity?: number }): Promise<void>;
};

export type MoonbaseIntent = 'sign_in' | 'forgot_password' | 'view_account' | 'view_products';

type LoadState = 'idle' | 'loading' | 'ready' | 'failed';
let state: LoadState = 'idle';

/** Set when the embed has handed the visitor off to the hosted checkout. */
let checkoutHandedOff = false;
let purchasing = false;

/** If the embed has not redirected to checkout by then, use the plain checkout link. */
const PURCHASE_TIMEOUT_MS = 8000;

function getMoonbase(): MoonbaseApi | undefined {
    if (typeof window === 'undefined') return undefined;
    return (window as Window & { Moonbase?: MoonbaseApi }).Moonbase;
}

/** The Moonbase API, only once setup() has finished. */
function readyMoonbase(): MoonbaseApi | undefined {
    return state === 'ready' ? getMoonbase() : undefined;
}

function productIds(order: MoonbaseOrder | undefined): string {
    const ids = (order?.items ?? [])
        .map((item) => item.productId ?? item.bundleId)
        .filter((id): id is string => !!id);
    return [...new Set(ids)].join(',') || MOONBASE_PRODUCT_ID;
}

/** Forward the embed's events to Plausible. No PII: never email, name or ids. */
function wireAnalytics(mb: MoonbaseApi): void {
    mb.on('checkout-initiated', ({ order, total }) => {
        checkoutHandedOff = true;
        trackEvent('Checkout Initiated', {
            product: productIds(order),
            currency: total?.currency ?? order?.currency ?? '',
            amount: String(total?.amount ?? ''),
            page: window.location.pathname
        });
    });
    mb.on('checkout-completed', ({ order }) => {
        const due = order?.total?.due;
        trackEvent(
            'Checkout Completed',
            {
                product: productIds(order),
                currency: due?.currency ?? order?.currency ?? '',
                amount: String(due?.amount ?? ''),
                page: window.location.pathname
            },
            due && typeof due.amount === 'number' ? { currency: due.currency, amount: due.amount } : undefined
        );
    });
    mb.on('signed-in', () => {
        trackEvent('Signed In', { page: window.location.pathname });
    });
}

/** Load moonbase.js once and set it up. Call from onMount only. */
export function initMoonbase(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (state !== 'idle') return;
    state = 'loading';

    window.addEventListener('pageshow', (event) => {
        // Back from the hosted checkout via bfcache: allow another click.
        if (event.persisted) {
            purchasing = false;
            checkoutHandedOff = false;
        }
    });

    const start = () => {
        const mb = getMoonbase();
        if (!mb) {
            state = 'failed';
            return;
        }
        // Listeners first: the loader's queue registers them before setup runs.
        wireAnalytics(mb);
        Promise.resolve(mb.setup(MOONBASE_STOREFRONT_URL, MOONBASE_OPTIONS)).then(
            () => {
                state = 'ready';
            },
            (error) => {
                state = 'failed';
                console.warn('Moonbase storefront unavailable, using hosted links', error);
            }
        );
    };

    // Survive dev HMR / double init: reuse an existing global.
    if (getMoonbase()) {
        start();
        return;
    }

    const script = document.createElement('script');
    script.src = MOONBASE_SCRIPT_URL;
    script.async = true;
    script.onload = start;
    script.onerror = () => {
        state = 'failed';
    };
    document.head.appendChild(script);
}

/** Leave modified clicks (new tab/window, middle click) to the browser. */
function isPlainClick(event: MouseEvent): boolean {
    return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
    );
}

function go(href: string): void {
    if (href) window.location.assign(href);
}

function runIntent(mb: MoonbaseApi, intent: MoonbaseIntent, fallbackHref: string): void {
    try {
        const result = mb[intent]() as unknown;
        if (result && typeof (result as Promise<unknown>).then === 'function') {
            (result as Promise<unknown>).catch(() => go(fallbackHref));
        }
    } catch {
        go(fallbackHref);
    }
}

/**
 * Svelte action: clicking the link opens an embedded storefront panel instead
 * of following its href. The href stays the no-JS / failure fallback.
 *
 *   <a href={MOONBASE_LOGIN_URL} use:moonbaseIntent={'sign_in'}>Sign in</a>
 */
export function moonbaseIntent(node: HTMLAnchorElement, intent: MoonbaseIntent) {
    let current = intent;
    const onClick = (event: MouseEvent) => {
        if (!isPlainClick(event)) return;
        const mb = readyMoonbase();
        if (!mb) return; // not loaded (yet): follow the href
        event.preventDefault();
        runIntent(mb, current, node.href);
    };
    node.addEventListener('click', onClick);
    return {
        update(next: MoonbaseIntent) {
            current = next;
        },
        destroy() {
            node.removeEventListener('click', onClick);
        }
    };
}

/**
 * Click handler for the /buy CTA: start the purchase through the embed (so
 * checkout-initiated/-completed fire and the embed attaches the page's utm_*
 * params to the order), which then redirects to the hosted checkout. Falls
 * back to `fallbackHref` (the UTM-forwarded hosted checkout URL) if the embed
 * is not ready, errors, or does not hand off within PURCHASE_TIMEOUT_MS.
 */
export function startPurchase(event: MouseEvent, fallbackHref: string): void {
    if (!isPlainClick(event)) return;
    const mb = readyMoonbase();
    if (!mb) return; // follow the plain href
    event.preventDefault();
    if (purchasing) return;
    purchasing = true;
    checkoutHandedOff = false;

    let done = false;
    const fallback = () => {
        if (done || checkoutHandedOff) return;
        done = true;
        go(fallbackHref);
    };
    const timer = window.setTimeout(fallback, PURCHASE_TIMEOUT_MS);

    let pending: Promise<void>;
    try {
        pending = Promise.resolve(mb.purchase({ product_id: MOONBASE_PRODUCT_ID, quantity: 1 }));
    } catch (error) {
        pending = Promise.reject(error);
    }
    pending.then(
        () => {
            // Either redirecting (checkout-initiated fired) or the visitor
            // closed the loading overlay; in both cases stay put.
            window.clearTimeout(timer);
            if (!checkoutHandedOff) purchasing = false;
        },
        (error) => {
            window.clearTimeout(timer);
            console.warn('Moonbase purchase failed, using hosted checkout link', error);
            fallback();
        }
    );
}
