# Repository Guidelines for audio_pay

This document provides essential information for agentic coding agents working in this repository. It covers build/test/lint commands, code style guidelines, and project-specific conventions.

## Project Structure & Module Organization

Core application code lives in `src/`. UI and feature code is organized by concern:
- `components/` - UI components organized by feature (e.g., `side-panel/`, `control-tray/`, `logger/`, `settings-dialog/`, `audio-pulse/`, `tools/`)
- `hooks/` - Custom React hooks (kebab-case filenames like `use-live-api.ts`)
- `contexts/` - React context providers
- `lib/` - Audio and API helpers, utilities, worklets
- `configs/` - Configuration files for modes, tools, prompts
- `public/` - Static assets and HTML shell files
- `build/` - Production output (generated)
- `readme/`, `specification/`, `specifications/` - Documentation and product notes

## Build, Test, and Development Commands

Use npm scripts defined in `package.json`:

### Development
- `npm start` - Run the CRA dev server on `http://localhost:3000`
- `npm run start-https` - Start the dev server with HTTPS enabled (required for microphone/webcam access)

### Production Build
- `npm run build` - Create an optimized production bundle in `build/`

### Testing
- `npm test` - Run Jest + React Testing Library in watch mode
- To run a single test file: `npm test -- src/path/to/Component.test.tsx`
- To run tests matching a pattern: `npm test -- --testNamePattern="pattern"`
- To run tests in watch mode for a specific file: `npm test -- src/path/to/Component.test.tsx --watch`
- Press 'a' to run all tests, 'p' to filter by filename, 'q' to quit watch mode

### Linting
- This project uses Create React App's built-in ESLint configuration (`react-app`, `react-app/jest`)
- ESLint runs automatically during dev server and tests
- To manually run linting: `react-scripts --no-cache eslint src --ext .js,.jsx,.ts,.tsx`
- Lint warnings must be zero before opening a PR

### Type Checking
- `npm run typecheck` or `tsc --noEmit` - Run TypeScript type checking
- TypeScript is configured with `"strict": true` in `tsconfig.json`

## Code Style Guidelines

### TypeScript Usage
- This repo uses TypeScript with `strict` mode (`tsconfig.json`)
- All code must be type-safe; avoid `any` type when possible
- Prefer exported types (e.g., `export type LiveClientOptions`) over inline types
- Props interfaces typically named `ComponentNameProps` or have explicit names like `UseLiveAPIResults`

### React & Component Guidelines
- Prefer React function components; no class components
- Use `PascalCase` for component filenames and names (`SettingsDialog.tsx`)
- Extract reusable state/effects into custom hooks in `src/hooks/` (kebab-case filenames)
- Use Context for global state (`LiveAPIContext` is the single source of truth)
- Avoid prop drilling by using context or lifting state; prefer composition with children

### Import Organization
Keep imports grouped in this order:
1. External packages (React, lodash, etc.)
2. TypeScript built-in types
3. Local modules (from `src/`)

Example:
```typescript
import React, { useState, useEffect } from 'react';
import { useLiveAPI } from './hooks/use-live-api';
import { AudioRecorder } from './lib/audio-recorder';
```

### Formatting & Indentation
- Use 2-space indentation (not tabs)
- Prefer single quotes for strings (`'hello'` not `"hello"`)
- Semicolons are required
- No trailing commas in object literals or arrays (except in function parameters)
- Maximum line length of 100 characters
- Empty lines between logical sections in functions

