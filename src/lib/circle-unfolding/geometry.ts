/**
 * Geometry for the circle-unfolding animation, ported from pg-animations
 * (svelte-app/src/routes/circle-unfolding/+page.svelte and
 * lib/components/primitives/pianoLayout.ts).
 *
 * Instead of shipping the ~790 KB scalatrix WASM bundle, the scalatrix-derived
 * lattice/keyboard geometry is pre-baked into data.json for the three
 * generator values used by the animation (12-EDO 7/12, Pythagorean 0.58497,
 * meantone 0.5805) and interpolated linearly in between.
 */
import raw from './data.json';

export const C_INDEX = 10;
export const LINE_X = -600;
export const N_NOTES = 21;
export const PG_YELLOW = '#FFB319';
export const LIGHT = '#E8D5C4';

export interface Baked {
	generator: number;
	kbdY: number;
	bezTop: number;
	keyNodeY: number;
	nodes: { ci: number; lineY: number; lx: number; ly: number; label: string; on: number; root: number }[];
	segs: [number, number, number, number][];
	drops: { i: number; ax: number }[];
	keys: { x: number; w: number; b: number; r: number }[];
	kn: { kx: number; i: number }[];
	gridH: number[];
	gridV: number[];
	lineCopies: { y: number; label: string; on: number; root: number }[];
	circleLabels: string[];
}

const BAKED = raw as unknown as Baked[];

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function lerpDeep<T>(a: T, b: T, k: number): T {
	if (typeof a === 'number') return lerp(a, b as number, k) as T;
	if (Array.isArray(a)) return a.map((v, i) => lerpDeep(v, (b as unknown[])[i], k)) as T;
	if (a && typeof a === 'object') {
		const o: Record<string, unknown> = {};
		for (const key in a) o[key] = lerpDeep(a[key], (b as Record<string, unknown>)[key], k);
		return o as T;
	}
	return a; // strings / labels: structure is identical across samples
}

const cache = new Map<number, Baked>();
/** Lattice/keyboard geometry for an arbitrary generator between the baked samples. */
export function bakedFor(g: number): Baked {
	const hit = cache.get(g);
	if (hit) return hit;
	let res: Baked = BAKED[0];
	for (let i = 0; i < BAKED.length - 1; i++) {
		const a = BAKED[i], b = BAKED[i + 1];
		const lo = Math.min(a.generator, b.generator), hi = Math.max(a.generator, b.generator);
		if (g >= lo - 1e-9 && g <= hi + 1e-9) {
			const k = (g - a.generator) / (b.generator - a.generator);
			res = k <= 0 ? a : k >= 1 ? b : lerpDeep(a, b, k);
			break;
		}
	}
	if (cache.size > 400) cache.clear();
	cache.set(g, res);
	return res;
}

// ── circle / spiral / line ────────────────────────────────────────────
function curveParams(t: number) {
	const R = 300 * Math.exp(6 * t);
	const spacing = 157 * (1 - t) + 60 * t;
	const delta = spacing / R;
	const thetaRef = -Math.PI / 2 - (t * Math.PI) / 2;
	const xC = -600 * t;
	const yC = -300 + 420 * t;
	return { R, delta, thetaRef, cx: xC - R * Math.cos(thetaRef), cy: yC - R * Math.sin(thetaRef) };
}

export function circlePositions(t: number, b: number): { x: number; y: number }[] {
	const { R, delta, thetaRef, cx, cy } = curveParams(t);
	return Array.from({ length: N_NOTES }, (_, i) => {
		const dTheta = (i - C_INDEX) * delta;
		const theta = thetaRef + dTheta;
		const r = R + b * dTheta;
		return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
	});
}

export function arcPath(t: number, b: number): string {
	const { R, delta, thetaRef, cx, cy } = curveParams(t);
	const half = (N_NOTES - 1) / 2;
	const t0 = thetaRef - half * delta, t1 = thetaRef + half * delta;
	const N = 160;
	let d = '';
	for (let i = 0; i <= N; i++) {
		const th = t0 + (i / N) * (t1 - t0);
		const r = R + b * (th - thetaRef);
		d += (i ? 'L' : 'M') + (cx + r * Math.cos(th)).toFixed(1) + ',' + (cy + r * Math.sin(th)).toFixed(1);
	}
	return d;
}

/** Note index i is "extra" (enharmonic, outside Ab..C#). */
export const isExtra = (i: number) => i <= 5 || i >= 18;

// ── piano key shapes ──────────────────────────────────────────────────
interface Rect { x: number; y: number; width: number; height: number }
const fmt = (n: number) => Math.round(n * 100) / 100;

