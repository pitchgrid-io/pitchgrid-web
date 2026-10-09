import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Retired page: permanent redirect for links that already exist.
export const load: PageLoad = () => {
    redirect(308, '/');
};
