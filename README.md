# Swifty Emotion Wheel

An interactive emotion wheel (structure inspired by [The Junto Institute's](https://www.junto.co.uk/) Emotion & Feeling Wheel) that maps each feeling to a Taylor Swift song, with an embedded Spotify player.

## How it works

- `index.html` / `css/style.css` / `js/wheel.js` — a static SVG wheel rendered from `data/wheel.json` (8 core emotions → mid-tier feelings → 36 fine-grained outer feelings, each mapped to a real Taylor Swift song + Spotify track ID).
- Clicking any outer segment shows the song title, album, and a live Spotify embed player (`open.spotify.com/embed`) — no Spotify login required to preview.
- `amplify/functions/spotify-metadata` — an optional AWS Lambda (via Amplify Functions) that exchanges a Spotify Client Credentials token server-side and returns live track metadata (verified title, album art) for the curated track IDs, so the secret never reaches the browser. If unconfigured, the app falls back to the static titles/albums in `data/wheel.json` with no loss of functionality.

## Local development

Serve the static files:

```bash
python3 -m http.server 8765
# open http://localhost:8765/index.html
```

### Optional: live Spotify metadata

1. Create a Spotify app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) to get a Client ID and Client Secret.
2. Copy them into `.env.local` (gitignored):
   ```
   SPOTIFY_CLIENT_ID=your-id
   SPOTIFY_CLIENT_SECRET=your-secret
   ```
3. Set them as sandbox secrets and start the Amplify sandbox:
   ```bash
   npx ampx sandbox secret set SPOTIFY_CLIENT_ID
   npx ampx sandbox secret set SPOTIFY_CLIENT_SECRET
   npx ampx sandbox
   ```
4. Copy the printed Function URL into `js/config.js`:
   ```js
   window.SPOTIFY_METADATA_URL = "https://<your-function-url>";
   ```

## Deploying to AWS Amplify

1. Connect this GitHub repo in the Amplify Console.
2. In **App settings → Environment variables**, add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (same values as `.env.local`).
3. Amplify builds the backend (`amplify/`) and hosts the static frontend on each push.
4. After the first deploy, copy the deployed Function URL from the Amplify Console into `js/config.js` (or wire it up at build time) and redeploy.
