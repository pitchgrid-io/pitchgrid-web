<script lang="ts">
	import { onMount } from 'svelte';
	import { PRICE_LABEL, TRIAL_DAYS } from '$lib/shop/pricing';

	const PACK_URL = '/downloads/pitchgrid-tuning-pack.zip';

	onMount(() => {
		const plausible = (window as Window & { plausible?: (e: string) => void }).plausible;
		plausible?.('Tuning Pack Confirmed');
	});
</script>

<svelte:head>
	<title>You're in — download the PitchGrid Tuning Pack</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="confirmed">
	<section class="card">
		<p class="eyebrow">Subscription confirmed</p>
		<h1>Thanks, you're in</h1>
		<p class="lead">Here is your PitchGrid Tuning Pack: 19 curated Scala tunings, keyboard gamuts, 171 MOS scales and a guide to 10 tunings.</p>
		<a class="primary" href={PACK_URL} download data-plausible-label="Download Tuning Pack">Download the Tuning Pack (.zip)</a>
		<p class="hint">Start with <code>README.md</code> in the zip. Bookmark this page if you want to download it again later.</p>

		<hr />

		<h2>Play them live instead of loading files</h2>
		<p>
			Every tuning in the pack is a PitchGrid preset. In the plugin you move between them with the
			<em>skew</em> and <em>stretch</em> knobs and hear the change as you turn. PitchGrid retunes your
			synths over MPE or MTS-ESP and maps any scale onto your piano keys. VST3/AU/CLAP for macOS and Windows.
		</p>
		<div class="ctas">
			<a class="primary" href="/download?utm_source=tuning-pack&utm_medium=web&utm_campaign=doi-confirmed" data-plausible-label="Trial Download">Try free for {TRIAL_DAYS} days</a>
			<a class="secondary" href="/buy?utm_source=tuning-pack&utm_medium=web&utm_campaign=doi-confirmed" data-plausible-label="Buy PitchGrid">Buy {PRICE_LABEL} — one-time license</a>
		</div>
		<p class="hint">Full features during the trial, no card needed.</p>
	</section>
</main>

<style>
	.confirmed {
		min-height: 70vh;
		background: #131516;
		color: #f1f2f4;
		font-family: 'Instrument Sans', system-ui, sans-serif;
		padding: 4rem 1.5rem;
		display: flex;
		justify-content: center;
	}
	.card {
		max-width: 40rem;
		text-align: center;
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
		margin: 0 0 0.75rem;
	}
	h2 {
		font-family: Rubik, system-ui, sans-serif;
		font-size: 1.35rem;
		margin: 0 0 0.75rem;
	}
	.lead,
	p {
		line-height: 1.6;
		color: #d0d0d0;
	}
	em {
		color: #ffab00;
		font-style: normal;
	}
	code {
		color: #ffcc40;
	}
	.primary,
	.secondary {
		display: inline-block;
		font-family: Rubik, system-ui, sans-serif;
		font-weight: 600;
		font-size: 1.1rem;
		padding: 0.9rem 1.7rem;
		border-radius: 10px;
		text-decoration: none;
		margin: 0.5rem 0.25rem 0;
	}
	.primary {
		background: #ffab00;
		color: #131516;
	}
	.primary:hover {
		background: #ffcc40;
		color: #131516;
	}
	.secondary {
		border: 2px solid rgba(255, 171, 0, 0.6);
		color: #ffab00;
	}
	.secondary:hover {
		background: rgba(255, 171, 0, 0.1);
		color: #ffab00;
	}
	.hint {
		font-size: 0.9rem;
		color: #f1f2f4a0;
		margin-top: 1rem;
	}
	hr {
		border: none;
		border-top: 1px solid #ffffff1f;
		margin: 2.5rem 0;
	}
</style>
