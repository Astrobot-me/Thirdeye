import { ChangeEvent } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useActiveModeContext } from "./ActiveModeContext";
import "./active-mode-controls.scss";

const statusLabel: Record<string, string> = {
  idle: "Idle",
  waiting_for_frame: "Waiting for fresh frame",
  requesting_frame: "Requesting fresh frame",
  narrating: "Narrating",
};

export default function ActiveModeControls() {
  const { connected } = useLiveAPIContext();
  const {
    mode,
    setMode,
    activeIntervalMs,
    setActiveIntervalMs,
    requireVideoForActive,
    setRequireVideoForActive,
    runtimeStatus,
  } = useActiveModeContext();

  const updateInterval = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(nextValue)) {
      return;
    }
    setActiveIntervalMs(Math.max(1000, nextValue));
  };

  const badgeClass = runtimeStatus.replaceAll("_", "-");

  return (
    <section className="active-mode-controls">
      <div className="mode-toggle" role="group" aria-label="Narration mode">
        <button
          type="button"
          className={mode === "passive" ? "is-active" : ""}
          onClick={() => setMode("passive")}
          disabled={!connected}
        >
          Passive
        </button>
        <button
          type="button"
          className={mode === "active" ? "is-active" : ""}
          onClick={() => setMode("active")}
          disabled={!connected}
        >
          Active
        </button>
      </div>

      <div className="mode-status-row">
        <span className="mode-status-label">Active status</span>
        <span className={`mode-status-badge ${badgeClass}`}>
          {mode === "active" && connected
            ? statusLabel[runtimeStatus]
            : "Not active"}
        </span>
      </div>

      <div className="mode-settings">
        <label>
          Interval (ms)
          <input
            type="number"
            min={1000}
            step={500}
            value={activeIntervalMs}
            onChange={updateInterval}
            disabled={!connected || mode !== "active"}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={requireVideoForActive}
            onChange={(e) => setRequireVideoForActive(e.target.checked)}
            disabled={!connected}
          />
          Require webcam/screen stream
        </label>
      </div>
    </section>
  );
}