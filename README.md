# Swiftie Emotion Wheel

An interactive emotion wheel (structure matches [The Junto Institute's](https://www.junto.co.uk/) Emotion & Feeling Wheel) that maps each feeling to a Taylor Swift song, with an embedded Spotify player.

## How it works

Pure static site — no backend, no build step, no dependencies.

- `index.html` / `css/style.css` / `js/wheel.js` — an SVG wheel rendered from `data/wheel.json`: 6 core emotions → mid-tier feelings → fine-grained outer feelings (68 total), matching the reference wheel's exact structure.
- Every ring (core, mid, outer) is clickable wherever a Taylor Swift song has been matched. Clicking shows the song title, album, and a live Spotify embed player (`open.spotify.com/embed`) — no Spotify login required to preview.
- Feelings without a genuine lyric-grounded song match render dimmed and non-interactive rather than forcing a weak pairing.

## Local development

Serve the static files with any static file server, e.g.:

```bash
python3 -m http.server 8765
# open http://localhost:8765/index.html
```

## Deploying

This is a plain static site — deploy the repo root as-is to any static host (AWS Amplify Hosting, GitHub Pages, Netlify, Vercel, S3, etc.) with no build command needed.
