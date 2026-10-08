<script lang="ts">
	import { onMount } from 'svelte';
	import { PRICE_LABEL, TRIAL_DAYS } from '$lib/shop/pricing';

	onMount(() => {
		// via=email: arrived from the (optional) confirmation email link.
		const via = new URLSearchParams(location.search).get('via') === 'email' ? 'email' : 'other';
		const plausible = (window as Window & { plausible?: (e: string, o?: object) => void }).plausible;
		plausible?.('Newsletter Confirmed', { props: { via } });
	});
</script>

<svelte:head>
	<title>Thanks, you're confirmed | PitchGrid</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="confirmed">
	<section class="card">
		<p class="eyebrow">PitchGrid mailing list</p>
		<h1>Thanks, you're confirmed</h1>
		<p class="lead">You're on the PitchGrid mailing list. We'll send news about PitchGrid: new releases, features and events. Every email has an unsubscribe link.</p>

		<hr />

		<h2>Hear it for yourself</h2>
		<p>
			PitchGrid lets you move between tunings live with the <em>skew</em> and <em>stretch</em> knobs
			and hear the change as you turn. It retunes your synths over MPE or MTS-ESP and maps any scale
			onto your piano keys. VST3/AU/CLAP for macOS and Windows.
		</p>
		<div class="ctas">
			<a class="primary" href="/download?utm_source=newsletter&utm_medium=email&utm_campaign=signup-confirmed" data-plausible-label="Trial Download">Try free for {TRIAL_DAYS} days</a>
			<a class="secondary" href="/buy?utm_source=newsletter&utm_medium=email&utm_campaign=signup-confirmed" data-plausible-label="Buy PitchGrid">Buy {PRICE_LABEL} — one-time license</a>
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
