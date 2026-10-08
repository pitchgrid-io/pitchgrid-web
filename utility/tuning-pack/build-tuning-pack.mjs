#!/usr/bin/env node
/**
 * Builds static/downloads/pitchgrid-tuning-pack.zip — the free lead-magnet pack
 * delivered when someone joins the mailing list.
 *
 * Source of truth for the tunings is the PitchGrid preset table shipped in the
 * Ableton Move module (move-anything-pitchgrid/dsp/pitchgrid_presets.h, 191 presets,
 * vendored here as move-presets.json). Pitches are computed with the same
 * scalatrix WASM build the website uses (src/lib/scalatrix), then snapped to the
 * named equal division where the preset name says "NEDO"/"NEDT".
 *
 * Usage:  node utility/tuning-pack/build-tuning-pack.mjs
 * Needs Node >= 20.15 (zlib.crc32). No npm deps.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const OUT = path.join(repo, 'static', 'downloads', 'pitchgrid-tuning-pack.zip');
const ROOT = 'PitchGrid Tuning Pack';

// scalatrix.js is an Emscripten ES module factory; load it from the site's copy.
const { default: Scalatrix } = await import(path.join(repo, 'src', 'lib', 'scalatrix', 'scalatrix.js'));
const sx = await Scalatrix();
const presets = JSON.parse(fs.readFileSync(path.join(here, 'move-presets.json'), 'utf8'));
const byName = Object.fromEntries(presets.map((p) => [p.name, p]));
// The Move table stores 1/4-comma meantone with a rounded generator (0.5805); use the exact
// value (fifth = 5^(1/4), i.e. pure 5/4 thirds) so the exported file is the textbook tuning.
byName['1/4c Meantone'] = { ...byName['1/4c Meantone'], skew: Math.log2(5) / 4 };

const cents = (r) => 1200 * Math.log2(r);
const TRITAVE = cents(3);

/** Curated set, in guide order. `plugin` = matching factory preset in the PitchGrid plugin. */
const curated = [
	{ file: '01-pythagorean', title: 'Pythagorean diatonic (Ionian)', preset: 'Pythagorean', plugin: 'Pythagorean',
	  ratios: ['9/8', '81/64', '4/3', '3/2', '27/16', '243/128', '2/1'],
	  gamut: ['2187/2048', '9/8', '32/27', '81/64', '4/3', '729/512', '3/2', '6561/4096', '27/16', '16/9', '243/128', '2/1'],
	  gamutNote: '12 notes, Eb..G#' },
	{ file: '02-quarter-comma-meantone', title: '1/4-comma meantone diatonic (Ionian)', preset: '1/4c Meantone', plugin: '1/4-comma Meantone', gamutNote: '12 notes, Eb..G#' },
	{ file: '03-just-intonation', title: '5-limit just intonation major', preset: null, plugin: 'Just Intonation',
	  ratios: ['9/8', '5/4', '4/3', '3/2', '5/3', '15/8', '2/1'],
	  gamut: ['16/15', '9/8', '6/5', '5/4', '4/3', '45/32', '3/2', '8/5', '5/3', '9/5', '15/8', '2/1'],
	  gamutNote: '12 notes, common 5-limit chromatic' },
	{ file: '04-half-comma-cleantone', title: '1/2-comma cleantone diatonic, stretched octave', preset: '1/2c Cleantone', plugin: '1/2-comma Cleantone', gamutNote: '12 notes' },
	{ file: '05-19edo-diatonic', title: '19-EDO diatonic (Ionian)', preset: 'Western 19EDO', plugin: '19-TET' },
	{ file: '06-22edo-superpyth-diatonic', title: '22-EDO superpyth diatonic (Ionian)', preset: 'Western 22EDO', plugin: null },
	{ file: '07-mavila-16edo', title: 'Mavila, 16-EDO (anti-diatonic)', preset: 'Mavila 16EDO', plugin: 'Mavila (16-TET, 16 keys/8ve)' },
	{ file: '08-bohlen-pierce-13edt', title: 'Bohlen-Pierce, 13 equal divisions of 3/1 (Lambda-type mode)', preset: 'Bohlen-Pierce 13EDT', plugin: 'Bohlen-Pierce' },
	{ file: '09-orwell9-22edo', title: 'Orwell[9] in 22-EDO (4L5s)', preset: 'Orwell 22EDO 4L5s', plugin: 'Orwell[9]' },
	{ file: '10-magic7', title: 'Magic[7], chain of ~380-cent thirds', preset: 'Magic7', plugin: 'Magic7', gamutNote: '10 notes' },
	// more to explore
	{ file: '11-17edo-diatonic', title: '17-EDO diatonic (Ionian)', preset: 'Western 17EDO', plugin: null },
	{ file: '12-dicot-17edo-7L3s', title: 'Dicot 7L3s in 17-EDO', preset: 'Dicot 17EDO 7L3s', plugin: 'Dicoid 17-TET (7L 3s)' },
	{ file: '13-mavila-9edo', title: 'Mavila, 9-EDO', preset: 'Mavila 9EDO', plugin: 'Mavila (9EDO)' },
	{ file: '14-orwell9-13edo', title: 'Orwell[9] in 13-EDO (4L5s)', preset: 'Orwell 13EDO 4L5s', plugin: null },
	{ file: '15-porcupine-15edo', title: 'Porcupine[8] in 15-EDO (7L1s)', preset: 'Porcupine 15EDO 7L1s', plugin: 'Porcupine8' },
	{ file: '16-machine6-11edo', title: 'Machine[6] in 11-EDO (5L1s)', preset: 'Machine 11EDO 5L1s', plugin: 'Machine6' },
	{ file: '17-machine6-16edo', title: 'Machine[6] in 16-EDO (5L1s)', preset: 'Machine 16EDO 5L1s', plugin: null },
	{ file: '18-machine6-17edo', title: 'Machine[6] in 17-EDO (5L1s)', preset: 'Machine 17EDO 5L1s', plugin: null },
	{ file: '19-slendric11', title: 'Slendric[11], chain of ~234-cent 8/7s', preset: 'Slendric[11]', plugin: 'Slendric[11]', gamutNote: '16 notes' }
];

