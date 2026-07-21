# Chromatic — Sequence Memory Game

A Simon-style sequence memory game with three modes, a colorblind-safe mode, and local high-score tracking per mode.

## Features
- **Classic / Reverse / Speed Rush** modes, each with its own saved best score
- **Colorblind-safe mode** — shapes on pads, not just color
- Circular board with a streak ring that fills as your streak grows
- Sound toggle with real tones per pad
- No backend required — scores persist in `localStorage`

## Run locally
```bash
npm install
npm run dev
```
Then open the local URL Vite prints (usually `http://localhost:5173`).

## Build for deployment
```bash
npm run build
```
This outputs a static `dist/` folder you can deploy to GitHub Pages, Vercel, or Netlify exactly like your other projects.

### Deploying to GitHub Pages
1. Push this folder to a new repo.
2. Add `"homepage": "https://<username>.github.io/<repo-name>"` to `package.json`.
3. Install `gh-pages`: `npm install --save-dev gh-pages`
4. Add to `package.json` scripts: `"deploy": "gh-pages -d dist"`
5. Run `npm run build && npm run deploy`

## Future: shared backend
If this game gets folded into a larger multi-game hub with its own database, replace the `useBestScores` hook in `src/App.jsx` with calls to that shared backend instead of `localStorage` — everything else stays the same.
