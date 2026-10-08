<script lang="ts">
    import type { PageData } from './$types';
    import { page } from '$app/stores';
    import { PRICE_LABEL, PRICE_LABEL_ALL, PRICE_NOTE, TRIAL_DAYS } from '$lib/shop/pricing';
    import { carryUtm } from '$lib/actions/carryUtm';
    import TuningPackSignup from '$lib/components/TuningPackSignup.svelte';

    export let data: PageData;

    const platformLabel: Record<string, string> = {
        macos: 'macOS',
        windows: 'Windows',
        linux: 'Linux'
    };
    const platformHint: Record<string, string> = {
        macos: 'Universal installer (Apple Silicon + Intel), notarized',
        windows: 'Signed installer, 64-bit',
        linux: 'VST3 + Standalone, tar.gz'
    };
    const order = ['macos', 'windows', 'linux'];

    // Linux is built but not offered until we have smoked it on more than one distro.
    function offered<T extends { platform: string }>(assets: T[]): T[] {
        return [...assets]
            .filter((a) => a.platform !== 'linux')
            .sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
    }

    $: latestAssets = data.latest ? offered(data.latest.assets) : [];

    function fmtDate(iso: string): string {
        return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    }
</script>

<svelte:head>
    <title>Download PitchGrid: free {TRIAL_DAYS}-day trial</title>
    <meta name="description" content="Download the PitchGrid plugin for macOS and Windows. {TRIAL_DAYS}-day free trial with full features, no card. One-time license {PRICE_LABEL_ALL}." />
</svelte:head>

