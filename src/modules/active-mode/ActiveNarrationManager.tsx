import { useEffect, useMemo, useRef } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { FrameSnapshot } from "../../components/control-tray/ControlTray";
import { useActiveModeContext } from "./ActiveModeContext";

type ActiveNarrationManagerProps = {
  hasVideoStream: boolean;
  lastVideoFrameAt: number | null;
  requestFrameWindow: () => Promise<FrameSnapshot[]>;
};

const FRAME_FRESHNESS_WINDOW_MS = 4500;
const STALE_RETRY_MS = 350;

export default function ActiveNarrationManager({
  hasVideoStream,
  lastVideoFrameAt,
  requestFrameWindow,
}: ActiveNarrationManagerProps) {
  const { client, connected } = useLiveAPIContext();
  const {
    mode,
    activePrompt,
    activeIntervalMs,
    requireVideoForActive,
    setRuntimeStatus,
  } = useActiveModeContext();

  const timeoutIdRef = useRef<number | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const lastVideoFrameAtRef = useRef<number | null>(lastVideoFrameAt);

  useEffect(() => {
    lastVideoFrameAtRef.current = lastVideoFrameAt;
  }, [lastVideoFrameAt]);

  const shouldRun = useMemo(
    () => connected && mode === "active",
    [connected, mode],
  );

  useEffect(() => {
    const clearPendingTimeout = () => {
      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };

    const log = (message: string) => {
      client.emit("log", {
        date: new Date(),
        type: "active.mode",
        message,
      });
    };

    const schedule = (delayMs: number) => {
      clearPendingTimeout();
      timeoutIdRef.current = window.setTimeout(() => {
        void sendNarrationPrompt();
      }, delayMs);
    };

    const isFrameFresh = (frameAt: number | null) => {
      if (frameAt === null) {
        return false;
      }
      return Date.now() - frameAt <= FRAME_FRESHNESS_WINDOW_MS;
    };

    const sendNarrationPrompt = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;

      if (requireVideoForActive && !hasVideoStream) {
        setRuntimeStatus("waiting_for_frame");
        log("skip:no-video-stream");
        inFlightRef.current = false;
        schedule(STALE_RETRY_MS);
        return;
      }

      let keyframes: FrameSnapshot[] = [];

      if (requireVideoForActive) {
        setRuntimeStatus("requesting_frame");
        keyframes = await requestFrameWindow();

        const latestFrameAt =
          keyframes.length > 0
            ? keyframes[keyframes.length - 1].timestampMs
            : lastVideoFrameAtRef.current;
        const fresh = isFrameFresh(latestFrameAt);

        if (!fresh || keyframes.length === 0) {
          setRuntimeStatus("waiting_for_frame");
          log("frame:stale-or-missing-keyframes");
          inFlightRef.current = false;
          schedule(STALE_RETRY_MS);
          return;
        }

        log(
          `frame:keyframes=${keyframes.length} latestAgeMs=${Date.now() - (latestFrameAt as number)}`,
        );
      }

      setRuntimeStatus("narrating");
      const groundedPrompt = `${activePrompt}\nThe provided images are ordered oldest to newest over roughly the last 3 seconds. Use motion/change across frames for context. Only describe what is clearly visible in these images. If uncertain, explicitly say uncertainty. Do not guess unseen details.`;

      if (keyframes.length > 0) {
        client.send([
          ...keyframes.map((frame) => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: frame.data,
            },
          })),
          { text: groundedPrompt },
        ]);
      } else {
        client.send([{ text: groundedPrompt }]);
      }
    };

    if (!shouldRun) {
      clearPendingTimeout();
      inFlightRef.current = false;
      setRuntimeStatus("idle");
      return;
    }

    const safeInterval = Math.max(1000, activeIntervalMs);

    const onTurnComplete = () => {
      inFlightRef.current = false;
      setRuntimeStatus("idle");
      schedule(safeInterval);
    };

    const onCloseOrError = () => {
      inFlightRef.current = false;
      clearPendingTimeout();
      setRuntimeStatus("idle");
    };

    client.on("turncomplete", onTurnComplete);
    client.on("close", onCloseOrError);
    client.on("error", onCloseOrError);

    void sendNarrationPrompt();

    return () => {
      clearPendingTimeout();
      inFlightRef.current = false;
      setRuntimeStatus("idle");
      client.off("turncomplete", onTurnComplete);
      client.off("close", onCloseOrError);
      client.off("error", onCloseOrError);
    };
  }, [
    shouldRun,
    client,
    activePrompt,
    activeIntervalMs,
    requireVideoForActive,
    hasVideoStream,
    requestFrameWindow,
    setRuntimeStatus,
  ]);

  return null;
}