/** Equal-division step (cents) implied by the preset name, or null. */
function edStep(name) {
	let m = name.match(/(\d+)EDO/);
	if (m) return 1200 / Number(m[1]);
	m = name.match(/(\d+)EDT/);
	if (m) return TRITAVE / Number(m[1]);
	return null;
}

/** Pitches (cents, excl. 0, incl. equave) of the MOS scale for a preset. */
function mosCents(p, depth, mode) {
	const mos = sx.MOS.fromG(depth, mode, p.skew, p.stretch_cents / 1200, p.repetitions);
	const nodes = mos.base_scale.getNodes();
	const out = [];
	for (let i = 1; i < nodes.size(); i++) out.push(cents(nodes.get(i).pitch));
	const n = mos.n;
	nodes.delete?.();
	mos.delete();
	return { out, n };
}

function scaleCents(p) {
	const { out } = mosCents(p, p.depth, p.mode);
	const step = edStep(p.name);
	return step ? out.map((c) => Math.round(c / step) * step) : out;
}

function gamutCents(p) {
	const step = edStep(p.name);
	if (step) {
		const equave = /EDT/.test(p.name) ? TRITAVE : 1200;
		const N = Math.round(equave / step);
		return Array.from({ length: N }, (_, i) => (i + 1) * step);
	}
	const depth = p.depth + Math.max(1, p.extra_depth);
	const { n } = mosCents(p, depth, 0);
	// Rotate so the tonic sits a quarter of the way along the chain (12 notes -> Eb..G#).
	return mosCents(p, depth, Math.round(n / 4)).out;
}

function fmtPitch(c) {
	if (Math.abs(c - 1200) < 1e-6) return '2/1';
	if (Math.abs(c - TRITAVE) < 1e-6) return '3/1';
	return c.toFixed(6);
}

function scl(filename, description, pitches) {
	const lines = [`! ${filename}`, '!', description, ` ${pitches.length}`, '!'];
	for (const p of pitches) lines.push(` ${typeof p === 'string' ? p : fmtPitch(p)}`);
	return lines.join('\n') + '\n';
}

const files = []; // { name, data: Buffer }
const add = (name, text) => files.push({ name: `${ROOT}/${name}`, data: Buffer.from(text, 'utf8') });
const summary = [];

for (const c of curated) {
	const p = c.preset ? byName[c.preset] : null;
	if (c.preset && !p) throw new Error(`preset not found: ${c.preset}`);
	const scale = c.ratios ?? scaleCents(p);
	const gamut = c.gamut ?? gamutCents(p);
	const tag = 'PitchGrid Tuning Pack - pitchgrid.io';
	add(`scales/${c.file}.scl`, scl(`${c.file}.scl`, `${c.title}. ${tag}`, scale));
	add(`keyboard-gamuts/${c.file}-gamut.scl`,
		scl(`${c.file}-gamut.scl`, `${c.title}, full keyboard gamut (${c.gamutNote ?? `${gamut.length} notes`}). ${tag}`, gamut));
	summary.push({ file: c.file, notes: scale.length, gamut: gamut.length,
		pitches: scale.map((x) => (typeof x === 'string' ? x : x.toFixed(1))).join(' ') });
}

// Every TAMNAMS EDO-MOS preset from the Move module (names: "<mos>-<N>EDO <xLys> <hardness>").
const tamnams = presets.slice(20);
for (const p of tamnams) {
	const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	add(`tamnams-edo-mos/${slug}.scl`, scl(`${slug}.scl`, `${p.name} (TAMNAMS EDO-MOS). PitchGrid Tuning Pack - pitchgrid.io`, scaleCents(p)));
}

add('README.md', fs.readFileSync(path.join(here, 'GUIDE.md'), 'utf8'));
files.sort((a, b) => a.name.localeCompare(b.name));

// --- minimal deterministic ZIP writer (stored entries) ---
function zip(entries) {
	const dosTime = 0; // 00:00:00
	const dosDate = ((2026 - 1980) << 9) | (10 << 5) | 8; // 2026-10-08
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const e of entries) {
		const name = Buffer.from(e.name, 'utf8');
		const crc = zlib.crc32(e.data) >>> 0;
		const lh = Buffer.alloc(30);
		lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
		lh.writeUInt16LE(0, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
		lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(e.data.length, 18); lh.writeUInt32LE(e.data.length, 22);
		lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
		locals.push(lh, name, e.data);
		const ch = Buffer.alloc(46);
		ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
		ch.writeUInt16LE(0, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14);
		ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(e.data.length, 20); ch.writeUInt32LE(e.data.length, 24);
		ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(0, 30); ch.writeUInt32LE(0, 34); ch.writeUInt32LE(0, 38);
		ch.writeUInt32LE(offset, 42);
		centrals.push(ch, name);
		offset += 30 + name.length + e.data.length;
	}
	const cd = Buffer.concat(centrals);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, cd, end]);
}

fs.writeFileSync(OUT, zip(files));
console.log(`wrote ${path.relative(repo, OUT)}: ${files.length} files`);
console.table(summary);
