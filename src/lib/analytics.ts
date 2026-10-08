/**
 * Tiny wrapper around the Plausible queue set up in src/app.html, so code can
 * send custom events without caring whether the Plausible script has loaded
 * (the queue stub buffers calls) or is blocked (then this is a no-op).
 *
 * Never put personal data (email, name, order/customer ids) into props.
 */
export type AnalyticsProps = Record<string, string | number | boolean>;
export type AnalyticsRevenue = { currency: string; amount: number };

type PlausibleFn = (
    event: string,
    options?: { props?: AnalyticsProps; revenue?: AnalyticsRevenue }
) => void;

export function trackEvent(name: string, props?: AnalyticsProps, revenue?: AnalyticsRevenue): void {
    if (typeof window === 'undefined') return;
    const plausible = (window as Window & { plausible?: PlausibleFn }).plausible;
    if (typeof plausible !== 'function') return;
    try {
        plausible(name, { ...(props ? { props } : {}), ...(revenue ? { revenue } : {}) });
    } catch {
        // Analytics must never break the page.
    }
}
