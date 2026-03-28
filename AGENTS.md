# Repository Guidelines

## Project Structure & Module Organization
Core application code lives in `src/`. UI and feature code is organized by concern: `components/` (e.g., `side-panel/`, `control-tray/`), `hooks/`, `contexts/`, `lib/` (audio and API helpers), and `configs/`. Static assets and HTML shell files are under `public/`. Production output is generated to `build/`. Keep docs and product notes in `readme/`, `specification/`, and `specifications/`.

## Build, Test, and Development Commands
Use npm scripts defined in `package.json`:
- `npm start`: Run the CRA dev server on `http://localhost:3000`.
- `npm run start-https`: Start the dev server with HTTPS enabled.
- `npm test`: Run Jest + React Testing Library in watch mode.
- `npm run build`: Create an optimized production bundle in `build/`.

## Coding Style & Naming Conventions
This repo uses TypeScript with `strict` mode (`tsconfig.json`). Prefer React function components and typed props/state. Use `PascalCase` for components (`SettingsDialog.tsx`), `camelCase` for functions/variables, and `kebab-case` for hook filenames (`use-live-api.ts`) and SCSS folders/files where already established. Use 2-space indentation and keep imports grouped (external packages first, then local modules). Rely on CRA ESLint defaults (`react-app`, `react-app/jest`) and keep lint warnings at zero before opening a PR.

## Testing Guidelines
Testing uses Jest + React Testing Library (`react-scripts test`). Place tests as `*.test.tsx` beside or near the feature under test (example: `src/App.test.tsx`). Prefer behavior-focused tests (rendered output, interactions, state changes) over implementation details. Add or update tests for any user-visible change and critical hook/lib logic.

## Commit & Pull Request Guidelines
Git history is currently minimal and informal; use clear, imperative commit subjects (for example, `fix: handle null media stream`). Keep commits focused and logically scoped. All contributions go through GitHub pull requests with code review. Follow `CONTRIBUTING.md`: sign the Google CLA, include a concise PR description, link related issues, and attach screenshots/GIFs for UI changes.

## Security & Configuration Tips
Store secrets only in `.env` (for example, `REACT_APP_GEMINI_API_KEY`) and never commit real credentials. Validate API-dependent flows locally before PR submission.
