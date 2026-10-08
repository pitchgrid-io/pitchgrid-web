<script lang="ts">
    import { onMount } from 'svelte';
    import { MOONBASE_BUY_URL, moonbaseBuyUrl } from '$lib/shop/moonbase';
    import { PRICE_LABEL_ALL, TRIAL_DAYS } from '$lib/shop/pricing';

    const title = `PitchGrid Plugin license — ${PRICE_LABEL_ALL}`;
    const description =
        `A license for the PitchGrid Plugin. ${PRICE_LABEL_ALL}. ${TRIAL_DAYS}-day trial in the installer. Checkout via Moonbase.`;
    const pageUrl = 'https://pitchgrid.io/buy';
    const ogImage = 'https://pitchgrid.io/docs/images/PitchGridPluginUI.png';

    let continuing = false;
    // This page is prerendered, so the query string is only known in the browser.
    // utm_* params (e.g. /buy?utm_source=newsletter) are forwarded to Moonbase,
    // which records them on the order.
    let checkoutUrl = MOONBASE_BUY_URL;

    onMount(() => {
        checkoutUrl = moonbaseBuyUrl(window.location.search);
        continuing = true;
        const t = window.setTimeout(() => {
            window.location.assign(checkoutUrl);
        }, 500);
        return () => window.clearTimeout(t);
    });
</script>

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={pageUrl} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="PitchGrid" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={pageUrl} />
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImage} />
</svelte:head>

<main class="buy-page">
    <section class="card">
        <p class="eyebrow">PitchGrid Plugin</p>
        <h1>PitchGrid Plugin license</h1>
        <p class="price">{PRICE_LABEL_ALL}</p>
        <p class="lead">
            One-time payment, perpetual license for the PitchGrid Plugin (macOS and Windows).
            Not sure yet? The {TRIAL_DAYS}-day trial is in the installer: full features, no card.
        </p>
        <a
            class="buy-cta"
            href={checkoutUrl}
            data-plausible-label="Get a license"
        >Get a license</a>
        {#if continuing}
            <p class="continue">Continuing to checkout…</p>
        {/if}
        <p class="seller">
            Paid licenses are sold via Moonbase checkout. The plugin is licensed by Bayes GmbH.
        </p>
        <p class="legal-links">
            <a href="/plugin-eula">EULA</a>
            <span aria-hidden="true"> · </span>
            <a href="/privacy">Privacy</a>
            <span aria-hidden="true"> · </span>
            <a href="/download">Download trial</a>
        </p>
    </section>
</main>

<style>
    .buy-page {
        min-height: 70vh;
        background: #131516;
        color: #f1f2f4;
        font-family: 'Instrument Sans', system-ui, sans-serif;
        padding: 4rem 2rem;
        display: flex;
        justify-content: center;
        align-items: flex-start;
    }
    .card {
        text-align: center;
        max-width: 36rem;
    }
    .eyebrow {
        color: #ffab00;
        font-family: Rubik, system-ui, sans-serif;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-size: 0.85rem;
        margin: 0 0 0.75rem;
    }
    h1 {
        font-family: Rubik, system-ui, sans-serif;
        font-size: 2rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
        color: #f1f2f4;
    }
    .price {
        font-family: Rubik, system-ui, sans-serif;
        font-size: 1.6rem;
        font-weight: 600;
        color: #ffab00;
        margin: 0 0 1.25rem;
    }
    .lead {
        color: #f1f2f4;
        font-size: 1.05rem;
        line-height: 1.5;
        margin: 0 auto 1.75rem;
        max-width: 32rem;
    }
    .buy-cta {
        display: inline-block;
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
    .continue {
        margin: 1rem 0 0;
        color: #f1f2f4a0;
        font-size: 0.95rem;
    }
    .seller {
        margin: 1.5rem auto 0;
        max-width: 32rem;
        color: #f1f2f4a0;
        font-size: 0.95rem;
        line-height: 1.5;
    }
    .legal-links {
        margin-top: 1.5rem;
        color: #f1f2f4a0;
        font-size: 0.9rem;
    }
    .legal-links a {
        color: #ffab00;
    }
</style>
