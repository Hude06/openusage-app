# Contributing to Open Usage

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/open-usage.git
cd open-usage
npm install
npm run dev
```

## Development Workflow

1. Create a feature branch from `main`
2. Write tests first (TDD — red/green/refactor)
3. Implement the feature
4. Run `npm test` and `npm run build` to verify
5. Open a PR with a clear description

## Code Standards

### Testing
- 80% minimum coverage on `src/renderer/lib/`, `src/renderer/hooks/`, `src/shared/`
- Write tests first — TDD is required for new features
- Use vitest + @testing-library/react for component tests
- Existing Playwright E2E tests must not regress

### Design System
This app follows the **Nothing Design System**:

- OLED black background (`#000000`)
- Typography: Doto (hero numbers 36px+), Space Grotesk (body), Space Mono (labels, ALL CAPS)
- Colors: monochrome with status colors on values only — `--accent` (red), `--success` (green), `--warning` (amber)
- No shadows, no gradients, no blur, no bounce animations
- Segmented progress bars over circular gauges
- Spacing creates hierarchy — avoid dividers when spacing suffices

### Commit Messages
Format: `<type>: <description>`
Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Architecture

- **Backend** (`src/main/`): Electron main process — auth, API fetching, SQLite, polling
- **Frontend** (`src/renderer/`): React — single-page dashboard, hooks for data
- **Shared** (`src/shared/`): TypeScript types and IPC channel constants
- **Preload** (`src/preload/`): Context bridge between main and renderer

## What We Accept

- Bug fixes with tests
- Performance improvements with benchmarks
- New data visualizations that use existing backend data
- Accessibility improvements
- Documentation improvements

## What We Don't Accept

- Light mode / theme system (Nothing Design = dark only)
- Plugin architecture
- Cloud sync or multi-device features
- Dependencies that significantly increase bundle size without justification
