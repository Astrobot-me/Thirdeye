import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export type NarrationMode = "passive" | "active";
export type ActiveRuntimeStatus =
  | "idle"
  | "waiting_for_frame"
  | "requesting_frame"
  | "narrating";

export type ActiveModeState = {
  mode: NarrationMode;
  setMode: (mode: NarrationMode) => void;
  activePrompt: string;
  setActivePrompt: (prompt: string) => void;
  activeIntervalMs: number;
  setActiveIntervalMs: (intervalMs: number) => void;
  activeCaptureFps: number;
  setActiveCaptureFps: (fps: number) => void;
  activeFrameWindowMs: number;
  setActiveFrameWindowMs: (windowMs: number) => void;
  requireVideoForActive: boolean;
  setRequireVideoForActive: (requireVideo: boolean) => void;
  runtimeStatus: ActiveRuntimeStatus;
  setRuntimeStatus: (status: ActiveRuntimeStatus) => void;
};

// const DEFAULT_ACTIVE_PROMPT =
//   "Continuously describe the surroundings for a blind user. Focus on safety, navigation cues, people, movement, and important changes. Describe only clearly visible details from current camera input. If uncertain or view is unclear, say that explicitly. Keep responses short and practical.";

const DEFAULT_ACTIVE_PROMPT = `
These frames show what is directly ahead of the person right now, captured over the last few seconds.

Scan for:
- HAZARDS: Any obstacle, step, curb, uneven surface, wet area, moving vehicle, 
  or anything that could cause a fall or collision
- PATH: The walkable direction — is it clear? Any upcoming turn or narrowing?
- PEOPLE: Anyone in the path or approaching — describe their movement and position
- CONTEXT: Brief scene context only if no hazards exist

Respond with 1-3 short spoken sentences. Lead with the most urgent information.
If the path is completely clear and safe, say so briefly: "Path is clear, keep going straight."
Do not describe background details, colors, or objects that do not affect navigation.
`;
const DEFAULT_INTERVAL_MS = 3000;
const DEFAULT_CAPTURE_FPS = 2;
const DEFAULT_FRAME_WINDOW_MS = 3000;

const ActiveModeContext = createContext<ActiveModeState | undefined>(undefined);

export type ActiveModeProviderProps = {
  children: ReactNode;
};

export const ActiveModeProvider: FC<ActiveModeProviderProps> = ({
  children,
}) => {
  const [mode, setMode] = useState<NarrationMode>("passive");
  const [activePrompt, setActivePrompt] = useState(DEFAULT_ACTIVE_PROMPT);
  const [activeIntervalMs, setActiveIntervalMs] =
    useState<number>(DEFAULT_INTERVAL_MS);
  const [activeCaptureFps, setActiveCaptureFps] =
    useState<number>(DEFAULT_CAPTURE_FPS);
  const [activeFrameWindowMs, setActiveFrameWindowMs] =
    useState<number>(DEFAULT_FRAME_WINDOW_MS);
  const [requireVideoForActive, setRequireVideoForActive] =
    useState<boolean>(true);
  const [runtimeStatus, setRuntimeStatus] =
    useState<ActiveRuntimeStatus>("idle");

  const value = useMemo(
    () => ({
      mode,
      setMode,
      activePrompt,
      setActivePrompt,
      activeIntervalMs,
      setActiveIntervalMs,
      activeCaptureFps,
      setActiveCaptureFps,
      activeFrameWindowMs,
      setActiveFrameWindowMs,
      requireVideoForActive,
      setRequireVideoForActive,
      runtimeStatus,
      setRuntimeStatus,
    }),
    [
      mode,
      activePrompt,
      activeIntervalMs,
      activeCaptureFps,
      activeFrameWindowMs,
      requireVideoForActive,
      runtimeStatus,
    ],
  );

  return (
    <ActiveModeContext.Provider value={value}>
      {children}
    </ActiveModeContext.Provider>
  );
};

export const useActiveModeContext = () => {
  const context = useContext(ActiveModeContext);
  if (!context) {
    throw new Error(
      "useActiveModeContext must be used within an ActiveModeProvider",
    );
  }
  return context;
};