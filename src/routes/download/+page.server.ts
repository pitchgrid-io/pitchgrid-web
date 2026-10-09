import type { PageServerLoad } from './$types';
import { getReleases } from '$lib/shop/releases.server';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
    try {
        const releases = await getReleases(fetch);
        // releases change only when a tag is pushed; let the CDN serve cached copies
        setHeaders({ 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' });
        return {
            latest: releases[0] ?? null,
            legacy: releases.slice(1),
            releasesError: false
        };
    } catch (err) {
        // GitHub's unauthenticated API is rate-limited (60 req/h per IP). Don't 500 the
        // most important page on the site; fall back to a link to the releases page.
        console.error('download: could not load releases', err);
        setHeaders({ 'cache-control': 'public, s-maxage=60' });
        return { latest: null, legacy: [], releasesError: true };
    }
};
