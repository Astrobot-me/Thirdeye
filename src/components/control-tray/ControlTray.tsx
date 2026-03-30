/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from "classnames";

import { memo, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Modality } from "@google/genai";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import { ACTIVE_MODE_SYSTEM_PROMPT, PASSIVE_MODE_SYSTEM_PROMPT } from "../../lib/active-mode-prompt";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import SettingsDialog from "../settings-dialog/SettingsDialog";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  enableEditingSettings?: boolean;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button className="action-button" onClick={stop}>
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button className="action-button" onClick={start}>
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    ),
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
  enableEditingSettings,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const videoStreamingRef = useRef(true);
  const isReconnectingRef = useRef(false);

  const { client, connected, connect, disconnect, volume, mode, toggleMode, updateLastAudioEndTime, setConfig, config } =
    useLiveAPIContext();

  const previousModeRef = useRef(mode);

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };

    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  // Build config based on current mode, preserving existing audio/voice settings
  const buildModeConfig = useCallback(() => {
    const systemPrompt =
      mode === "active"
        ? ACTIVE_MODE_SYSTEM_PROMPT
        : PASSIVE_MODE_SYSTEM_PROMPT;

    const toolDeclarations: any =
      mode === "active"
        ? [
            {
              name: "announce_hazard",
              description: "Alert about hazards or obstacles in the environment",
              parameters: {
                type: "OBJECT",
                properties: {
                  type: {
                    description: "Type of hazard (e.g., obstacle, step, moving object)",
                    type: "STRING",
                  },
                  direction: {
                    description: "Spatial direction of the hazard",
                    type: "STRING",
                  },
                  urgency: {
                    description: "Urgency level of the warning",
                    type: "STRING",
                  },
                },
                required: ["type", "direction", "urgency"],
              },
            },
            {
              name: "describe_person",
              description: "Describe a person in the user's vicinity",
              parameters: {
                type: "OBJECT",
                properties: {
                  distance: {
                    description: "Approximate distance in meters",
                    type: "STRING",
                  },
                  direction: {
                    description: "Spatial direction relative to user",
                    type: "STRING",
                  },
                  emotion: {
                    description: "Perceived emotional state",
                    type: "STRING",
                  },
                },
                required: ["distance", "direction", "emotion"],
              },
            },
            {
              name: "read_text",
              description: "Read visible text from the environment",
              parameters: {
                type: "OBJECT",
                properties: {
                  content: {
                    description: "The text content",
                    type: "STRING",
                  },
                  source: {
                    description: "Type of text source",
                    type: "STRING",
                  },
                },
                required: ["content", "source"],
              },
            },
            {
              name: "navigation_cue",
              description: "Provide navigation instruction",
              parameters: {
                type: "OBJECT",
                properties: {
                  instruction: {
                    description:
                      "Navigation instruction (e.g., 'Turn left', 'Continue straight')",
                    type: "STRING",
                  },
                },
                required: ["instruction"],
              },
            },
          ]
        : [];

    // Merge with existing config to preserve responseModalities, speechConfig, etc.
    // Ensure audio modality is always set (required for Live API)
    const newConfig: any = {
      ...config,
      responseModalities: config.responseModalities || [Modality.AUDIO],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    };

    if (toolDeclarations.length > 0) {
      newConfig.tools = [{ functionDeclarations: toolDeclarations }];
    } else {
      // Remove tools in passive mode
      delete newConfig.tools;
    }

    return newConfig;
  }, [mode, config]);

  // Handle mode switching - reconnect to apply new config
  useEffect(() => {
    // Skip on initial render or if not connected
    if (previousModeRef.current === mode) return;
    previousModeRef.current = mode;

    if (!connected || isReconnectingRef.current) return;

    const reconnectWithNewMode = async () => {
      isReconnectingRef.current = true;
      
      // Build and set the new config
      const newConfig = buildModeConfig();
      setConfig(newConfig);
      
      // Disconnect and reconnect to apply the new config
      await disconnect();
      
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await connect();
      isReconnectingRef.current = false;
    };

    reconnectWithNewMode();
  }, [mode, connected, disconnect, connect, setConfig, buildModeConfig]);

  // Auto-start webcam when entering Active mode (if supported and no video active)
  useEffect(() => {
    if (mode === "active" && supportsVideo && !activeVideoStream && connected) {
      webcam.start().then((stream) => {
        setActiveVideoStream(stream);
        onVideoStreamChange(stream);
      }).catch((err) => {
        console.warn("Could not auto-start webcam for Active mode:", err);
      });
    }
  }, [mode, supportsVideo, activeVideoStream, connected, webcam, onVideoStreamChange]);

  // Set initial config on mount based on mode
  useEffect(() => {
    const initialConfig = buildModeConfig();
    setConfig(initialConfig);
  }, [buildModeConfig, setConfig]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      // Only send video frames if in Active mode
      if (mode === "active" && videoStreamingRef.current) {
        const ctx = canvas.getContext("2d")!;
        canvas.width = video.videoWidth * 0.25;
        canvas.height = video.videoHeight * 0.25;
        if (canvas.width + canvas.height > 0) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL("image/jpeg", 1.0);
          const data = base64.slice(base64.indexOf(",") + 1, Infinity);
          client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
        }
      }

      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef, mode]);

  // Handle tool calls from Gemini when in Active mode
  useEffect(() => {
    if (!connected || mode !== "active") return;

    const onToolCall = (toolCall: any) => {
      const toolName = toolCall.name;
      const toolArgs = toolCall.args;

      let responseContent = "";

      switch (toolName) {
        case "announce_hazard":
          responseContent = `Hazard announced: ${toolArgs.type} to the ${toolArgs.direction}, urgency: ${toolArgs.urgency}`;
          console.log("Tool - Announce Hazard:", toolArgs);
          break;
        case "describe_person":
          responseContent = `Person described: ${toolArgs.distance}m ${toolArgs.direction}, emotion: ${toolArgs.emotion}`;
          console.log("Tool - Describe Person:", toolArgs);
          break;
        case "read_text":
          responseContent = `Text read: "${toolArgs.content}" from ${toolArgs.source}`;
          console.log("Tool - Read Text:", toolArgs);
          break;
        case "navigation_cue":
          responseContent = `Navigation: ${toolArgs.instruction}`;
          console.log("Tool - Navigation Cue:", toolArgs);
          break;
        default:
          responseContent = `Tool ${toolName} executed`;
      }

      // Send tool response back to Gemini
      client.sendToolResponse({
        functionResponses: [
          {
            response: { result: responseContent },
            id: toolCall.id,
          },
        ],
      });
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [connected, client, mode]);

  // Track audio events for speech gate
  useEffect(() => {
    if (!connected || mode !== "active") return;

    const onAudio = () => {
      updateLastAudioEndTime(Date.now());
    };

    client.on("audio", onAudio);
    return () => {
      client.off("audio", onAudio);
    };
  }, [connected, client, mode, updateLastAudioEndTime]);

  //handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className="control-tray">
      <div className={cn("mode-indicator", { active: mode === "active" })}>
        <span className="mode-icon">{mode === "active" ? "👁️" : "📝"}</span>
        <span className="mode-text">{mode === "active" ? "Active Mode" : "Passive Mode"}</span>
        {mode === "active" && <span className="mode-status">• Live</span>}
      </div>
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      <nav className={cn("actions-nav", { disabled: !connected })}>
        <button
          className={cn("action-button mic-button")}
          onClick={() => setMuted(!muted)}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        <div className="action-button no-action outlined">
          <AudioPulse volume={volume} active={connected} hover={false} />
        </div>

        <button
          className={cn("action-button mode-toggle", { active: mode === "active" })}
          onClick={toggleMode}
          aria-label={`Switch to ${mode === "passive" ? "active" : "passive"} mode`}
          title={`${mode === "passive" ? "Passive" : "Active"} mode`}
        >
          <span className="mode-label">
            {mode === "passive" ? "📝" : "👁️"}
          </span>
        </button>

        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              start={changeStreams(screenCapture)}
              stop={changeStreams()}
              onIcon="cancel_presentation"
              offIcon="present_to_all"
            />
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon="videocam_off"
              offIcon="videocam"
            />
          </>
        )}
        {children}
      </nav>

      <div className={cn("connection-container", { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn("action-button connect-toggle", { connected })}
            onClick={connected ? disconnect : connect}
          >
            <span className="material-symbols-outlined filled">
              {connected ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <span className="text-indicator">Streaming</span>
      </div>
      {enableEditingSettings ? <SettingsDialog /> : ""}
    </section>
  );
}

export default memo(ControlTray);
