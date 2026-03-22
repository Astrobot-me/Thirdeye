import { useEffect, useMemo, useRef } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { FrameSnapshot } from "../../components/control-tray/ControlTray";
import { useActiveModeContext } from "./ActiveModeContext";

type ActiveNarrationManagerProps = {
  hasVideoStream: boolean;
  lastVideoFrameAt: number | null;
  requestFreshFrame: () => Promise<number | null>;
  requestFreshFrameSnapshot: () => Promise<FrameSnapshot | null>;
};

const FRAME_FRESHNESS_WINDOW_MS = 4500;
const STALE_RETRY_MS = 350;

export default function ActiveNarrationManager({
  hasVideoStream,
  lastVideoFrameAt,
  requestFreshFrame,
  requestFreshFrameSnapshot,
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

      let snapshot: FrameSnapshot | null = null;

      if (requireVideoForActive) {
        setRuntimeStatus("requesting_frame");

        // Kick realtime pipeline as fallback context path.
        await requestFreshFrame();

        // Capture a direct snapshot for inline turn grounding.
        snapshot = await requestFreshFrameSnapshot();

        const latestFrameAt =
          snapshot?.timestampMs ?? lastVideoFrameAtRef.current;
        const fresh = isFrameFresh(latestFrameAt);

        if (!fresh || !snapshot) {
          setRuntimeStatus("waiting_for_frame");
          log("frame:stale-or-missing-inline-snapshot");
          inFlightRef.current = false;
          schedule(STALE_RETRY_MS);
          return;
        }

        log(`frame:inline ageMs=${Date.now() - (latestFrameAt as number)}`);
      }

      setRuntimeStatus("narrating");
      const groundedPrompt = `${activePrompt}\nOnly describe what is clearly visible in the latest camera frame(s). If uncertain, explicitly say uncertainty. Do not guess unseen details.`;

      if (snapshot) {
        client.send([
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: snapshot.data,
            },
          },
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
    requestFreshFrame,
    requestFreshFrameSnapshot,
    setRuntimeStatus,
  ]);

  return null;
}