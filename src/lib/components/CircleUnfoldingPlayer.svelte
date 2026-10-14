<!--
	Circle-of-fifths "unfolding" animation with a hover/tap stepper.
	Ported from pitchgrid-io/pg-animations (svelte-app/src/routes/circle-unfolding).
	Replaces the former explainer video on the landing page; timing matches it frame by frame.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { STEPS, DURATIONS, REST_TIMES, TOTAL, stateAt, restIndexAt, inTransition } from '$lib/circle-unfolding/timeline';
	import {
		bakedFor, circlePositions, arcPath, isExtra, keyboardPaths,
		LINE_X, PG_YELLOW, LIGHT
	} from '$lib/circle-unfolding/geometry';
	import { LOGO_PATHS } from '$lib/circle-unfolding/logo';

	export let label = 'PitchGrid: from the circle of fifths to the two-dimensional lattice';

	const LAST = STEPS.length - 1;
	const ENHARMONIC_PAIRS: [number, number][] = [[15, 3], [16, 4], [17, 5]];

	let time = 0;
	let engaged = false; // hover (mouse) or tap (touch) → stepper visible, autoplay stops at next rest
	let target: number | null = null; // time we are travelling to while engaged
	let direction = 1;
	let reducedMotion = false;
	let visible = true;
	let root: HTMLDivElement;
	let raf = 0;
	let last = 0;

	function restTarget(t: number): number {
		// finish the running transition, otherwise stay at the current rest
		const i = restIndexAt(t);
		return inTransition(t) ? REST_TIMES[i + 1] : t;
	}

	function frame(now: number) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(64, now - (last || now));
		last = now;
		if (!visible) return;
		if (!engaged) {
			time = (time + dt) % TOTAL;
			return;
		}
		if (target === null) return;
		if (reducedMotion) { time = target; target = null; return; }
		// skip holds while stepping so a step only shows the transition
		if (!inTransition(time) && time !== target) {
			const i = restIndexAt(time);
			if (direction > 0 && i + 1 <= LAST && REST_TIMES[i + 1] <= target + 1e-6) {
				time = Math.max(time, REST_TIMES[i + 1] - DURATIONS[i + 1]);
			} else if (direction < 0) {
				time = Math.min(time, REST_TIMES[i]);
			}
		}
		const nt = time + direction * dt;
		if ((direction > 0 && nt >= target) || (direction < 0 && nt <= target)) {
			time = target;
			target = null;
		} else time = nt;
	}

	function engage() {
		if (engaged) return;
		engaged = true;
		direction = 1;
		target = restTarget(time);
	}
	function release() {
		if (reducedMotion) return; // no autoplay with reduced motion
		engaged = false;
		target = null;
	}

	$: currentIdx = target !== null ? restIndexAt(target) : restIndexAt(time);

	function goTo(idx: number, animate = true) {
		engaged = true;
		const from = currentIdx;
		if (idx > LAST) { time = REST_TIMES[0]; target = null; return; } // wrap forward
		if (idx < 0) { time = REST_TIMES[LAST]; target = null; return; } // wrap back
		if (!animate || Math.abs(idx - from) > 1) { time = REST_TIMES[idx]; target = null; return; }
		if (target === null) time = REST_TIMES[from] ?? time;
		direction = idx >= from ? 1 : -1;
		target = REST_TIMES[idx];
	}
	const next = () => goTo(currentIdx + 1);
	const prev = () => goTo(currentIdx - 1);

	function onPointerEnter(e: PointerEvent) { if (e.pointerType === 'mouse') engage(); }
	function onPointerLeave(e: PointerEvent) { if (e.pointerType === 'mouse') release(); }
	function onStageClick(e: PointerEvent) {
		if (e.pointerType === 'mouse') return;
		if (engaged) release(); else engage();
	}
	function onDocPointerDown(e: PointerEvent) {
		if (engaged && e.pointerType !== 'mouse' && root && !root.contains(e.target as Node)) release();
	}
	function onBlur(e: FocusEvent) {
		if (!root.contains(e.relatedTarget as Node | null)) release();
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
		else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
		else if (e.key === 'Escape') release();
	}

	let io: IntersectionObserver | undefined;
	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) { engaged = true; time = REST_TIMES[1]; }
		io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
		io.observe(root);
		document.addEventListener('pointerdown', onDocPointerDown);
		raf = requestAnimationFrame(frame);
	});
	onDestroy(() => {
		if (typeof window === 'undefined') return;
		cancelAnimationFrame(raf);
		io?.disconnect();
		document.removeEventListener('pointerdown', onDocPointerDown);
	});

	// ── derived drawing state ──
	$: s = stateAt(time);
	$: g = bakedFor(s.generator);
	$: logoScale = 1.83 * (1 - s.logoProgress) + 0.6 * s.logoProgress;
	$: logoTransform = `translate(${500 * s.logoProgress}, ${140 * (1 - s.logoProgress) - 480 * s.logoProgress}) scale(${logoScale}) translate(-219, -39)`;
	$: staticCopiesAlpha = Math.min(1, s.gridAlpha + s.equaveOnScale + s.equaveOffScale);
	$: base = circlePositions(s.t, s.b);
	$: sep = circlePositions(s.t, s.b + s.labelSeparation * 10);
	$: circ = base.map((p, i) => ([3, 4, 5, 15, 16, 17].includes(i) ? sep[i] : p));
	$: arc = arcPath(s.t, s.b);
	$: equavePhase = s.t >= 1 && (s.equaveOnScale > 0.001 || s.equaveOffScale > 0.001);
	$: pos = g.nodes.map((n) => {
		if (!equavePhase) {
			const c = circ[n.ci];
			return { x: c?.x ?? LINE_X, y: c?.y ?? n.lineY };
		}
		const eq = n.on ? s.equaveOnScale : s.equaveOffScale;
		return { x: LINE_X + (n.lx - LINE_X) * eq, y: n.ly };
	});
	$: gridLeft = LINE_X;
	$: gridRight = g.gridV[g.gridV.length - 1] + (g.gridV[0] - LINE_X);
	$: gridTop = Math.min(...g.gridH) - Math.abs(g.gridH[1] - g.gridH[0]);
	$: keys = keyboardPaths(g.keys);
	const fillOf = (on: number, root: number) => (root ? PG_YELLOW : on ? LIGHT : 'gray');

	$: progress = time / TOTAL;
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
<div
	class="cu-player"
	class:engaged
	bind:this={root}
	role="group"
	aria-roledescription="animation"
	aria-label={label}
	tabindex="0"
	on:pointerenter={onPointerEnter}
	on:pointerleave={onPointerLeave}
	on:keydown={onKey}
	on:focus={engage}
	on:blur={onBlur}
