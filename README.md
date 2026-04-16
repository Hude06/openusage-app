# Open Usage

A minimal desktop app that shows your Claude and Codex token usage at a glance. Built with the Nothing Design System — OLED black, instrument-panel aesthetic, zero clutter.

[![CI](https://github.com/YOUR_USERNAME/open-usage/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/open-usage/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What It Does

- Monitors Claude (Anthropic) and Codex (OpenAI) token usage in real time
- Shows remaining % for session and weekly windows with countdown timers
- Displays cost tracking, model breakdown (Opus/Sonnet), and credits remaining
- 24-hour usage sparklines powered by local SQLite history
- Configurable polling interval (30s to 5m)
- Native macOS app with hidden titlebar

## Install

### Download

Download the latest `.dmg` from [Releases](https://github.com/YOUR_USERNAME/open-usage/releases).

### Build from Source

```bash
git clone https://github.com/YOUR_USERNAME/open-usage.git
cd open-usage
npm install
npm run dev
```

### Prerequisites

Open Usage reads credentials from your existing CLI tools. You need at least one:

- **Claude CLI** — Credentials at `~/.claude/.credentials.json` or macOS Keychain
- **Codex CLI** — Credentials at `~/.codex/auth.json`

No account creation or OAuth flow required — the app reads tokens your CLIs already have.

## Architecture

```
src/
  main/               Electron main process
    services/
      claudeAuth.ts     OAuth token management (keychain + file)
      claudeReader.ts   Claude API usage fetching
      codexAuth.ts      Codex OAuth token management
      codexReader.ts    Codex API usage fetching
      historyDb.ts      SQLite history (30-day rolling)
      pollScheduler.ts  Background polling orchestration
      settingsStore.ts  User preferences

  renderer/            React frontend
    pages/Home.tsx       Dashboard with service cards
    components/          SegmentedBar, Sparkline, CountdownTimer, etc.
    hooks/               useUsageData, useHistory, useCountdown

  shared/              Shared types and IPC channels
```

**Stack**: Electron 28 + React 18 + Vite 5 + TypeScript + Tailwind CSS

## Development

```bash
npm run dev          # Start dev server + Electron
npm test             # Run unit tests (vitest)
npm run test:watch   # Watch mode
npm run build        # Production build
npm run dist         # Package as DMG/ZIP
```

## Design System

Open Usage follows the [Nothing Design System](https://nothing.tech) principles:

- OLED black (`#000000`) background
- Space Grotesk (body), Space Mono (labels), Doto (hero numbers)
- Segmented progress bars — discrete rectangular blocks
- Monochrome with status colors only on values
- No shadows, no gradients, no blur

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
