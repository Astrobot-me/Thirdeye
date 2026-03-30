# GEMINI.md - Multimodal Live API Web Console

This project is a React-based starter application designed to demonstrate the capabilities of the **Gemini Multimodal Live API** over WebSockets. It enables real-time, bidirectional communication with Gemini using audio, video, and tool-use capabilities.

## Project Overview

*   **Core Technology:** Built with **React (TypeScript)** and the **Google GenAI SDK** (`@google/genai`).
*   **Real-time Interaction:** Uses WebSockets for low-latency, streaming interaction.
*   **Multimodal Capabilities:**
    *   **Audio:** Bidirectional PCM16 audio streaming (microphone input and speaker output).
    *   **Video:** Supports real-time frames from webcam or screen capture.
    *   **Tool Use:** Integrated function calling for specialized tasks (e.g., hazard detection, navigation cues).
*   **Operational Modes:**
    *   **Passive Mode:** Voice-based Q&A without proactive features.
    *   **Active Mode:** Proactive scene narration and environment awareness (optimized for smart glasses accessibility).
*   **Data Visualization:** Supports rendering dynamic graphs using **Vega-Lite/Altair** via tool calls.
*   **State Management:** Utilizes **Zustand** for lightweight state and **React Context** for providing the Live API client.

## Building and Running

### Prerequisites
*   Node.js and npm installed.
*   A Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey).

### Setup
1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```
2.  Create a `.env` file in the root directory and add your API key:
    ```env
    REACT_APP_GEMINI_API_KEY=your_api_key_here
    ```

### Available Scripts
*   **`npm start`**: Runs the app in development mode at `http://localhost:3000`.
*   **`npm run build`**: Compiles the application for production in the `build/` folder.
*   **`npm test`**: Launches the test runner.
*   **`npm run start-https`**: Runs the development server with HTTPS enabled (useful for testing media devices).

## Project Architecture

### Key Directories
*   `src/lib/`: Core logic for the WebSocket client (`genai-live-client.ts`), audio processing (`audio-recorder.ts`, `audio-streamer.ts`), and utility functions.
*   `src/hooks/`: Custom hooks managing API state (`use-live-api.ts`), media streams, and application logic.
*   `src/contexts/`: `LiveAPIContext.tsx` provides the global API client and configuration.
*   `src/components/`:
    *   `control-tray/`: Main UI for managing connection, microphone, and video streams.
    *   `side-panel/`: Displays real-time logs of the communication.
    *   `altair/`: Handles rendering of graphs triggered by Gemini.
*   `src/lib/worklets/`: Audio worklets for high-performance audio processing (volume metering, PCM conversion).

## Development Conventions

*   **Type Safety:** Strict TypeScript usage for all components and logic.
*   **Sass Styling:** Modular CSS using Sass (`.scss`).
*   **Event-Driven:** The `GenAILiveClient` extends `EventEmitter` to handle asynchronous API events.
*   **Context usage:** Always use `useLiveAPIContext()` within the `LiveAPIProvider` to interact with Gemini.
*   **Tool Definitions:** Function declarations for tools are typically located within the components or hooks that handle them (e.g., `ControlTray.tsx` or `Altair.tsx`).
