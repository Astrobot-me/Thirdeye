# Session Memory - audio_pay Project

## Project Overview

**Purpose:** A React-based web application providing a console for Google's Gemini Live API over WebSocket, with real-time audio streaming, media capture, and AI tool integration.

**Target Users:** Blind and visually impaired people using smart glasses with AI-powered vision assistance.

**Core Feature:** Active Mode acts as "the eyes of a blind person" - continuously narrating surroundings through camera feed.

---

## Key Architecture Decisions

### Two Operational Modes

| Mode | Behavior |
|------|----------|
| **Passive** | Voice Q&A assistant, responds only when asked |
| **Active** | Proactive scene narration every 3-5 seconds, hazard detection, navigation cues |

### Audio/Video Intervals (Preserved in both modes)

- **Audio:** 128ms chunks (2048 samples at 16kHz) = 8 times/second
- **Video:** 2000ms between frames (0.5 FPS), 25% resolution, max JPEG quality
- Audio is 16× more frequent than video (prioritizes voice quality)

### Model Configuration

- **Model:** `models/gemini-2.5-flash-native-audio-preview-12-2025`
- **Config location:** `src/configs/constant.ts`

---

## Issues Fixed This Session

### 1. Config Not Applied Mid-Session
**Problem:** `setConfig()` only updated React state, didn't reconfigure live WebSocket session.
**Fix:** Disconnect and reconnect when mode changes to apply new system prompt and tools.

### 2. Audio Modality Missing on Reconnect
**Problem:** Error "Cannot extract voices from a non-audio request" when switching modes.
**Fix:** Preserve existing config (responseModalities, speechConfig) when building mode config, ensure `Modality.AUDIO` is always set.

### 3. Probe Message Typo
**Problem:** `" Explain the recieved video frames"` (leading space, typo).
**Fix:** `"Explain the received video frames and go by the system prompt"`

### 4. Video Only in Active Mode (Design Decision Changed)
**Original:** Video frames only sent in Active mode.
**Changed:** Video now streams in both modes when webcam/screen is enabled.

### 5. Auto-Webcam in Active Mode
**Added:** Webcam auto-starts when switching to Active mode (if supported).

### 6. Visual Mode Indicator
**Added:** Badge above control tray showing current mode with:
- Emoji icon (👁️ Active, 📝 Passive)
- Text label ("Active Mode" / "Passive Mode")
- Pulsing "• Live" indicator in Active mode
- Blue glow effect in Active mode

---

## Key Files Modified

| File | Changes |
|------|---------|
| `src/components/control-tray/ControlTray.tsx` | Mode switching with reconnect, auto-webcam, video in both modes, mode indicator UI |
| `src/components/control-tray/control-tray.scss` | Mode indicator styling |
| `src/hooks/useModeController.ts` | Fixed probe message, added setClient for periodic probes |
| `src/configs/constant.ts` | Model changed to gemini-2.5-flash-native-audio-preview-12-2025 |

---

## Active Mode System Prompt Summary

Located in `src/lib/active-mode-prompt.ts`:

**Priority Order:**
1. HAZARD - vehicles, steps, obstacles (immediate interrupts)
2. NAVIGATION - doors, stairs, crossings, signage
3. PEOPLE - approaching persons, direction, distance, intent
4. TEXT - signs, menus, prices, buttons
5. AMBIENT - environment description

**Key Rules:**
- Never silent for more than 4 seconds
- Use spatial language ("to your left", "3 steps ahead")
- No "I can see" - just state facts directly
- Hazards interrupt everything with action first: "Stop. Step down ahead."

---

## Active Mode Tools

Four function declarations registered in Active mode:
1. `announce_hazard` - type, direction, urgency
2. `describe_person` - distance, direction, emotion
3. `read_text` - content, source
4. `navigation_cue` - instruction

---

## Technical Notes

### Mode Switching Flow
1. User toggles mode → `toggleMode()` called
2. `buildModeConfig()` creates new config with correct system prompt + tools
3. `setConfig(newConfig)` updates React state
4. Effect detects mode change → disconnects → waits 100ms → reconnects
5. New session uses updated config

### Speech Gate
- 2-second minimum between proactive utterances
- `canSpeakProactively()` available but not currently enforced
- `updateLastAudioEndTime()` tracks when model stops speaking

### Periodic Probe (Active Mode Only)
- Every 4 seconds sends: "Explain the received video frames and go by the system prompt"
- Triggers model to describe latest camera frames
- Managed in `useModeController.ts`

---

## Pre-existing Issues (Not Fixed)

- Jest tests fail due to `react-syntax-highlighter` ESM import issue (unrelated to Active mode)
- ESLint warning: `mockLogs` unused in `store-logger.ts`
