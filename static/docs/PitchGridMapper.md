# ![](favicon.png "50") PitchGrid Mapper

**PitchGrid Mapper** is a companion application that bridges your hardware MIDI controller and the PitchGrid plugin. It creates a virtual MIDI device, discovers your controller automatically, and remaps every pad or key to PitchGrid's microtonal note mappings — so you can *play* the scales you design, on real hardware, in real time.

> **Download:** [PitchGrid Mapper v0.2.1](https://github.com/pitchgrid-io/pitchgrid-mapper/releases) (macOS & Windows)

## Why PitchGrid Mapper?

Designing a beautiful microtonal scale in PitchGrid is one thing — playing it expressively on a physical instrument is another. Most MIDI controllers are hardwired to the 12-TET grid and know nothing about your custom tuning. PitchGrid Mapper solves this by sitting between your controller and your DAW, translating every gesture into the correct microtonal pitch.

It supports several families of isomorphic and grid-based controllers out of the box, and additional controllers can be added through simple YAML configuration files.

### Supported Controllers

| Controller | Layout Types |
|---|---|
| **LinnStrument 128** | String-like, Isomorphic |
| **Dualo Exquis** | Isomorphic |
| **Lumatone** | Isomorphic |
| **Launchpad Mini MK3** | Piano-like (Mosaic), Isomorphic |
| **Computer Keyboard** | Piano-like |

## Architecture

PitchGrid Mapper acts as a MIDI relay with intelligence. The signal flow is:

```
Controller → MIDI In → PitchGrid Mapper (remapping) → MIDI Out (virtual port) → PitchGrid VST → DAW
```

When you load a scale in the PitchGrid plugin, it broadcasts the scale structure via **OSC** (Open Sound Control) to the Mapper. The Mapper then recalculates every pad assignment so that the physical layout reflects the new tuning — instantly, with zero manual configuration.

This tight feedback loop means you can twist a knob in PitchGrid, change the generator interval or the number of scale degrees, and immediately see and hear the result on your controller.

## Layout Types

PitchGrid Mapper offers three distinct layout strategies. Each one determines how scale degrees are distributed across the physical grid of your controller.

### Isomorphic Layout

![PitchGrid Mapper — Isomorphic hexagonal layout](/docs/images/PitchGridMapper-Isomorphic.png)

In an isomorphic layout, **every interval pattern looks identical regardless of where you play it on the grid**. A chord shape is a chord shape — transpose it by sliding your hand, and the harmonic relationship is preserved. This is the natural home for honeycomb-style controllers like the Lumatone and Exquis.

The isomorphic property is what makes these layouts so powerful for microtonal music: once you learn a scale pattern, you know it everywhere on the keyboard.

### String-like Layout

![PitchGrid Mapper — LinnStrument 128, string-like layout](/docs/images/PitchGridMapper-LinnStrument.png)

The string-like layout arranges rows as "strings," each tuned to a different starting note — much like a guitar or bass. Scale degrees ascend along each row, and moving vertically jumps by a configurable interval. This feels immediately familiar to string players and works beautifully on the LinnStrument's continuous playing surface.

### Piano-like (Mosaic) Layout

![PitchGrid Mapper — Launchpad Mini MK3, piano-like layout](/docs/images/PitchGridMapper-LaunchPad.png)

The piano-like layout (also called Mosaic) arranges scale degrees in vertical strips, with configurable accidentals on adjacent columns. Think of it as a generalized piano keyboard that adapts to any number of scale degrees and accidentals. This layout is particularly intuitive on grid controllers like the Launchpad, where the visual color coding reinforces the musical structure.

### Lumatone

![PitchGrid Mapper — Lumatone, isomorphic layout](/docs/images/PitchGridMapper-Lumatone.png)

The Lumatone's large hexagonal surface is a perfect match for PitchGrid Mapper's isomorphic layouts. With 280 keys arranged in a honeycomb, it provides an expansive canvas for microtonal exploration. PitchGrid Mapper sends color data to the Lumatone so each key lights up according to its scale degree.

## Web UI

PitchGrid Mapper includes a built-in web interface that launches in your browser. The Web UI provides:

- **Real-time visualization** of the current layout on your controller
- **Layout type selection** (isomorphic, string-like, piano-like)
- **Controller status** and connection monitoring
- **Scale information** received from the PitchGrid plugin

The UI updates live as you interact with the PitchGrid plugin — change a scale parameter, and the Mapper's visualization reflects it immediately.

## Getting Started

1. **Download** the latest release from [GitHub](https://github.com/pitchgrid-io/pitchgrid-mapper/releases)
2. **Launch** PitchGrid Mapper — it will create a virtual MIDI port and start scanning for controllers
3. **Connect** your MIDI controller (the Mapper auto-discovers supported devices)
4. **Open** PitchGrid in your DAW and load a scale — the Mapper receives the tuning via OSC
5. **Route** the Mapper's virtual MIDI output to PitchGrid's MIDI input in your DAW
6. **Play!** Your controller is now mapped to PitchGrid's microtonal scale

## Adding Custom Controllers

PitchGrid Mapper's controller support is defined through YAML configuration files. If your controller isn't in the supported list, you can create a config file that describes:

- The controller's MIDI identity (name, channels)
- Grid dimensions and pad layout
- Available layout types
- Color/LED mapping (if the controller supports visual feedback)

This extensible architecture means the Mapper can grow to support virtually any grid or keyboard controller.

## Download

PitchGrid Mapper is free and open source.

- **Latest release:** [v0.2.1 on GitHub](https://github.com/pitchgrid-io/pitchgrid-mapper/releases)
- **Source code:** [pitchgrid-io/pitchgrid-mapper](https://github.com/pitchgrid-io/pitchgrid-mapper)
- **Platforms:** macOS, Windows
