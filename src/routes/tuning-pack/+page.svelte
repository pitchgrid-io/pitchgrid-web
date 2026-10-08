<script lang="ts">
	import TuningPackSignup from '$lib/components/TuningPackSignup.svelte';
	import { TRIAL_DAYS } from '$lib/shop/pricing';

	const title = 'Free PitchGrid Tuning Pack: 19 Scala tunings + guide';
	const description =
		'Free Scala (.scl) tuning pack from PitchGrid: Pythagorean, meantone, just intonation, 19-EDO, 22-EDO, Bohlen–Pierce, Orwell and more, plus 171 MOS scales and a guide to 10 tunings.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="https://pitchgrid.io/tuning-pack" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content="https://pitchgrid.io/tuning-pack" />
	<meta property="og:image" content="https://pitchgrid.io/docs/images/PitchGridPluginUI.png" />
</svelte:head>

<main class="tp-page">
	<TuningPackSignup source="other" />
	<p class="note">
		Want to move between these tunings live instead of loading files? The
		<a href="/download">PitchGrid plugin</a> does it with two knobs. Try it free for {TRIAL_DAYS} days.
	</p>
</main>

<style>
	.tp-page {
		min-height: 70vh;
		background: #131516;
		padding: 4rem 1.5rem;
	}
	.note {
		max-width: 960px;
		margin: 2rem auto 0;
		text-align: center;
		color: #b0b0b0;
	}
	.note a {
		color: #ffab00;
	}
</style>
