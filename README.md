# Milos Lazovic - Dev Portfolio

Personal AI-powered portfolio built with Angular 21 + Signals. Features an interactive assistant that can answer questions about my experience, projects, and skills.

## Live Site
[milos-lazovic-portfolio.area36000.com](https://milos-lazovic-portfolio.area36000.com)

## Features
- AI Assistant
- PWA with auto-update notifications
- Background music player
- Commit history viewer
- Auto-versioning on every build

## Tech Stack
- Angular 21 + Signals
- TypeScript
- PWA / Service Worker
- SweetAlert2
- Node.js build scripts

## Scripts

| Command | Description |
|---|---|
| `npm run deploy` | Clean, bump version, commit, build production, push |
| `npm run bProd` | Production build only |
| `npm run bDev` | Development build with watch |
| `npm run clean` | Remove dist and cache |
| `npm run cleanF` | Full clean including node_modules |

## Build Pipeline
Every `npm run deploy` automatically:
1. Bumps patch version in `package.json`
2. Prompts for commit message and optional description
3. Generates `version.json` with git info and commit history
4. Builds for production
5. Pushes to origin