>
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div class="cu-frame">
	<svg viewBox="-660 -511 1320 1320" class="cu-stage" on:pointerup={onStageClick} aria-hidden="true">
		<g opacity={s.contentAlpha}>
			<path d={arc} fill="none" stroke={LIGHT} stroke-width="6" stroke-linecap="round" />
			{#if s.labelSeparation > 0.01}
				<g opacity={s.labelSeparation}>
					{#each ENHARMONIC_PAIRS as [a, b]}
						<line x1={circ[a].x} y1={circ[a].y} x2={circ[b].x} y2={circ[b].y} stroke="gray" stroke-width="48" />
					{/each}
				</g>
			{/if}
			{#each circ as p, i}
				{#if isExtra(i)}
					<circle cx={p.x} cy={p.y} r="24" fill="gray" />
					<text x={p.x} y={p.y} class="lbl" dominant-baseline="central">{g.circleLabels[i]}</text>
				{/if}
			{/each}

			{#if s.gridAlpha > 0.01}
				<g opacity={s.gridAlpha * 0.15}>
					{#each g.gridH as y}<line x1={gridLeft} y1={y} x2={gridRight} y2={y} stroke="white" stroke-width="2" />{/each}
					{#each g.gridV as x}<line x1={x} y1={gridTop} x2={x} y2={g.kbdY} stroke="white" stroke-width="2" />{/each}
				</g>
			{/if}

			{#if staticCopiesAlpha > 0.01}
				<g opacity={staticCopiesAlpha}>
					{#each g.lineCopies as c}
						<circle cx={LINE_X} cy={c.y} r="24" fill={fillOf(c.on, c.root)} />
						<text x={LINE_X} y={c.y} class="lbl" dominant-baseline="central">{c.label}</text>
					{/each}
				</g>
			{/if}

			{#if s.segmentsAlpha > 0.01}
				<g opacity={s.segmentsAlpha}>
					{#each g.segs as [x1, y1, x2, y2]}
						<line
							x1={LINE_X + (x1 - LINE_X) * s.equaveOnScale} {y1}
							x2={LINE_X + (x2 - LINE_X) * s.equaveOnScale} {y2}
							stroke={LIGHT} stroke-width="8" stroke-linecap="round"
						/>
					{/each}
				</g>
			{/if}

			<g transform="translate(0, {g.kbdY})">
				{#each keys as k}<path d={k.d} fill={k.fill} />{/each}
			</g>

			{#each g.kn as k}
				{@const n = g.nodes[k.i]}
				<circle cx={k.kx} cy={g.keyNodeY} r="24" fill={fillOf(1, n.root)} />
				<text x={k.kx} y={g.keyNodeY} class="lbl" dominant-baseline="central">{n.label}</text>
			{/each}
			{#if s.equaveOnScale > 0.01}
				{#each g.kn as k}
					{@const n = g.nodes[k.i]}
					{@const mx = k.kx + (n.lx - k.kx) * s.equaveOnScale}
					{@const my = g.keyNodeY + (n.ly - g.keyNodeY) * s.equaveOnScale}
					<circle cx={mx} cy={my} r="24" fill={fillOf(1, n.root)} />
					<text x={mx} y={my} class="lbl" dominant-baseline="central">{n.label}</text>
				{/each}
			{/if}

			{#if s.dropLinesAlpha > 0.01}
				<g opacity={s.dropLinesAlpha}>
					{#each g.drops as d}
						{@const n = g.nodes[d.i]}
						{@const eq = n.on ? s.equaveOnScale : s.equaveOffScale}
						{@const bx = LINE_X + (n.lx - LINE_X) * eq}
						{@const bb = g.bezTop + 80}
						{@const col = fillOf(n.on, n.root)}
						<line x1={bx} y1={pos[d.i].y} x2={bx} y2={g.bezTop} stroke={col} stroke-width="2" />
						<path d="M {bx},{g.bezTop} C {bx},{g.bezTop + 40} {d.ax},{bb - 40} {d.ax},{bb}" fill="none" stroke={col} stroke-width="2" />
						<line x1={d.ax} y1={bb} x2={d.ax} y2={g.kbdY} stroke={col} stroke-width="2" />
					{/each}
				</g>
			{/if}

			{#each [0, 1] as onPass}
				{#each g.nodes as n, i}
					{#if n.on === onPass}
						<circle cx={pos[i].x} cy={pos[i].y} r="24" fill={fillOf(n.on, n.root)} />
						<text x={pos[i].x} y={pos[i].y} class="lbl" dominant-baseline="central">{n.label}</text>
					{/if}
				{/each}
			{/each}
		</g>
		<g transform={logoTransform}>
			{#each LOGO_PATHS as p}<path d={p.d} fill={p.fill} />{/each}
		</g>
	</svg>
	</div>

	<div class="cu-overlay" aria-live="polite">
		<p class="cu-text">{engaged ? STEPS[currentIdx].text : ''}</p>
		<div class="cu-controls">
			<button type="button" class="cu-btn" aria-label="Previous step" on:click|stopPropagation={prev} on:pointerup|stopPropagation>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
			</button>
			<div class="cu-timeline" style="--p: {progress}">
				<div class="cu-track"></div>
				<div class="cu-played"></div>
				{#each REST_TIMES as rt, i}
					<button
						type="button"
						class="cu-dot"
						class:done={rt <= time + 1e-6}
						class:current={engaged && i === currentIdx}
						style="left: {(rt / TOTAL) * 100}%"
						aria-label="Step {i + 1} of {STEPS.length}"
						on:click|stopPropagation={() => goTo(i)}
						on:pointerup|stopPropagation
					></button>
				{/each}
				<div class="cu-head"></div>
			</div>
			<button type="button" class="cu-btn" aria-label="Next step" on:click|stopPropagation={next} on:pointerup|stopPropagation>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
			</button>
		</div>
	</div>
</div>

<style>
	.cu-player {
		position: relative;
		width: 100%;
		outline: none;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.cu-frame {
		width: 100%;
		aspect-ratio: 1 / 1;
		background: #1a1a1a;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 171, 0, 0.1);
	}
	.cu-player:focus-visible .cu-frame { box-shadow: 0 0 0 2px #ffab00, 0 12px 40px rgba(0, 0, 0, 0.5); }
	.cu-stage { display: block; width: 100%; height: 100%; cursor: default; }
	.lbl {
		font-family: monospace;
		font-size: 26px;
		fill: black;
		text-anchor: middle;
		pointer-events: none;
	}
	/* Controls sit below the animation; their space is always reserved so the page never jumps. */
	.cu-overlay {
		padding: 0.75rem 0.25rem 0;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.2s ease, visibility 0.2s;
	}
	.engaged .cu-overlay { opacity: 1; visibility: visible; }
	.cu-text {
		margin: 0 0 0.6rem;
		min-height: 3.9em; /* three lines reserved */
		display: flex; align-items: center; justify-content: center;
		color: #f2f2f2;
		font-size: 1rem;
		line-height: 1.3;
		text-align: center;
		white-space: pre-line;
	}
	.cu-controls { display: flex; align-items: center; gap: 0.6rem; }
	.cu-btn {
		flex: none;
		width: 36px; height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(255, 171, 0, 0.6);
		background: rgba(0, 0, 0, 0.4);
		display: grid; place-items: center;
		cursor: pointer;
		padding: 0;
	}
	.cu-btn:hover { background: rgba(255, 171, 0, 0.15); }
	.cu-btn svg { width: 18px; height: 18px; fill: none; stroke: #ffab00; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
	.cu-timeline { position: relative; flex: 1; height: 24px; }
	.cu-track, .cu-played { position: absolute; left: 0; top: 50%; height: 4px; margin-top: -2px; border-radius: 2px; }
	.cu-track { right: 0; background: rgba(255, 255, 255, 0.22); }
	.cu-played { width: calc(var(--p) * 100%); background: #ffab00; }
	.cu-dot {
		position: absolute; top: 50%;
		width: 12px; height: 12px; margin: -6px 0 0 -6px;
		padding: 0;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.55);
		background: #2a2a2a;
		cursor: pointer;
	}
	.cu-dot::after { content: ''; position: absolute; inset: -8px; } /* bigger hit area */
	.cu-dot.done { background: #ffab00; border-color: #ffab00; }
	.cu-dot.current { transform: scale(1.35); border-color: #fff; }
	.cu-head {
		position: absolute; top: 50%; left: calc(var(--p) * 100%);
		width: 4px; height: 18px; margin: -9px 0 0 -2px;
		border-radius: 2px;
		background: #fff;
		box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
		pointer-events: none;
	}
	@media (max-width: 520px) {
		.cu-overlay { padding: 0.6rem 0 0; }
		.cu-text { font-size: 0.85rem; }
		.cu-btn { width: 32px; height: 32px; }
		.cu-controls { gap: 0.35rem; }
		.cu-dot { width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; }
	}
</style>
