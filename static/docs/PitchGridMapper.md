# ![](favicon.png "50") PitchGrid Mapper

**PitchGrid Mapper** is a universal bridge between PitchGrid's microtonal scales and isomorphic MIDI controllers. It lets you play PitchGrid scales on hardware controllers like the LinnStrument, Exquis, Launchpad, and Lumatone — with real-time visualization and configurable layouts.

**[Download the latest release](https://github.com/pitchgrid-io/pitchgrid-mapper/releases)**

---

## How It Works

PitchGrid Mapper sits between your physical controller and the PitchGrid plugin in your DAW:

1. Your **MIDI controller** sends note data to PitchGrid Mapper
2. The Mapper **remaps** those notes according to the current PitchGrid scale (received via OSC from the plugin)
3. The remapped notes are sent out through a **virtual MIDI device** to your DAW and the PitchGrid plugin

This means any supported controller becomes a microtonal instrument — playing the exact scale you've dialed in with PitchGrid, with consistent fingering patterns across all keys.

```
Controller → MIDI In → PitchGrid Mapper → MIDI Out (Virtual) → PitchGrid VST → DAW
                              ↑
                    OSC scale data from PitchGrid plugin
```

## Supported Controllers

- **Computer Keyboard** — always available, no hardware needed
- **LinnStrument 128** — Roger Linn's expressive grid controller
- **Exquis** — Intuitive Instruments' isomorphic MPE controller
- **Launchpad Mini MK3** — Novation's affordable pad grid
- **Lumatone** — the 280-key isomorphic keyboard

Additional controllers can be added through simple YAML configuration files. If your controller isn't listed, you can define its grid dimensions, MIDI mapping, and physical layout to get it working.

## Layout Types

PitchGrid Mapper offers three fundamentally different ways to map scales onto your controller's grid:

### Isomorphic Layout

![PitchGrid Mapper — Isomorphic Layout](/docs/images/PitchGridMapper-Isomorphic.png)

The isomorphic layout arranges notes on a hexagonal honeycomb grid where **every scale pattern looks identical regardless of position**. Moving in one direction always means the same interval change. This is the most natural layout for exploring PitchGrid scales — transposing is simply a matter of shifting your hand.

Controls: root position, skew, rotate, reflect.

### String-Like Layout

![PitchGrid Mapper — LinnStrument String-Like Layout](/docs/images/PitchGridMapper-LinnStrument.png)

Rows act as "strings" tuned to different intervals — like a guitar or bass, but generalized to any PitchGrid scale. This is familiar territory for string players and works especially well with the LinnStrument's rectangular grid.

Controls: string orientation, row offset, root position.

### Piano-Like (Mosaic) Layout

![PitchGrid Mapper — Launchpad Piano-Like Layout](/docs/images/PitchGridMapper-LaunchPad.png)

Scale degrees are arranged in strips with accidentals placed in a configurable direction. This mirrors the logic of a piano keyboard — "white keys" and "black keys" — but generalized to any MOS scale. Useful for musicians coming from a keyboard background.

Controls: strip orientation, strip width, accidental direction, root position.

## The Lumatone

![PitchGrid Mapper — Lumatone Isomorphic Layout](/docs/images/PitchGridMapper-Lumatone.png)

The 280-key Lumatone is the ultimate canvas for PitchGrid scales. With its enormous hexagonal grid, it can display multiple octaves of any scale with room to spare, making it ideal for exploring the full range of PitchGrid's tuning possibilities.

## Getting Started

### Installation

1. Download the latest release from [GitHub](https://github.com/pitchgrid-io/pitchgrid-mapper/releases)
2. Run the application — a virtual MIDI device called "PitchGrid Mapper" is created automatically
3. In your DAW, set MIDI input to "PitchGrid Mapper"
4. Route that to the PitchGrid plugin
5. In the PitchGrid plugin, enable OSC output to `localhost:9000`

### Using the Web UI

Once PitchGrid Mapper is running, open your browser to `http://localhost:8080`. The web UI shows:

- **Controller selection** — choose your connected controller
- **Layout type** — switch between isomorphic, string-like, and piano-like
- **Real-time visualization** — see how your scale maps onto the controller's grid
- **Transformation controls** — shift, skew, rotate, and reflect the layout
- **Connection status** — virtual MIDI and OSC connection indicators

Changes apply in real-time — adjust the layout while playing and hear the results immediately.

## Adding Custom Controllers

If your controller isn't supported out of the box, you can add it by creating a YAML configuration file. Define the device name, grid dimensions, row structure, and physical layout:

```yaml
DeviceName: "MyController"
MIDIDeviceName: "MyController MIDI"
NumRows: 8
RowLengths: [16, 16, 16, 16, 16, 16, 16, 16]
HorizonToRowAngle: 0.0
RowToColAngle: 90.0
xSpacing: 19.0
ySpacing: 19.0
```

See the existing controller configs in the [GitHub repository](https://github.com/pitchgrid-io/pitchgrid-mapper) for complete examples.

## Open Source

PitchGrid Mapper is open source and available on [GitHub](https://github.com/pitchgrid-io/pitchgrid-mapper). Contributions are welcome — whether that's adding support for new controllers, improving layouts, or enhancing the web UI.
