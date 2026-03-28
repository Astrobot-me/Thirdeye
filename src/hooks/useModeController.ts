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

import { useState, useCallback, useRef } from "react";

export type ModeType = "passive" | "active";

export interface UseModeControllerResults {
  mode: ModeType;
  toggleMode: () => void;
  lastAudioEndTime: number;
  updateLastAudioEndTime: (time: number) => void;
  canSpeakProactively: () => boolean;
}

/**
 * Custom hook for managing Passive/Active mode for smart glasses accessibility feature.
 * 
 * Passive Mode: Voice Q&A only, video disabled
 * Active Mode: Proactive scene narration, video enabled, function tools active
 * 
 * Also tracks speech gate timing to prevent Gemini from interrupting itself.
 */
export function useModeController(): UseModeControllerResults {
  const [mode, setMode] = useState<ModeType>("passive");
  const lastAudioEndTimeRef = useRef<number>(0);
  const SPEECH_GATE_MS = 2000; // 2 seconds minimum between proactive utterances

  const toggleMode = useCallback(() => {
    setMode((prevMode) => (prevMode === "passive" ? "active" : "passive"));
  }, []);

  const updateLastAudioEndTime = useCallback((time: number) => {
    lastAudioEndTimeRef.current = time;
  }, []);

  const canSpeakProactively = useCallback(() => {
    if (mode !== "active") {
      return false;
    }
    const now = Date.now();
    const timeSinceLastAudio = now - lastAudioEndTimeRef.current;
    return timeSinceLastAudio >= SPEECH_GATE_MS;
  }, [mode]);

  return {
    mode,
    toggleMode,
    lastAudioEndTime: lastAudioEndTimeRef.current,
    updateLastAudioEndTime,
    canSpeakProactively,
  };
}