### Naming Conventions
- Components: `PascalCase` (`SettingsDialog.tsx`)
- Functions/variables: `camelCase` (`handleAudioInput`, `isConnected`)
- Hooks: `kebab-case` filenames with `use-` prefix (`use-live-api.ts`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_BUFFER_SIZE`)
- CSS classes/Sass variables: `kebab-case` (`audio-pulse`, `--background-color`)
- Events: `camelCase` (`toolcall`, `messageReceived`)

### Error Handling
- Handle promises with `.catch()` or try/catch for async/await
- For React components, use error boundaries where appropriate
- Log errors to the logger context for debugging UI
- Don't swallow errors; at minimum log them to console
- Validate inputs at function boundaries

### Event-Driven Patterns
Many subsystems use event emitters (e.g., `EventEmitter3` in `@google/genai`):
- Components subscribe to events in `useEffect` and unsubscribe on cleanup
- Standard pattern:
```typescript
useEffect(() => {
  const handler = (event: SomeEvent) => { /* handle */ };
  client.on('eventName', handler);
  return () => client.off('eventName', handler);
}, [client]);
```

### Testing Conventions
- Test files colocate with source: `src/App.test.tsx` tests `src/App.tsx`
- Use React Testing Library for component tests (avoid implementation detail assertions)
- Test user interactions and rendered output, not internal state mutations
- Mocking: Mock `@google/genai` SDK in test setup if needed
- Place tests as `*.test.tsx` beside or near the feature under test
- Prefer behavior-focused tests (rendered output, interactions, state changes) over implementation details

### Environment & Configuration
- Secrets (API keys) only in `.env` prefixed with `REACT_APP_` (CRA standard)
- Example: `REACT_APP_GEMINI_API_KEY` is read in components via `process.env.REACT_APP_GEMINI_API_KEY`
- Never commit real credentials to version control
- Validate API-dependent flows locally before PR submission

## Git & Code Review Guidelines

### Commits
- Use clear, imperative commit subjects (e.g., `fix: handle null media stream`, `feat: add screen capture hook`)
- Keep commits focused and logically scoped
- Reference issue numbers when applicable (e.g., `fix: resolve audio streaming issue #42`)

### Pull Request Requirements
All contributions go through GitHub pull requests with code review:
1. Sign the Google CLA (see `CONTRIBUTING.md`)
2. Include a concise PR description linking related issues
3. Ensure zero lint warnings
4. Include tests for user-visible changes and critical hook/lib logic
5. Attach screenshots/GIFs for UI changes
6. Update documentation if applicable
7. Link to related issues in the PR description

## Common Development Tasks

### Adding a New Tool to the Live API
1. Create the tool component in `src/components/tools/YourTool/YourTool.tsx`
2. Export `declaration` (FunctionDeclaration) and the component
3. Register in settings or mode configurations (e.g., in the system prompt or tools array)
4. Handle the `toolcall` event via `useEffect` with `client.on('toolcall', handler)`

### Capturing New Media Type
1. Create a new hook in `src/hooks/use-new-media.ts` following existing patterns
2. Use `use-media-stream-mux.ts` to add your stream to the Live API input
3. Expose controls in `control-tray/` or `settings-dialog/`

### Debugging Audio or API Communication
1. Check the logger panel in the UI (bottom right) for real-time logs
2. Open browser DevTools Console for client-side errors
3. Use `use-live-api.ts` emit events (logged automatically) to trace message flow
4. Enable VAD debugging in `AudioRecorder` if needed

## Key Architectural Patterns

### Core Layers
1. **API & WebSocket Communication** (`lib/genai-live-client.ts`, `hooks/use-live-api.ts`)
   - Wraps Google's `@google/genai` SDK with event emitters
   - Manages WebSocket lifecycle, reconnection, and message handling
   - Emits events: `toolcall`, `message`, `connect`, `disconnect`, `error`, etc.

2. **State Management** (`contexts/LiveAPIContext.tsx`)
   - Central context combining API state and UI mode state
   - All components subscribe via `useLiveAPIContext()` hook
   - Uses Zustand for logger state

3. **Media Processing** (`lib/audio-recorder.ts`, `lib/audio-streamer.ts`, `lib/audioworklet-registry.ts`)
   - `AudioRecorder`: Captures microphone input, applies VAD, sends to Live API
   - `AudioStreamer`: Plays audio responses from the model
   - Worklets in `lib/worklets/`: AudioWorklet scripts run in separate thread

4. **Media Capture** (`hooks/use-webcam.ts`, `hooks/use-screen-capture.ts`, `hooks/use-media-stream-mux.ts`)
   - Hooks manage browser media streams (microphone, camera, screen)
   - `use-media-stream-mux.ts`: Multiplexes multiple streams for the Live API

5. **UI Components** (`components/`)
   - Organized by feature as described in project structure

6. **Configuration & Utilities** (`configs/`, `lib/utils.ts`)
   - Active mode prompts, tool declarations, default settings
   - Logger utilities with Zustand store