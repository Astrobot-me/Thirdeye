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
  requireVideoForActive: boolean;
  setRequireVideoForActive: (requireVideo: boolean) => void;
  runtimeStatus: ActiveRuntimeStatus;
  setRuntimeStatus: (status: ActiveRuntimeStatus) => void;
};

const DEFAULT_ACTIVE_PROMPT =
  "Continuously describe the surroundings for a blind user. Focus on safety, navigation cues, people, movement, and important changes. Describe only clearly visible details from current camera input. If uncertain or view is unclear, say that explicitly. Keep responses short and practical.";

const DEFAULT_INTERVAL_MS = 3000;

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
      requireVideoForActive,
      setRequireVideoForActive,
      runtimeStatus,
      setRuntimeStatus,
    }),
    [
      mode,
      activePrompt,
      activeIntervalMs,
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