<main class="download-page">
    <section class="latest">
        <h1>Download PitchGrid</h1>
        {#if data.latest}
            <p class="version">
                Latest version <strong>{data.latest.version}</strong> · {fmtDate(data.latest.date)} ·
                {TRIAL_DAYS}-day free trial included
            </p>
            <div class="platforms">
                {#each latestAssets as asset}
                    <a class="platform-card" href={asset.url} download>
                        <span class="platform">{platformLabel[asset.platform]}</span>
                        <span class="hint">{platformHint[asset.platform]}</span>
                        <span class="size">{asset.sizeMb} MB</span>
                    </a>
                {/each}
            </div>
        {:else if data.releasesError}
            <p class="version">
                The release list is not loading right now. Get the latest installers from
                <a href="https://github.com/pitchgrid-io/pitchgrid-releases/releases/latest">GitHub releases</a>.
                {TRIAL_DAYS}-day free trial included.
            </p>
        {:else}
            <p>No releases published yet — check back soon.</p>
        {/if}

        <div class="trial-box">
            <h2>How the trial works</h2>
            <ul>
                <li><strong>{TRIAL_DAYS} days, full features.</strong> The trial is built into the installer. No watermarks, no limits.</li>
                <li><strong>No credit card.</strong> Download, run, play.</li>
                <li><strong>Keep it with a one-time license.</strong> {PRICE_LABEL_ALL}, perpetual. No subscription.</li>
            </ul>
        </div>
        <p class="like-it">Like it?</p>
        <a class="buy-cta" href="/buy" use:carryUtm={$page.url.search} data-plausible-label="Get a license">Buy a license — {PRICE_LABEL}, one-time</a>
        {#if PRICE_NOTE}<p class="price-note">{PRICE_NOTE}</p>{/if}
        <p class="indiekey">
            Existing Indiekey customers: sign in with the email on the old license.
            Set a password via <a href="https://pitchgrid.moonbase.sh">Forgot password</a> if you have not used Moonbase.
        </p>
        <p class="legal-links">
            <a href="/plugin-eula">EULA</a>
            <span aria-hidden="true"> · </span>
            <a href="/privacy">Privacy</a>
        </p>
    </section>

    <section class="signup">
        <TuningPackSignup source="download" compact={false} />
    </section>

    {#if data.legacy.length > 0}
        <section class="legacy">
            <h2>Previous versions</h2>
            <table>
                <thead>
                    <tr><th>Version</th><th>Date</th><th>Downloads</th></tr>
                </thead>
                <tbody>
                    {#each data.legacy as release}
                        <tr>
                            <td>{release.version}</td>
                            <td>{fmtDate(release.date)}</td>
                            <td>
                                {#each offered(release.assets) as asset, i}
                                    {#if i > 0}&nbsp;·&nbsp;{/if}
                                    <a href={asset.url} download>{platformLabel[asset.platform]}</a>
                                {/each}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </section>
    {/if}
</main>

<style>
    .download-page {
        min-height: 100vh;
        background: #131516;
        color: #f1f2f4;
        font-family: 'Instrument Sans', system-ui, sans-serif;
        padding: 4rem 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4rem;
    }
    h1, h2 {
        font-family: Rubik, system-ui, sans-serif;
    }
    .latest {
        text-align: center;
        max-width: 880px;
    }
    .version {
        color: #f1f2f4a0;
        margin-bottom: 2rem;
    }
    .version strong {
        color: #ffab00;
    }
    .platforms {
        display: flex;
        gap: 1.25rem;
        justify-content: center;
        flex-wrap: wrap;
    }
    .platform-card {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        background: #1a1d1f;
        border: 1px solid #ffffff1f;
        border-radius: 10px;
        padding: 1.4rem 1.8rem;
        min-width: 215px;
        text-decoration: none;
        color: inherit;
    }
    .platform-card:hover {
        border-color: #ffab00;
    }
    .platform {
        font-family: Rubik, system-ui, sans-serif;
        font-size: 1.25rem;
        font-weight: 600;
        color: #ffab00;
    }
    .hint {
        font-size: 0.85rem;
        color: #f1f2f4a0;
    }
    .size {
        font-size: 0.8rem;
        color: #f1f2f470;
    }
    .trial-box {
        margin: 2.5rem auto 0;
        max-width: 36rem;
        text-align: left;
        background: #1a1d1f;
        border: 1px solid #ffffff1f;
        border-radius: 10px;
        padding: 1.25rem 1.6rem;
    }
    .trial-box h2 {
        font-size: 1.1rem;
        margin: 0 0 0.6rem;
        color: #ffab00;
    }
    .trial-box ul {
        margin: 0;
        padding-left: 1.2rem;
        line-height: 1.6;
    }
    .trial-box li {
        margin-bottom: 0.35rem;
    }
    .trial-box strong {
        color: #f1f2f4;
    }
    .like-it {
        margin: 2rem 0 0;
        font-family: Rubik, system-ui, sans-serif;
        font-size: 1.15rem;
        color: #f1f2f4;
    }
    .price-note {
        margin: 0.75rem auto 0;
        color: #f1f2f4a0;
        font-size: 0.9rem;
    }
    .signup {
        width: 100%;
        max-width: 960px;
    }
    .buy-cta {
        display: inline-block;
        margin-top: 0.75rem;
        background: #ffab00;
        color: #131516;
        font-family: Rubik, system-ui, sans-serif;
        font-weight: 600;
        font-size: 1.15rem;
        padding: 0.95rem 1.9rem;
        border-radius: 10px;
        text-decoration: none;
    }
    .buy-cta:hover {
        background: #ffcc40;
        color: #131516;
        text-decoration: none;
    }
    .indiekey {
        margin: 1.5rem auto 0;
        max-width: 36rem;
        color: #f1f2f4a0;
        font-size: 0.95rem;
        line-height: 1.5;
    }
    .legal-links {
        margin-top: 1.5rem;
        color: #f1f2f4a0;
        font-size: 0.9rem;
    }
    .version a, .indiekey a, .legal-links a, .legacy a {
        color: #ffab00;
    }
    .legacy {
        max-width: 880px;
        width: 100%;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        text-align: left;
        padding: 0.6rem 0.8rem;
        border-bottom: 1px solid #ffffff1f;
    }
    th {
        color: #f1f2f4a0;
        font-weight: 500;
    }
</style>
