/**
 * Circle-unfolding timeline, ported from pg-animations
 * (svelte-app/src/routes/circle-unfolding/animation.ts).
 *
 * The animation is a pure function of time: each step tweens from the
 * previous rest state to its own rest state (cubic in-out), then holds.
 * Durations are tuned to match /pitchgrid-anim-web.mp4 (~15 s loop).
 * Texts are the built-in step titles from pg-animations animation.ts (verbatim;
 * disabled there for the video recording). Step 1 merges the source's untitled
 * logo-shrink step with the following zero-duration "show the circle" title step.
 */

export interface AnimState {
	t: number; // 0 = circle, 1 = vertical line
	b: number; // spiral rate
	labelSeparation: number;
	gridAlpha: number;
	equaveOnScale: number;
	equaveOffScale: number;
	segmentsAlpha: number;
	dropLinesAlpha: number;
	generator: number;
	logoProgress: number;
	contentAlpha: number;
}

export const DEFAULT_STATE: AnimState = {
	t: 0,
	b: 0,
	labelSeparation: 0,
	gridAlpha: 0,
	equaveOnScale: 0,
	equaveOffScale: 0,
	segmentsAlpha: 0,
	dropLinesAlpha: 0,
	generator: 7 / 12,
	logoProgress: 0,
	contentAlpha: 0
};

export interface Step {
	text: string;
	/** transition into this rest state, ms */
	duration: number;
	/** hold at this rest state during autoplay, ms */
	hold: number;
	state?: Partial<AnimState>;
}

export const STEPS: Step[] = [
	{ text: 'PitchGrid unlocks a hidden dimension in Western music', duration: 0, hold: 300 },
	{ text: 'Here\'s The foundation of music theory:\nThe Piano Keyboard and the circle of 5ths', duration: 1000, hold: 1700, state: { logoProgress: 1, contentAlpha: 1 } },
	{ text: 'But the notes on the circle can have multiple names:\n Enharmonic pairs', duration: 550, hold: 400, state: { labelSeparation: 1 } },
	{ text: 'To unlock the hidden dimension,\n we open up the circle to the spiral that it really is...', duration: 550, hold: 0, state: { b: 10, labelSeparation: 0 } },
	{ text: '... and unfold it to a line, with the notes rising by 5ths.\n Two dimensions: Piano~Pitch, Line~Foundational harmonic rules', duration: 1200, hold: 700, state: { t: 1, b: 0 } },
	{ text: 'let\'s see what happens if we line up the notes in a 2D grid', duration: 550, hold: 150, state: { gridAlpha: 1 } },
	{ text: 'Here are our scale degrees', duration: 650, hold: 600, state: { equaveOnScale: 1 } },
	{ text: 'Connecting the dots... The scale is represented by a zig-zag line.\nOne direction: large steps; Other direction: small steps', duration: 450, hold: 600, state: { gridAlpha: 0, segmentsAlpha: 1 } },
	{ text: 'The off-scale notes also have their place on the grid', duration: 600, hold: 600, state: { equaveOffScale: 1 } },
	{ text: 'But only some notes on the grid are mapped to the keyboard,\n because the piano only has twelve keys per octave.', duration: 450, hold: 700, state: { dropLinesAlpha: 1 } },
	{ text: 'Tilting our lattice changes the tuning of every note.\n We\'ve got Pythagorean tuning...', duration: 600, hold: 700, state: { generator: 0.58497 } },
	{ text: '... or Meantone temperament, by the turn of a knob.', duration: 700, hold: 1000, state: { generator: 0.5805 } },
	{ text: 'PitchGrid ', duration: 700, hold: 500, state: { contentAlpha: 0, logoProgress: 0 } }
];

/** Accumulated rest state for every step. */
export const REST_STATES: AnimState[] = (() => {
	const out: AnimState[] = [];
	let acc = { ...DEFAULT_STATE };
	for (const s of STEPS) {
		acc = { ...acc, ...(s.state ?? {}) };
		out.push(acc);
	}
	return out;
})();

/** Time (ms) at which each rest state is reached, and total loop length. */
export const REST_TIMES: number[] = [];
export const TOTAL: number = (() => {
	let t = 0;
	for (const s of STEPS) {
		t += s.duration;
		REST_TIMES.push(t);
		t += s.hold;
	}
	return t;
})();

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function lerpState(a: AnimState, b: AnimState, k: number): AnimState {
	const o = { ...a };
	for (const key in o) {
		const kk = key as keyof AnimState;
		o[kk] = a[kk] + (b[kk] - a[kk]) * k;
	}
	return o;
}

/** Index of the last rest reached at time `time` (rest i owns [REST_TIMES[i], REST_TIMES[i+1]-dur)). */
export function restIndexAt(time: number): number {
	let idx = 0;
	for (let i = 0; i < REST_TIMES.length; i++) if (time >= REST_TIMES[i] - 1e-6) idx = i;
	return idx;
}

/** True if `time` lies inside a transition (not in a hold). */
export function inTransition(time: number): boolean {
	const i = restIndexAt(time);
	const next = i + 1;
	if (next >= STEPS.length) return false;
	return time > REST_TIMES[next] - STEPS[next].duration + 1e-6;
}

export function stateAt(time: number): AnimState {
	const i = restIndexAt(time);
	const next = i + 1;
	if (next < STEPS.length) {
		const start = REST_TIMES[next] - STEPS[next].duration;
		if (time > start) {
			const k = ease(Math.min(1, (time - start) / STEPS[next].duration));
			return lerpState(REST_STATES[i], REST_STATES[next], k);
		}
	}
	return REST_STATES[i];
}
