# Project Structure Guide (`audio_pay`)

This file explains how the project is organized and how the main runtime flow works.

## 1) Top-Level Layout

- `src/`: Main React + TypeScript application code.
- `public/`: Static assets used by CRA (`index.html`, `favicon.ico`, `robots.txt`).
- `readme/`: Documentation assets/images.
- `build/`: Production build output (`npm run build`).
- `node_modules/`: Installed dependencies.
- `.env`: Runtime env vars (notably `REACT_APP_GEMINI_API_KEY`).
- `package.json`: Scripts and dependency definitions.
- `README.md`: Base project usage docs.
- `explanation.md`: Additional project explanation notes.
- `app.yaml`: Deployment configuration.

## 2) Source Tree (`src/`)

- `App.tsx`: Main composition/wiring entry for UI + providers + active narration integration.
- `index.tsx`: React mount/bootstrap.
- `types.ts`: Shared local TypeScript types.
- `App.scss`, `index.css`: Global app styling.

### `src/components/`

UI components and interaction surfaces.

- `control-tray/`
  - `ControlTray.tsx`: Core real-time controls.
    - Connect/disconnect session.
    - Mic mute/unmute.
    - Webcam/screen stream start/stop.
    - Frame capture + sending realtime image input.
    - Rolling frame buffer and frame-window export for active mode.
  - `control-tray.scss`: Tray styles.

- `side-panel/`
  - `SidePanel.tsx`: Console panel with logs + manual text prompt input.
  - `side-panel.scss`, `react-select.scss`: Panel styles.

- `settings-dialog/`
  - `SettingsDialog.tsx`: Pre-connect model/system/tool settings.
  - `VoiceSelector.tsx`, `ResponseModalitySelector.tsx`: Config controls.

- `logger/`
  - `Logger.tsx`: Renders request/response and tool logs.
  - `mock-logs.ts`: Mock log data.

- `audio-pulse/`
  - `AudioPulse.tsx`: Audio activity visualization.

- `altair/`
  - `Altair.tsx`: Main center UI visual element.

- `tools/`
  - `WeatherTool.tsx`: Example tool integration UI.

### `src/contexts/`

- `LiveAPIContext.tsx`: React context wrapping live API hook state and client methods.

### `src/hooks/`

- `use-live-api.ts`: Main live session hook.
  - Creates `GenAILiveClient`.
  - Connect/disconnect lifecycle.
  - Routes model audio output to speakers.
- `use-webcam.ts`: Webcam stream lifecycle.
- `use-screen-capture.ts`: Screen-capture stream lifecycle.
- `use-media-stream-mux.ts`: Stream result type contract.
- `use-payment.ts`: Payment-related hook (project-specific).

### `src/lib/`

Low-level runtime internals.

- `genai-live-client.ts`: Event-emitting client wrapper around Gemini Live session.
  - Handles setup/content/toolcall/turncomplete/audio events.
  - `sendRealtimeInput(...)` for media chunks.
  - `send(...)` for turn-based content parts.
- `audio-recorder.ts`: Microphone PCM capture.
- `audio-streamer.ts`: Audio playback streaming.
- `audioworklet-registry.ts`: Worklet registration helpers.
- `store-logger.ts`: Log state store.
- `utils.ts`: Utility helpers.
- `worklets/`: Audio processing/worklet scripts.

### `src/modules/active-mode/`

Isolated feature module for Active/Passive narration behavior.

- `ActiveModeContext.tsx`
  - Stores active-mode config/state:
    - `mode` (`passive`/`active`)
    - `activeIntervalMs`
    - `activeCaptureFps`
    - `activeFrameWindowMs`
    - `requireVideoForActive`
    - runtime status (`idle`, `waiting_for_frame`, `requesting_frame`, `narrating`)

- `ActiveModeControls.tsx`
  - UI controls in side panel:
    - Mode toggle
    - Interval
    - Capture FPS
    - Frame window size
    - Require video checkbox
    - Runtime status badge

- `ActiveNarrationManager.tsx`
  - Active loop orchestration:
    - Waits until connected + active mode.
    - Requests a multi-frame window from `ControlTray`.
    - Sends keyframes + narration prompt in one turn.
    - Waits for `turncomplete`, then schedules next turn.

- `active-mode-controls.scss`: Styles for active module UI.
- `index.ts`: Module exports.

## 3) Runtime Data Flow

### Passive mode

1. User types a message in `SidePanel`.
2. `client.send([{ text }])` is sent.
3. Gemini Live returns content/audio.
4. Logs update in `Logger`.

### Active mode

1. User switches mode to `Active` in `ActiveModeControls`.
2. `ActiveNarrationManager` loop starts.
3. `ControlTray` keeps capturing frames at configured FPS and maintains rolling window.
4. On each active cycle:
   - manager requests current keyframe window,
   - sends images (oldest -> newest) + grounding prompt in same turn,
   - waits for `turncomplete`,
   - schedules next cycle after configured interval.

## 4) Important Integration Points

- App-level module wiring:
  - `App.tsx` wraps UI with `LiveAPIProvider` and `ActiveModeProvider`.
  - `App.tsx` passes frame-window requester from `ControlTray` to `ActiveNarrationManager`.

- Side panel integration:
  - `SidePanel.tsx` mounts `ActiveModeControls`.

- Live client turn pacing:
  - `ActiveNarrationManager` relies on `turncomplete` event from `genai-live-client.ts`.

## 5) Key Configuration Knobs (Current)

- Active loop interval: `activeIntervalMs` (default 3000ms).
- Capture FPS: `activeCaptureFps` (default 2 fps, UI range 1-10).
- Window size: `activeFrameWindowMs` (default 3000ms, UI range 1000-10000ms).
- Video requirement: `requireVideoForActive`.

## 6) Debugging Pointers

- If active narration says it cannot see context:
  - ensure webcam/screen stream is active,
  - check Active status badge in side panel,
  - verify logs in `Logger` for `active.mode` entries.

- If cadence is too slow/fast:
  - tune `activeIntervalMs`, `activeCaptureFps`, `activeFrameWindowMs`.

## 7) Minimal Mental Model

- `ControlTray` = media capture + transport producer.
- `GenAILiveClient` = live protocol bridge/event bus.
- `ActiveNarrationManager` = autonomous loop controller.
- `SidePanel` = human control + observability.
