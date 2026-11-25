# ✨ Shiny Frame Calculator (Pokémon Emerald)

A small web tool that lists the shiny frames for your Pokémon Emerald save and gives you a soft-reset timer to hit them.

**Use it here:** https://thiagobarrado99.github.io/shiny-frame-calculator/

## Features

- **Shiny frame search.** Enter your Trainer ID (TID) and Secret ID (SID) to get every shiny frame with its nature, IVs, ability and PID. Supports Methods 1, 2 and 4 and an optional nature filter.
- **Two-stage timer.**
  1. A countdown (10 seconds by default) tells you when to soft reset (Start + Select + A + B). An orange dot runs along the timeline in its last 5 seconds, with a tick each second and a final beep.
  2. A second countdown, which starts right away, runs to the moment you need to press A to land on your chosen frame.
- **Audio and visual cues** for the last seconds of both countdowns. A dot moves along a 5-second timeline, pulses on each second and plays a tick, then a final beep tells you when to press A. Sounds are scheduled with the Web Audio API so the timing stays accurate.
- **Calibration.** Missed the frame? Pick the frame you actually got from the nearby-frames list and the timer corrects itself for your next try.
- Your inputs are saved in your browser, so they're still there next time.

## How it works

Emerald's RNG always starts from seed `0` at boot and advances once per frame (≈59.7275 fps).
A Pokémon is shiny when `TID ⊕ SID ⊕ PIDhigh ⊕ PIDlow < 8`, so the shiny frames can be computed ahead of time from your TID and SID.

## Running locally

It's a static site with no build step. Open `index.html` in a browser.

## Credits

Made by **Thiago Souza** ([theiagod.com](https://theiagod.com)).
Built with AI assistance (Claude by Anthropic).

Fan-made tool, not affiliated with Nintendo, Game Freak or The Pokémon Company.
