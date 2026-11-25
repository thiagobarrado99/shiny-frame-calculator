# ✨ Gen 3 Shiny Frame Calculator & RNG Timer (Pokémon Emerald)

A free **Gen 3 shiny frame calculator** and **RNG timer** for **Pokémon Emerald**. Enter your Trainer ID (TID) and Secret ID (SID) to list every shiny frame with its nature and IVs. Then use the soft-reset timer to hit that frame and catch a shiny legendary (Rayquaza, Kyogre, Groudon, the Regis), starter or gift Pokémon through RNG manipulation.

**Use it here:** https://thiagobarrado99.github.io/shiny-frame-calculator/

## Features

- **Shiny frame search.** Enter your Trainer ID (TID) and Secret ID (SID) to get every shiny frame with its nature, IVs, ability and PID. Supports Methods 1, 2 and 4 and an optional nature filter.
- **Two-stage timer.**
  1. A countdown (10 seconds by default) tells you when to soft reset (Start + Select + A + B). An orange dot runs along the timeline in its last 5 seconds, pulsing and ticking each second in the last 4, then a final beep.
  2. A second countdown, which starts right away, runs to the moment you need to press A to land on your chosen frame.
- **Audio and visual cues** for the last seconds of both countdowns. A dot moves along a 5-second timeline. In the last 4 seconds it pulses and ticks on each second, then a final beep tells you when to press A. Sounds are scheduled with the Web Audio API so the timing stays accurate.
- **Calibration.** Missed the frame? Pick the frame you actually got from the nearby-frames list and the timer corrects itself for your next try.
- Your inputs are saved in your browser, so they're still there next time.

## Supported games and encounters

- **Pokémon Emerald:** stationary and gift encounters (Method 1, plus Methods 2 and 4).
- **Ruby/Sapphire:** only when the internal clock battery is dry (initial seed `5A0`).
- Not supported: wild encounters (Method H), FireRed/LeafGreen, Ruby/Sapphire with a working battery.

## How it works

Emerald's RNG always starts from seed `0` at boot and advances once per frame (≈59.7275 fps).
A Pokémon is shiny when `TID ⊕ SID ⊕ PIDhigh ⊕ PIDlow < 8`, so the shiny frames can be computed ahead of time from your TID and SID.

## Running locally

It's a static site with no build step. Open `index.html` in a browser.

## Credits

Made by **Thiago Souza** ([theiagod.com](https://theiagod.com)).
Built with AI assistance (Claude by Anthropic).

Fan-made tool, not affiliated with Nintendo, Game Freak or The Pokémon Company.
