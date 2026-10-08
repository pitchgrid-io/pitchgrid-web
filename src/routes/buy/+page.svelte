<script lang="ts">
    import { onMount } from 'svelte';
    import { MOONBASE_BUY_URL, moonbaseBuyUrl } from '$lib/shop/moonbase';
    import { PRICE_LABEL_ALL, PRICE_NOTE, TRIAL_DAYS } from '$lib/shop/pricing';

    // Pre-checkout page. 32 of 39 abandoned Moonbase checkouts left on step 1
    // without entering anything, and 19 of 39 arrived via bare deep links, so
    // this page gives price, seller, payment and refund context before the
    // click into Moonbase. No auto-forward: the visitor clicks through.

    const title = `Buy PitchGrid: ${PRICE_LABEL_ALL} one-time, perpetual license`;
    const description =
        `PitchGrid Plugin for macOS and Windows. ${PRICE_LABEL_ALL}, one-time payment, perpetual license, no subscription. ` +
        `${TRIAL_DAYS}-day free trial in the installer. Card or PayPal, sold by Moonbase AS.`;
    const pageUrl = 'https://pitchgrid.io/buy';
    const ogImage = 'https://pitchgrid.io/docs/images/PitchGridPluginUI.png';

    const MOONBASE_LOGIN_URL = 'https://pitchgrid.moonbase.sh/log-in';
    const MOONBASE_RESET_URL = 'https://pitchgrid.moonbase.sh/forgot-password';
    const MOONBASE_BUYER_TERMS_URL =
        'https://help.moonbase.sh/articles/3131239-general-terms-and-conditions-for-buyers';

    // This page is prerendered, so the query string is only known in the browser.
    // utm_* params (e.g. /buy?utm_source=newsletter) are forwarded to Moonbase,
    // which records them on the order. Without JS the plain checkout URL works.
    let checkoutUrl = MOONBASE_BUY_URL;

    onMount(() => {
        checkoutUrl = moonbaseBuyUrl(window.location.search);
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
        <p class="eyebrow">PitchGrid Plugin · macOS and Windows</p>
        <h1>Buy PitchGrid</h1>
        <p class="price">{PRICE_LABEL_ALL}</p>
        <p class="currency">Same amount in EUR, USD or GBP. Checkout shows the currency for your country.</p>
        <p class="lead">One-time payment. Perpetual license, not a subscription.</p>
        {#if PRICE_NOTE}<p class="price-note">{PRICE_NOTE}</p>{/if}

        <a class="buy-cta" href={checkoutUrl} data-plausible-label="Continue to checkout">Continue to checkout</a>

        <p class="trial">
            Not sure yet? The {TRIAL_DAYS}-day free trial is built into the installer, no card needed.
            <a href="/download">Download the trial</a>
        </p>

        <ul class="facts">
            <li>
                <h2>Who sells it</h2>
                <p>
                    Sold by Moonbase AS, our merchant of record. VAT is calculated at checkout from your country.
                    The plugin is licensed by Bayes GmbH.
                </p>
            </li>
            <li>
                <h2>Payment</h2>
                <p>
                    Card or PayPal. No account needed: guest checkout works. Checkout asks for your billing
                    address (country, street, postcode, city) because VAT depends on it.
                </p>
            </li>
            <li>
                <h2>Delivery and refunds</h2>
                <!-- LEX REVIEW: refund/withdrawal wording -->
                <p>
                    Digital delivery is immediate. At checkout you agree to start the download right away, so the
                    EU 14-day right of withdrawal ends at that point. Refunds and statutory rights are handled by
                    Moonbase under their
                    <a href={MOONBASE_BUYER_TERMS_URL} target="_blank" rel="noopener noreferrer">buyer terms</a>.
                </p>
            </li>
        </ul>

        <div class="owners">
            <h2>Already own PitchGrid? Don't buy again.</h2>
            <p>
                Your license is already on your Moonbase account.
                <a href={MOONBASE_LOGIN_URL}>Sign in</a> with the email on your old license; never set a password?
                <a href={MOONBASE_RESET_URL}>Reset it</a>.
            </p>
        </div>

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
        padding: 3.5rem 1.25rem 4rem;
        display: flex;
        justify-content: center;
        align-items: flex-start;
    }
    .card {
        text-align: center;
        max-width: 38rem;
        width: 100%;
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
        font-size: 2.2rem;
        font-weight: 600;
        color: #ffab00;
        margin: 0;
    }
    .currency {
        color: #f1f2f4a0;
        font-size: 0.9rem;
        margin: 0.25rem 0 1rem;
    }
    .lead {
        color: #f1f2f4;
        font-size: 1.1rem;
        line-height: 1.5;
        margin: 0 auto 0.5rem;
    }
    .price-note {
        color: #ffab00;
        font-size: 0.95rem;
        margin: 0 auto 1.5rem;
    }
    .buy-cta {
        display: inline-block;
        margin-top: 0.5rem;
        background: #ffab00;
        color: #131516;
        font-family: Rubik, system-ui, sans-serif;
        font-weight: 600;
        font-size: 1.15rem;
        padding: 0.95rem 1.9rem;
        border-radius: 10px;
        text-decoration: none;
    }
    .buy-cta:hover,
    .buy-cta:focus-visible {
        background: #ffcc40;
        color: #131516;
        text-decoration: none;
    }
    .trial {
        margin: 1rem auto 0;
        color: #f1f2f4a0;
        font-size: 0.95rem;
        line-height: 1.5;
    }
    .facts {
        list-style: none;
        padding: 0;
        margin: 2.25rem 0 0;
        text-align: left;
        display: grid;
        gap: 0.75rem;
    }
    .facts li,
    .owners {
        background: #1c1f20;
        border: 1px solid #2a2e30;
        border-radius: 10px;
        padding: 1rem 1.15rem;
    }
    h2 {
        font-family: Rubik, system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 600;
        color: #f1f2f4;
        margin: 0 0 0.35rem;
    }
    .facts p,
    .owners p {
        margin: 0;
        color: #f1f2f4c0;
        font-size: 0.95rem;
        line-height: 1.5;
    }
    .owners {
        margin-top: 0.75rem;
        text-align: left;
        border-color: #ffab0066;
    }
    .owners h2 {
        color: #ffab00;
    }
    .card a:not(.buy-cta) {
        color: #ffab00;
    }
    .legal-links {
        margin-top: 1.75rem;
        color: #f1f2f4a0;
        font-size: 0.9rem;
    }
    @media (max-width: 480px) {
        .buy-page {
            padding-top: 2.5rem;
        }
        h1 {
            font-size: 1.7rem;
        }
        .buy-cta {
            display: block;
        }
    }
</style>
