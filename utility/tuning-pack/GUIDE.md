# PitchGrid Tuning Pack

Thanks for joining the PitchGrid mailing list. This pack has Scala (`.scl`) tuning files
taken from the PitchGrid presets. They work in any synth that loads Scala files,
for example Surge XT, Vital and Pianoteq, and many others.

```
scales/            19 curated scales, one file per scale (5 to 11 notes)
keyboard-gamuts/   the same 19 tunings as full chromatic gamuts for a normal keyboard
tamnams-edo-mos/   171 more scales: every TAMNAMS EDO-MOS preset from PitchGrid for Ableton Move
```

**Which file should I use?** A file in `scales/` puts one scale step on every key, so
white and black keys all play scale notes. A file in `keyboard-gamuts/` gives you the
whole tuning across the keys, the way 12-TET does on a piano. Every file starts on 1/1;
set the root note and reference pitch in your synth (or with a `.kbm` file).

**Skip the files.** The PitchGrid plugin (VST3/AU/CLAP Note Effect, macOS and Windows)
makes all of these live. Pick a preset and turn the *skew* and *stretch* knobs
to move smoothly between them. The plugin retunes your synths over MPE or MTS-ESP and
maps any scale to the piano keys. 14-day free trial, no card:
https://pitchgrid.io/download?utm_source=tuning-pack&utm_medium=readme

---

## 10 tunings to start with

Values are in cents (1200 cents = one octave; a 12-TET semitone is 100).

### 1. Pythagorean (`01-pythagorean`)
Every fifth is a pure 3/2 (702.0 cents), so the major thirds come out wide at 81/64
(407.8). Open fifths and fourths sound very clean and the thirds sound bright and a bit
restless. This is the tuning of medieval organum and of most string players' open strings.
*Plugin preset: Pythagorean.*

### 2. Quarter-comma meantone (`02-quarter-comma-meantone`)
This is the Renaissance keyboard tuning. The fifths are made slightly narrow (696.6) so
that four of them give a pure 5/4 major third (386.3). Triads sound sweet and calm. The
12-note gamut spans Eb to G#, so the G#–Eb "wolf" fifth is badly out of tune. Avoid it
or use it on purpose. *Plugin preset: 1/4-comma Meantone.*

### 3. Just intonation, 5-limit major (`03-just-intonation`)
1/1 9/8 5/4 4/3 3/2 5/3 15/8. The I, IV and V triads are perfectly pure. The ii chord
is not: D–A is 40/27 (680 cents), so try a D minor chord to hear why pure tuning and
free modulation don't go together. *Plugin preset: Just Intonation.*

### 4. Half-comma cleantone (`04-half-comma-cleantone`)
This is a PitchGrid idea. The fifths (701.9) and major thirds (386.3) are both close to
pure, and to make that possible the octave is stretched to 1210.7 cents. Chords sound
very clean, and the stretched octave suits piano-like sounds, whose overtones run sharp anyway.
*Plugin preset: 1/2-comma Cleantone.*

### 5. 19-EDO diatonic (`05-19edo-diatonic`)
Nineteen equal steps per octave. Fifths are 694.7, major thirds 378.9 and minor thirds
315.8 (almost exactly 6/5). It works much like meantone, but you can modulate as much as
you like. The 19-note gamut gives you separate C# and Db.
*Plugin preset: 19-TET.*

### 6. 22-EDO superpyth diatonic (`06-22edo-superpyth-diatonic`)
This one goes the other way: wide fifths (709.1) and a major third of 436.4, close to the
septimal 9/7. Major chords sound bright and tense. The scale degrees are the same as in 12-TET,
but the sound is quite different.

### 7. Mavila, 16-EDO (`07-mavila-16edo`)
The "anti-diatonic" scale. The fifths are very flat (675), so step patterns that should
sound major sound minor, and the other way round. It's a great way to make familiar
melodies sound strange. *Plugin preset: Mavila (16-TET, 16 keys/8ve).*

### 8. Bohlen–Pierce (`08-bohlen-pierce-13edt`)
This scale repeats at the 3/1 twelfth (1902 cents) instead of the octave, divided into
13 equal steps. The 9-note mode approximates odd-harmonic ratios such as 9/7, 7/5, 5/3
and 7/3. It sounds best with clarinet-like timbres that have mostly odd harmonics.
*Plugin preset: Bohlen-Pierce.*

### 9. Orwell[9] in 22-EDO (`09-orwell9-22edo`)
A 9-note scale built from a chain of 272.7-cent generators. Seven of them land just
above the 3/1 twelfth. It has plenty of septimal intervals and clear, singable melodies.
*Plugin preset: Orwell[9].*

### 10. Magic[7] (`10-magic7`)
This scale is built from a chain of slightly flat major thirds (about 381 cents, near
5/4). Five of them come close to 3/1. It has clusters of small steps and large gaps,
so it sounds unlike any church mode. *Plugin preset: Magic7.*

## More to explore
- `11`–`18`: 17-EDO diatonic, Dicot 7L3s, Mavila 9-EDO, Orwell in 13-EDO,
  Porcupine[8], three Machine[6] whole-tone-like scales.
- `19-slendric11`: an 11-note scale from a chain of 8/7-like steps; three of them make a 3/2.
- `tamnams-edo-mos/`: 171 moment-of-symmetry scales with TAMNAMS names. Each scale
  comes in up to four EDO tunings (eq/b/h/s = equalized, basic, hard, soft); for
  example, `pent-12edo-2l3s-s` is the familiar minor pentatonic.

## Where these come from
The pitches come from the PitchGrid factory presets (the same table that ships in
PitchGrid for Ableton Move) using the scalatrix library. Where a preset is named after
an equal division (19EDO, 13EDT, …), the pitches are snapped exactly to it.

You can use these files in your own music and projects, including commercial ones.
Please share a link to https://pitchgrid.io instead of re-uploading the pack.

PitchGrid is made by Peter Jung, Bayes GmbH, Cologne · peter@pitchgrid.io
