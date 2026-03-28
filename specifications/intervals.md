 Quick Summary

  Audio → WebSocket

   - Interval: 128ms chunks (2048 samples)
   - Rate: 8 times/second
   - Sample Rate: 16kHz
   - Location: src/lib/worklets/audio-processing.ts

  Video → WebSocket

   - Interval: 2000ms between frames (0.5 FPS)
   - Resolution: 25% of original size
   - Quality: Maximum JPEG quality
   - Location: src/components/control-tray/ControlTray.tsx

  Key Insight

  Audio is sent 16× more frequently than video:

   - Audio: 8 chunks/sec (optimized for real-time voice)
   - Video:
    0.5 frames/sec (heavily throttled for bandwidth)

  This design prioritizes voice conversation quality while keeping bandwidth minimal for video context.