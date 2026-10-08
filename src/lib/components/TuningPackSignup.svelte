<script lang="ts">
	/**
	 * Lead-magnet signup: free PitchGrid Tuning Pack in exchange for a
	 * double-opt-in newsletter subscription (Brevo, via /api/subscribe).
	 * The pack link is only shown on /tuning-pack/confirmed after the DOI click.
	 */
	export let source: 'home' | 'download' | 'footer' | 'other' = 'other';
	export let compact = false;

	let email = '';
	let consent = false;
	let ck1 = false;
	let website = ''; // honeypot
	let loading = false;
	let success = false;
	let message = '';

	const id = `tp-${source}`;

	async function submit() {
		if (!email || !consent || loading) return;
		loading = true;
		message = '';
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, consent, ck1, source, website })
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.success) {
				success = true;
				message = data.message;
				const plausible = (window as Window & { plausible?: (e: string, o?: object) => void }).plausible;
				plausible?.('Tuning Pack Signup', { props: { source, ck1: String(ck1) } });
			} else {
				message = data.error || 'Signup failed. Please try again.';
			}
		} catch {
			message = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<section class="tp" class:compact aria-labelledby="{id}-title">
	<div class="tp-copy">
		<p class="tp-eyebrow">Free download</p>
		<h3 id="{id}-title">The PitchGrid Tuning Pack</h3>
		<p class="tp-lead">
			19 hand-picked Scala (<code>.scl</code>) tunings, from Pythagorean and meantone to Bohlen–Pierce
			and Orwell, plus keyboard-ready gamuts, 171 more MOS scales and a short guide to
			<strong>10 tunings worth hearing</strong>. Loads in any synth that reads Scala files.
		</p>
	</div>

	{#if success}
		<p class="tp-success" role="status">{message}</p>
	{:else}
		<form class="tp-form" on:submit|preventDefault={submit} novalidate>
			<div class="tp-row">
				<label class="sr-only" for="{id}-email">Email address</label>
				<input
					id="{id}-email"
					type="email"
					autocomplete="email"
					placeholder="you@example.com"
					bind:value={email}
					required
					disabled={loading}
				/>
				<button type="submit" disabled={loading || !email || !consent}>
					{loading ? 'Sending…' : 'Get the Tuning Pack'}
				</button>
			</div>
			<label class="tp-check">
				<input type="checkbox" bind:checked={consent} required disabled={loading} />
				<span>
					Email me the Tuning Pack and occasional PitchGrid news from Bayes GmbH (about 1–2 emails a month).
					I'll confirm by email and can unsubscribe at any time.
					<a href="/privacy">Privacy policy</a>
				</span>
			</label>
			<label class="tp-check">
				<input type="checkbox" bind:checked={ck1} disabled={loading} />
				<span>Also send me updates on the <strong>PitchGrid CK1</strong> hardware controller (waitlist only, no deposit).</span>
			</label>
			<div class="tp-hp" aria-hidden="true">
				<label>Leave this empty <input type="text" tabindex="-1" autocomplete="off" bind:value={website} /></label>
			</div>
			{#if message}
				<p class="tp-error" role="alert">{message}</p>
			{/if}
		</form>
	{/if}
</section>

<style>
	.tp {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: center;
		background: linear-gradient(135deg, rgba(255, 171, 0, 0.12) 0%, rgba(255, 171, 0, 0.04) 100%);
		border: 1px solid rgba(255, 171, 0, 0.3);
		border-radius: 16px;
		padding: 2rem 2.25rem;
		text-align: left;
		color: #d0d0d0;
		max-width: 960px;
		margin: 0 auto;
	}
	.tp.compact {
		grid-template-columns: 1fr;
		gap: 1rem;
		max-width: 36rem;
	}
	.tp-eyebrow {
		margin: 0 0 0.35rem;
		color: #ffab00;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-size: 0.8rem;
	}
	h3 {
		margin: 0 0 0.6rem;
		color: #ffffff;
		font-size: 1.4rem;
	}
	.tp-lead {
		margin: 0;
		line-height: 1.6;
		font-size: 1rem;
	}
	.tp-lead strong {
		color: #ffffff;
	}
	code {
		font-size: 0.9em;
		color: #ffcc40;
	}
	.tp-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.tp-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	input[type='email'] {
		flex: 1 1 14rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid rgba(255, 171, 0, 0.35);
		background: #1a1a2e;
		color: #e0e0e0;
		border-radius: 8px;
		font-size: 1rem;
	}
	input[type='email']:focus {
		outline: none;
		border-color: #ffab00;
	}
	button {
		flex: 0 0 auto;
		padding: 0.8rem 1.3rem;
		background: #ffab00;
		color: #131516;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}
	button:hover:not(:disabled) {
		background: #ffcc40;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.tp-check {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		font-size: 0.85rem;
		line-height: 1.45;
		color: #b8b8b8;
		cursor: pointer;
	}
	.tp-check input {
		margin-top: 0.2rem;
		flex-shrink: 0;
		accent-color: #ffab00;
	}
	.tp-check a {
		color: #ffab00;
	}
	.tp-check strong {
		color: #e0e0e0;
	}
	.tp-success {
		margin: 0;
		color: #4ade80;
		font-size: 1rem;
		line-height: 1.5;
	}
	.tp-error {
		margin: 0;
		color: #ff6b6b;
		font-size: 0.9rem;
	}
	.tp-hp {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
	@media (max-width: 768px) {
		.tp {
			grid-template-columns: 1fr;
			padding: 1.5rem;
			gap: 1.25rem;
		}
	}
</style>
