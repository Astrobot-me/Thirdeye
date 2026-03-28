# Copilot Instructions for audio_pay (Gemini Live API Web Console)

This is a React-based web application that provides a console for interacting with Google's Gemini Live API over WebSocket, with real-time audio streaming, media capture, and AI tool integration.

## Build, Test, and Lint Commands

**Development Server:**
```bash
npm start              # Start dev server at http://localhost:3000
npm run start-https    # Start with HTTPS enabled (required for microphone/webcam access)
```

**Production Build:**
```bash
npm run build          # Create optimized production bundle in build/
```

**Testing:**
```bash
npm test               # Run Jest + React Testing Library in watch mode
                       # Runs *.test.tsx files, press 'a' to run all or 'p' to filter by filename
```

**Linting:**
This project uses Create React App's built-in ESLint configuration (`react-app`, `react-app/jest`). ESLint runs automatically during dev server and tests. Lint warnings must be zero before opening a PR.

## High-Level Architecture

### Core Layers

1. **API & WebSocket Communication** (`lib/genai-live-client.ts`, `hooks/use-live-api.ts`)
   - Wraps Google's `@google/genai` SDK with event emitters for browser-friendly communication
   - Manages WebSocket lifecycle, reconnection, and message handling
   - Emits events: `toolcall`, `message`, `connect`, `disconnect`, `error`, etc.

2. **State Management** (`contexts/LiveAPIContext.tsx`)
   - Central context combining `useLiveAPI` (API state) and `useModeController` (UI mode state)
   - All components subscribe via `useLiveAPIContext()` hook
   - Uses Zustand for logger state

3. **Media Processing** (`lib/audio-recorder.ts`, `lib/audio-streamer.ts`, `lib/audioworklet-registry.ts`)
   - `AudioRecorder`: Captures microphone input, applies VAD (Voice Activity Detection), sends to Live API
   - `AudioStreamer`: Plays audio responses from the model
   - Worklets in `lib/worklets/`: AudioWorklet scripts (Web Audio API) run in separate thread for real-time processing

4. **Media Capture** (`hooks/use-webcam.ts`, `hooks/use-screen-capture.ts`, `hooks/use-media-stream-mux.ts`)
   - Hooks manage browser media streams (microphone, camera, screen)
   - `use-media-stream-mux.ts`: Multiplexes multiple streams for the Live API

5. **UI Components** (`components/`)
   - `control-tray/`: Button/mode selector for recording, screen share, settings
   - `side-panel/`: Displays conversation history and model logs
   - `logger/`: Real-time log view for debugging
   - `settings-dialog/`: Configure model, system prompts, tools
   - `audio-pulse/`: Visual feedback for audio levels
   - `tools/`: Custom tool implementations (e.g., `altair/` for data visualization)

6. **Configuration & Utilities** (`configs/`, `lib/utils.ts`)
   - Active mode prompts, tool declarations, default settings
   - Logger utilities with Zustand store

### Data Flow

1. User speaks into microphone → `AudioRecorder` captures audio, applies VAD
2. Audio frames → Live API via WebSocket (managed by `genai-live-client.ts`)
3. Model response (audio + tool calls) → `AudioStreamer` plays response, UI renders tool outputs
4. Tool execution results → sent back to model for next turn

## Key Conventions

### File Organization & Naming

- **React Components**: `PascalCase` filenames in `src/components/[folder]/ComponentName.tsx`
- **Hooks**: `kebab-case` filenames in `src/hooks/use-example.ts` (e.g., `use-live-api.ts`)
- **Utilities & Lib**: `kebab-case` filenames in `src/lib/` (e.g., `audio-recorder.ts`, `genai-live-client.ts`)
- **Styles**: SCSS files mirror component structure; use 2-space indentation

### TypeScript & Strict Mode

- `tsconfig.json` enforces `"strict": true`; all code must be type-safe
- Prefer exported types (e.g., `export type LiveClientOptions`) over inline types
- Props interfaces typically named `ComponentNameProps` or have explicit names like `UseLiveAPIResults`

### React Patterns

- **Function components only**; no class components
- **Hooks for logic**: Extract reusable state/effects into custom hooks in `src/hooks/`
- **Context for global state**: `LiveAPIContext` is the single source of truth for API & UI mode state
- **Prop drilling**: Avoid by using context or lifting state; prefer composition with children over heavily nested prop passing

### Event-Driven Architecture

- Many subsystems use event emitters (e.g., `EventEmitter3` in `@google/genai`)
- Components subscribe to events in `useEffect` and unsubscribe on cleanup
- Example pattern:
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

### Environment & Configuration

- Secrets (API keys) only in `.env` prefixed with `REACT_APP_` (CRA standard); never commit real credentials
- Example: `REACT_APP_GEMINI_API_KEY` is read in components via `process.env.REACT_APP_GEMINI_API_KEY`

### Git & Code Review

- Commits: Clear imperative subjects (e.g., `fix: handle null media stream`, `feat: add screen capture hook`)
- PR requirements:
  - Sign Google CLA (see `CONTRIBUTING.md`)
  - Zero lint warnings
  - Include tests for user-visible changes and critical logic
  - Link related issues; attach screenshots/GIFs for UI changes
  - Update documentation if applicable

## Common Tasks

**Adding a new tool to the Live API:**
1. Define the function declaration in a new `src/components/tools/YourTool/YourTool.tsx`
2. Export `declaration` (FunctionDeclaration) and the component
3. Register in settings or mode configurations (e.g., in the system prompt or tools array passed to the model)
4. Handle the `toolcall` event in your component via `useEffect` with `client.on('toolcall', handler)`

**Capturing new media type (e.g., external feed):**
1. Create a new hook in `src/hooks/use-new-media.ts` following the pattern of `use-webcam.ts`
2. Use `use-media-stream-mux.ts` to add your stream to the Live API input
3. Expose controls in `control-tray/` or `settings-dialog/`

**Debugging audio or API communication:**
1. Check the logger panel in the UI (bottom right) for real-time logs
2. Open browser DevTools Console for client-side errors
3. Use `use-live-api.ts` emit events (logged automatically) to trace message flow
