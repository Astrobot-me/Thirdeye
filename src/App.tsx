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

import { useCallback, useEffect, useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray, {
  FrameSnapshot,
} from "./components/control-tray/ControlTray";
import cn from "classnames";
import { LiveClientOptions } from "./types";
import {
  ActiveModeProvider,
  ActiveNarrationManager,
} from "./modules/active-mode";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
};

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [lastVideoFrameAt, setLastVideoFrameAt] = useState<number | null>(null);
  const frameRequesterRef = useRef<null | (() => Promise<number | null>)>(null);
  const frameSnapshotRequesterRef =
    useRef<null | (() => Promise<FrameSnapshot | null>)>(null);

  const registerFrameRequester = useCallback(
    (requester: (() => Promise<number | null>) | null) => {
      frameRequesterRef.current = requester;
    },
    [],
  );

  const registerFrameSnapshotRequester = useCallback(
    (requester: (() => Promise<FrameSnapshot | null>) | null) => {
      frameSnapshotRequesterRef.current = requester;
    },
    [],
  );

  const requestFreshFrame = useCallback(async (): Promise<number | null> => {
    if (!frameRequesterRef.current) {
      return null;
    }
    return frameRequesterRef.current();
  }, []);

  const requestFreshFrameSnapshot = useCallback(
    async (): Promise<FrameSnapshot | null> => {
      if (!frameSnapshotRequesterRef.current) {
        return null;
      }
      return frameSnapshotRequesterRef.current();
    },
    [],
  );

  useEffect(() => {
    if (!videoStream) {
      setLastVideoFrameAt(null);
    }
  }, [videoStream]);

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
        {/* Active mode module integration start */}
        <ActiveModeProvider>
          <div className="streaming-console">
            <SidePanel />
            <main>
              <div className="main-app-area">
                {/* APP goes here */}
                <Altair />
                <video
                  className={cn("stream", {
                    hidden: !videoRef.current || !videoStream,
                  })}
                  ref={videoRef}
                  autoPlay
                  playsInline
                />
              </div>

              <ControlTray
                videoRef={videoRef}
                supportsVideo={true}
                onVideoStreamChange={setVideoStream}
                onVideoFrameSent={setLastVideoFrameAt}
                registerFrameRequester={registerFrameRequester}
                registerFrameSnapshotRequester={registerFrameSnapshotRequester}
                enableEditingSettings={true}
              >
                {/* put your own buttons here */}
              </ControlTray>
            </main>
          </div>
          <ActiveNarrationManager
            hasVideoStream={Boolean(videoStream)}
            lastVideoFrameAt={lastVideoFrameAt}
            requestFreshFrame={requestFreshFrame}
            requestFreshFrameSnapshot={requestFreshFrameSnapshot}
          />
        </ActiveModeProvider>
        {/* Active mode module integration end */}
      </LiveAPIProvider>
    </div>
  );
}

export default App;