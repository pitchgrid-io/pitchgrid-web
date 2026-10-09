import { withPassthrough } from '$lib/shop/moonbase';

/**
 * Svelte action for CTA links (/download, /buy): if the current page was opened
 * with utm_* params (e.g. from a newsletter), append them to the link so the
 * campaign survives to the Moonbase checkout. Runs only in the browser and
 * stores nothing, so it needs no cookie consent.
 *
 *   <a href="/buy" use:carryUtm={$page.url.search}>Buy</a>
 *
 * Pass `$page.url.search` so client-side navigations update the link; without
 * an argument it falls back to window.location.search.
 */
export function carryUtm(node: HTMLAnchorElement, search?: string) {
    const original = node.getAttribute('href') ?? '';
    const apply = (s?: string) => {
        const current = s ?? (typeof window !== 'undefined' ? window.location.search : '');
        node.setAttribute('href', withPassthrough(original, current));
    };
    apply(search);
    return { update: apply };
}
