# ![](favicon.png "50") PitchGrid Scale Mapper

The **[PitchGrid Scale Mapper](/scalemapper)** is a revolutionary tool for composers seeking to expand functional tonality beyond the boundaries of 12-tone equal temperament. Much like György Ligeti explored the structural possibilities beyond traditional harmony, this tool reveals a hidden universe of diatonic scales that preserve the essential musical logic we've internalized from centuries of Western practice.

## The Mathematical Poetry of Scale Transformation

At its heart, the Scale Mapper implements a profound insight: **all diatonic scales are fundamentally connected**. Every scale built from two different interval sizes (where the numbers of each size are coprime) can be mathematically transformed into any other such scale. This isn't merely an academic curiosity—it's a compositional revelation.

The tool visualizes scales as paths through lattice structures, where each node represents a pitch relationship. When you select an origin scale like $(3,5)$ (3 small steps, 5 large steps) and map it to a target scale like $(2,5)$ (the familiar Western diatonic), you're not just changing numbers—you're discovering new musical territories that feel both foreign and familiar.

## The Coprime Tree: A Map of Musical Possibility

The foundation lies in what we call the **coprime tree**—a branching structure that connects all possible diatonic scales through simple transformations:

$$f: (a,b) \rightarrow (a, a+b)$$
$$g: (a,b) \rightarrow (b, a+b)$$

Starting from the simplest two-note scale $(1,1)$, these operations generate every possible diatonic system: $(1,2)$ with three notes, $(2,3)$ with five notes, our familiar $(2,5)$ with seven notes, $(3,5)$ with eight notes, and infinitely onward.

Each node in this tree represents a complete musical universe with its own logic of melody, harmony, and modulation. The Scale Mapper lets you walk between these universes, preserving the essential structural relationships that make music coherent.

## From Structure to Sound: The Composer's Advantage

What makes this tool transformative for composition is its preservation of musical **structure** while expanding tonal **content**. When you map a melody from one scale system to another, several remarkable things happen:

### Melodic Logic Persists
Walking up or down a mapped scale produces melodic lines with the same sense of direction and resolution as familiar diatonic movement. The intervals change, but the underlying logic—the relationships between steps—remains intact.

### Accidentals Gain New Meaning
In mapped scales, what we perceive as chromatic alterations follow the same functional patterns as sharps and flats in traditional harmony. A raised fourth degree still creates tension seeking resolution, even when that "fourth" represents an entirely different interval ratio.

### Modulation Becomes Systematic
Key changes work precisely as you'd expect: alter a single note to shift the modal pattern. But now you're modulating within exotic tonal spaces that offer fresh harmonic colors while respecting the modulatory logic your musical intuition already understands.

## The B-A-C-H Revelation

Consider this striking example: when we map a $(3,5)$ scale into the familiar Western $(2,5)$ system, one particular mode yields the sequence **B-A-C-H**. This isn't coincidence—it demonstrates how the mathematical transformations reveal hidden structural connections across seemingly unrelated musical systems.

As you walk this mapped scale, you create melodic lines that feel both inevitable and surprising. They follow the intervallic logic of the original $(3,5)$ system while speaking in the harmonic vocabulary of Western tonality.

## Artistic Vision: Beyond the Boundaries

For the composer working beyond 12-tone equal temperament, the Scale Mapper offers something unprecedented: **structural continuity across tonal diversity**. You can compose with the confidence that your harmonic intuition remains valid while exploring microtonal territories that would otherwise feel chaotic or arbitrary.

Imagine having access to dozens of distinct tonal systems, each with its own characteristic interval patterns and harmonic colors, yet all navigable using the same fundamental musical logic. This is precisely what the Scale Mapper provides—a bridge between the familiar and the exotic.

The tool reveals that our traditional Western harmony is not the pinnacle of musical logic, but rather one beautiful branch on an infinite tree of possibilities. Each scale system offers its own palette of melodic gestures, harmonic progressions, and modulatory paths.

### The Composer's New Palette

Working with mapped scales, you might discover:
- **Melodic patterns** that feel familiar yet contain interval structures impossible in 12-TET
- **Harmonic progressions** that follow traditional voice-leading while using entirely new pitch relationships  
- **Modulatory sequences** that expand the sense of tonal journey beyond conventional key relationships
- **Timbral opportunities** where the tuning itself becomes an expressive parameter

## Practical Exploration

The Scale Mapper invites experimentation. Try mapping a simple melody from the familiar $(2,5)$ system to $(3,5)$, then to $(5,7)$, observing how the character shifts while the essential melodic gesture remains. Each transformation reveals new aspects of the underlying musical idea.

Use the tool's tuning controls to hear these relationships in sound. The "Tune Target" option lets you hear mapped scales in the tuning system of your choice, making exotic structures accessible through familiar harmonic contexts.

For the composer seeking to extend functional tonality, this tool doesn't abandon tradition—it reveals tradition's true scope. The logic that governs Bach's modulations and Mozart's melodies extends far beyond the twelve-tone system into realms of musical possibility that remain largely unexplored.

The Scale Mapper is an invitation to that exploration, providing the structural foundation that makes coherent composition possible in any diatonic universe you choose to enter.

---

*The Scale Mapper represents a practical implementation of the mathematical insights developed in the full [PitchGrid documentation](/info/PitchGrid), where the theoretical foundations of lattice-based scale mapping are explored in detail.*