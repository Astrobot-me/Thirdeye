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

import {
  memo,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import SettingsDialog from "../settings-dialog/SettingsDialog";

export type FrameSnapshot = {
  timestampMs: number;
  data: string;
};

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  onVideoFrameSent?: (timestampMs: number) => void;
  registerFrameRequester?: (
    (requester: (() => Promise<number | null>) | null) => void
  ) | undefined;
  registerFrameSnapshotRequester?: (
    (requester: (() => Promise<FrameSnapshot | null>) | null) => void
  ) | undefined;
  registerFrameWindowRequester?: (
    (requester: (() => Promise<FrameSnapshot[]>) | null) => void
  ) | undefined;
  activeCaptureFps?: number;
  activeFrameWindowMs?: number;
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
  onVideoFrameSent = () => {},
  registerFrameRequester,
  registerFrameSnapshotRequester,
  registerFrameWindowRequester,
  activeCaptureFps = 2,
  activeFrameWindowMs = 3000,
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
  const frameBufferRef = useRef<FrameSnapshot[]>([]);

  const safeCaptureFps = Math.max(1, activeCaptureFps);
  const safeFrameWindowMs = Math.max(1000, activeFrameWindowMs);
  const frameCaptureIntervalMs = Math.max(
    100,
    Math.round(1000 / safeCaptureFps),
  );
  const frameKeyframeCount = useMemo(() => {
    const estimatedFrameCount = Math.max(
      3,
      Math.round((safeFrameWindowMs / 1000) * safeCaptureFps),
    );
    return Math.min(8, estimatedFrameCount);
  }, [safeFrameWindowMs, safeCaptureFps]);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

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

  const pruneFrameBuffer = useCallback(
    (nowMs: number) => {
      frameBufferRef.current = frameBufferRef.current.filter(
        (frame) => nowMs - frame.timestampMs <= safeFrameWindowMs,
      );
    },
    [safeFrameWindowMs],
  );

  const pushFrameBuffer = useCallback(
    (snapshot: FrameSnapshot) => {
      frameBufferRef.current = [...frameBufferRef.current, snapshot];
      pruneFrameBuffer(snapshot.timestampMs);
    },
    [pruneFrameBuffer],
  );

  const selectKeyframes = useCallback(
    (frames: FrameSnapshot[]): FrameSnapshot[] => {
      if (frames.length <= frameKeyframeCount) {
        return frames;
      }

      const maxIndex = frames.length - 1;
      const rawIndices = Array.from({ length: frameKeyframeCount }, (_, idx) =>
        Math.floor((idx * maxIndex) / (frameKeyframeCount - 1)),
      );
      const uniqueIndices = Array.from(new Set(rawIndices)).sort(
        (a, b) => a - b,
      );

      return uniqueIndices.map((index) => frames[index]);
    },
    [frameKeyframeCount],
  );

  const captureFrameData = useCallback((): FrameSnapshot | null => {
    const video = videoRef.current;
    const canvas = renderCanvasRef.current;

    if (!video || !canvas) {
      return null;
    }

    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    canvas.width = video.videoWidth * 0.25;
    canvas.height = video.videoHeight * 0.25;

    if (canvas.width + canvas.height <= 0) {
      return null;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 1.0);
    const data = base64.slice(base64.indexOf(",") + 1, Infinity);
    const timestampMs = Date.now();

    return {
      timestampMs,
      data,
    };
  }, [videoRef]);

  const sendVideoFrameOnce = useCallback((): number | null => {
    const snapshot = captureFrameData();
    if (!snapshot) {
      return null;
    }

    pushFrameBuffer(snapshot);
    client.sendRealtimeInput([{ mimeType: "image/jpeg", data: snapshot.data }]);
    onVideoFrameSent(snapshot.timestampMs);
    return snapshot.timestampMs;
  }, [client, onVideoFrameSent, captureFrameData, pushFrameBuffer]);

  useEffect(() => {
    if (!registerFrameRequester) {
      return;
    }

    const requester = async () => sendVideoFrameOnce();
    registerFrameRequester(requester);

    return () => {
      registerFrameRequester(null);
    };
  }, [registerFrameRequester, sendVideoFrameOnce]);

  useEffect(() => {
    if (!registerFrameSnapshotRequester) {
      return;
    }

    const requester = async () => {
      const snapshot = captureFrameData();
      if (!snapshot) {
        return null;
      }
      pushFrameBuffer(snapshot);
      onVideoFrameSent(snapshot.timestampMs);
      return snapshot;
    };

    registerFrameSnapshotRequester(requester);

    return () => {
      registerFrameSnapshotRequester(null);
    };
  }, [
    registerFrameSnapshotRequester,
    captureFrameData,
    onVideoFrameSent,
    pushFrameBuffer,
  ]);

  useEffect(() => {
    if (!registerFrameWindowRequester) {
      return;
    }

    const requester = async () => {
      sendVideoFrameOnce();
      pruneFrameBuffer(Date.now());
      return selectKeyframes(frameBufferRef.current);
    };

    registerFrameWindowRequester(requester);

    return () => {
      registerFrameWindowRequester(null);
    };
  }, [
    registerFrameWindowRequester,
    sendVideoFrameOnce,
    pruneFrameBuffer,
    selectKeyframes,
  ]);

  useEffect(() => {
    pruneFrameBuffer(Date.now());
  }, [safeFrameWindowMs, pruneFrameBuffer]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrameLoop() {
      sendVideoFrameOnce();
      if (connected) {
        timeoutId = window.setTimeout(
          sendVideoFrameLoop,
          frameCaptureIntervalMs,
        );
      }
    }

    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrameLoop);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    connected,
    activeVideoStream,
    videoRef,
    sendVideoFrameOnce,
    frameCaptureIntervalMs,
  ]);

  useEffect(() => {
    if (!activeVideoStream) {
      frameBufferRef.current = [];
    }
  }, [activeVideoStream]);

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