function whiteKeyPath(w: Rect, blacks: Rect[], pad: number, cr: number): string {
	const x0 = w.x, y0 = w.y, x1 = x0 + w.width, y1 = y0 + w.height;
	const r = Math.max(0, Math.min(cr, w.width / 2, w.height / 2));
	const rawN: { left: number; right: number; bottom: number }[] = [];
	for (const bk of blacks) {
		const l = Math.max(x0, bk.x - pad), rr = Math.min(x1, bk.x + bk.width + pad);
		if (l < rr) rawN.push({ left: l, right: rr, bottom: bk.y + bk.height + pad });
	}
	rawN.sort((a, b) => a.left - b.left);
	const notches: typeof rawN = [];
	for (const n of rawN) {
		const p = notches[notches.length - 1];
		if (p && n.left <= p.right) { p.right = Math.max(p.right, n.right); p.bottom = Math.max(p.bottom, n.bottom); }
		else notches.push({ ...n });
	}
	const nR = notches.map((n) => Math.max(0, Math.min(r, (n.right - n.left) / 2, n.bottom - y0)));
	const leftCut = notches.length > 0 && notches[0].left <= x0 + r;
	const rightCut = notches.length > 0 && notches[notches.length - 1].right >= x1 - r;
	const lw = leftCut ? nR[0] : 0;
	const P: string[] = [];
	const L = (x: number, y: number) => `L${fmt(x)} ${fmt(y)}`;
	const A = (x: number, y: number, rad: number) => `A${fmt(rad)} ${fmt(rad)} 0 0 1 ${fmt(x)} ${fmt(y)}`;
	P.push(leftCut ? `M${fmt(x0 + lw)} ${fmt(notches[0].bottom)}` : `M${fmt(x0 + r)} ${fmt(y0)}`);
	notches.forEach((n, i) => {
		const q = nR[i];
		const fl = i === 0 && leftCut, lr = i === notches.length - 1 && rightCut;
		if (fl && lr) P.push(L(x1 - q, n.bottom), A(x1, n.bottom + q, q));
		else if (fl) P.push(L(n.right, n.bottom), L(n.right, y0 + q), A(n.right + q, y0, q));
		else if (lr) P.push(L(n.left - q, y0), A(n.left, y0 + q, q), L(n.left, n.bottom), L(x1 - q, n.bottom), A(x1, n.bottom + q, q));
		else P.push(L(n.left - q, y0), A(n.left, y0 + q, q), L(n.left, n.bottom), L(n.right, n.bottom), L(n.right, y0 + q), A(n.right + q, y0, q));
	});
	if (!rightCut) { P.push(L(x1 - r, y0)); if (r > 0) P.push(A(x1, y0 + r, r)); }
	P.push(L(x1, y1 - r)); if (r > 0) P.push(A(x1 - r, y1, r));
	P.push(L(x0 + r, y1)); if (r > 0) P.push(A(x0, y1 - r, r));
	if (leftCut) P.push(L(x0, notches[0].bottom + lw), A(x0 + lw, notches[0].bottom, lw));
	else { P.push(L(x0, y0 + r)); if (r > 0) P.push(A(x0 + r, y0, r)); }
	P.push('Z');
	return P.join(' ');
}

function blackKeyPath(b: Rect, cr: number): string {
	const { x, y, width, height } = b;
	const x1 = x + width, y1 = y + height;
	const r = Math.max(0, Math.min(cr, width / 2, height / 2));
	return `M${fmt(x + r)} ${fmt(y)} L${fmt(x1 - r)} ${fmt(y)} A${r} ${r} 0 0 1 ${fmt(x1)} ${fmt(y + r)} L${fmt(x1)} ${fmt(y1 - r)} A${r} ${r} 0 0 1 ${fmt(x1 - r)} ${fmt(y1)} L${fmt(x + r)} ${fmt(y1)} A${r} ${r} 0 0 1 ${fmt(x)} ${fmt(y1 - r)} L${fmt(x)} ${fmt(y + r)} A${r} ${r} 0 0 1 ${fmt(x + r)} ${fmt(y)} Z`;
}

/** SVG paths for the keyboard (keyboard-local coords, y = 0 at top). */
export function keyboardPaths(keys: Baked['keys'], gap = 4, cr = 3): { d: string; fill: string; black: boolean }[] {
	const H_WHITE = 250, H_BLACK = 163;
	const rect = (k: Baked['keys'][number]): Rect => {
		const w = Math.max(1, k.w - gap);
		return { x: k.x - w / 2, y: 0, width: w, height: k.b ? H_BLACK : H_WHITE };
	};
	const blacks = keys.filter((k) => k.b);
	const blackRects = blacks.map(rect);
	const whites = keys.filter((k) => !k.b).map((k) => ({ d: whiteKeyPath(rect(k), blackRects, gap, cr), fill: k.r ? PG_YELLOW : LIGHT, black: false }));
	return [...whites, ...blacks.map((k, i) => ({ d: blackKeyPath(blackRects[i], cr), fill: k.r ? PG_YELLOW : 'gray', black: true }))];
}
