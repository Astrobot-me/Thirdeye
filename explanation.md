# Codebase Explanation: Multimodal Live API Web Console

This project is a React-based starter application designed to showcase and interact with the **Google Gemini Multimodal Live API**. It enables real-time, low-latency communication with Gemini using a combination of audio, video (webcam or screen capture), and text via WebSockets.

## 🏗 High-Level Architecture

The application is built with a clear separation between the API communication layer, media handling, and the UI components.

### 1. API Communication Layer (`src/lib/genai-live-client.ts`)
The `GenAILiveClient` class is the heart of the application. It manages the WebSocket connection to Google's GenAI Live service.
- **EventEmitter**: It inherits from `eventemitter3` to notify the rest of the app about events like `audio`, `content`, `toolcall`, `interrupted`, and `log`.
- **Session Management**: It handles the connection lifecycle, including setup, configuration, and teardown.
- **Multimodal Support**: It provides methods like `sendRealtimeInput` to stream audio/video chunks and `sendToolResponse` for function calling.

### 2. State & Context (`src/contexts/LiveAPIContext.tsx`)
The `LiveAPIProvider` wraps the application and provides access to the `GenAILiveClient` and its state through the `useLiveAPIContext` hook. This ensures that any component in the tree can easily interact with the Gemini session.

### 3. Media Handling (`src/lib/`)
Handling real-time audio and video in the browser is complex, and this project provides robust utilities for it:
- **`audio-recorder.ts`**: Captures microphone input, converts it to the required PCM16 format (usually 16kHz), and streams it to the API. It uses **AudioWorklets** (`audio-processing.ts`) for efficient background processing.
- **`audio-streamer.ts`**: Receives raw audio chun
- ks from Gemini and queues them for playback using the Web Audio API. It ensures smooth playback and handles interruptions.
- **`use-webcam.ts` & `use-screen-capture.ts`**: Custom hooks that simplify the process of capturing and streaming visual data.

### 4. UI Components (`src/components/`)
- **`ControlTray`**: The main interface for the user to toggle the microphone, camera, or screen share. It also provides access to the settings dialog.
- **`Logger`**: A developer-focused view that displays a real-time log of all incoming and outgoing WebSocket messages, including tool calls and content updates.
- **`SidePanel`**: Hosts the Logger and provides a collapsible interface for monitoring the session.
- **`Altair`**: A specialized component that demonstrates **Function Calling**. It listens for a `render_altair` tool call from Gemini and uses `vega-embed` to render interactive charts from JSON data provided by the model.

## 🚀 Key Features

- **Real-time Interaction**: Low-latency voice-to-voice and vision-to-voice capabilities.
- **Function Calling**: Seamlessly integrates custom tools (like the Altair graph renderer) into the model's workflow.
- **Visual Feedback**: Includes an `AudioPulse` component for visual representation of audio activity.
- **Extensible Settings**: Allows users to configure the model (e.g., `gemini-2.0-flash-exp`), system instructions, and voice preferences.

## 🛠 Tech Stack

- **Framework**: React 18 with TypeScript.
- **Styling**: Sass (SCSS) for modular and maintainable styles.
- **API SDK**: `@google/genai` for interacting with Gemini.
- **State Management**: `zustand` for logging and lightweight local state.
- **Data Visualization**: `vega`, `vega-lite`, and `vega-embed`.

## 📂 Project Structure

- `src/components/`: Reusable UI elements.
- `src/contexts/`: React Context providers for global state.
- `src/hooks/`: Custom hooks for API logic and media streams.
- `src/lib/`: Core logic for API client and audio processing.
- `src/lib/worklets/`: AudioWorklet scripts for low-level audio handling.
Here's the content formatted cleanly:

---

## 🛠 Integrating Custom Tools

The Multimodal Live API allows you to extend Gemini's capabilities by providing custom tools (Function Calling). Here is how tools are integrated:

---

### 1. Define the Tool Declaration

A tool is defined using a `FunctionDeclaration` that describes its name, purpose, and parameters. This informs Gemini about what the tool can do.

```typescript
const declaration: FunctionDeclaration = {
  name: "get_weather",
  description: "Returns the current weather for a given location.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: { type: SchemaType.STRING },
    },
    required: ["location"],
  },
};
```

---

### 2. Register the Tool

Register the tool by passing its declaration to the `setConfig` method in the `LiveAPIContext`.

```typescript
setConfig({
  tools: [{ functionDeclarations: [declaration] }],
});
```

---

### 3. Handle Tool Calls

Listen for the `toolcall` event emitted by the `GenAILiveClient`. When Gemini decides to use your tool, this event will fire with the necessary arguments.

```typescript
client.on("toolcall", (toolCall) => {
  const fc = toolCall.functionCalls.find(f => f.name === "get_weather");
  if (fc) {
    // Process the tool call (e.g., fetch real weather data)
  }
});
```

---

### 4. Send Tool Responses

After processing, you **must** send the result back to Gemini so it can continue the conversation.

```typescript
client.sendToolResponse({
  functionResponses: [{
    response: { output: { temperature: 22, condition: "Sunny" } },
    id: fc.id,
    name: fc.name,
  }],
});
```
