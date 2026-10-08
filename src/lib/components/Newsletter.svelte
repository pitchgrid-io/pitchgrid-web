<script lang="ts">
	import { BUTTON_NEWSLETTER, CONSENT_TEXT, CONSENT_TEXT_VERSION, SUCCESS_MESSAGE } from '$lib/consent/signupCopy';

	let email = '';
	let name = '';
	let message = '';
	let loading = false;
	let success = false;

	async function handleSubmit() {
		if (!email || loading) return;

		loading = true;
		message = '';
		success = false;

		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					name,
					source: 'footer',
					consentVersion: CONSENT_TEXT_VERSION,
					page: location.origin + location.pathname
				})
			});

			const data = await res.json();

			if (data.success) {
				message = data.message || SUCCESS_MESSAGE;
				success = true;
				const plausible = (window as Window & { plausible?: (e: string, o?: object) => void }).plausible;
				plausible?.('Newsletter Signup', { props: { source: 'footer' } });
				email = '';
				name = '';
			} else {
				message = data.error || 'Subscription failed. Please try again.';
			}
		} catch (err) {
			message = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="newsletter">
	<h3>Stay updated</h3>
	<p class="intro">Join the PitchGrid mailing list for updates, new tools, and events.</p>
	
	<form on:submit|preventDefault={handleSubmit}>
		<input 
			type="text" 
			bind:value={name} 
			placeholder="Your name (optional)" 
			disabled={loading}
		/>
		<input 
			type="email" 
			bind:value={email} 
			placeholder="your@email.com" 
			required 
			disabled={loading}
		/>
		<button type="submit" disabled={loading || !email}>
			{loading ? 'Joining…' : BUTTON_NEWSLETTER}
		</button>
		<p class="consent">{CONSENT_TEXT} <a href="/privacy">Privacy policy</a></p>
	</form>

	{#if message}
		<p class:success>{message}</p>
	{/if}
</div>

<style>
	.newsletter {
		max-width: 320px;
	}

	.newsletter h3 {
		color: #FFAB00;
		margin-bottom: 0.5rem;
	}

	.newsletter p {
		margin-bottom: 1rem;
		color: #ccc;
		font-size: 0.95rem;
	}

	.intro {
		color: #ccc;
		font-size: 0.95rem;
		margin-bottom: 1rem;
		margin-top: 0;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	input {
		padding: 0.75rem;
		border: 1px solid rgba(255, 171, 0, 0.3);
		background: #1a1a2e;
		color: #e0e0e0;
		border-radius: 6px;
		font-size: 1rem;
	}

	input:focus {
		outline: none;
		border-color: #FFAB00;
	}

	.newsletter p.consent {
		margin: 0;
		color: #b8b8b8;
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.consent a {
		color: #FFAB00;
	}

	button {
		padding: 0.75rem;
		background: #FFAB00;
		color: #1a1a2e;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	button:hover:not(:disabled) {
		background: #FFCC40;
		transform: translateY(-1px);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success {
		color: #4ade80;
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}

	:global(.newsletter p:not(.success):not(.intro):not(.consent)) {
		color: #ff6b6b;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}
</style>
