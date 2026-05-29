import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { listen } from "@tauri-apps/api/event";
import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

// ── Shared canvas logic ──────────────────────────────────────────
function useVisualizer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  freqDataRef: React.MutableRefObject<Uint8Array>,
  isPlaying: boolean,
) {
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const visualizerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animIdRef = useRef<number>(0);
  const [presetName, setPresetName] = useState("");
  const presets = butterchurnPresets.getPresets();
  const presetNames = Object.keys(presets);

  const loadRandomPreset = useCallback(() => {
    if (!visualizerRef.current) return;
    const name = presetNames[Math.floor(Math.random() * presetNames.length)];
    visualizerRef.current.loadPreset(presets[name], 2.0);
    setPresetName(name);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 🔥 FIX #12: Store AudioContext in ref for proper cleanup
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;

    // Patch analyser to read from shared freq buffer
    analyser.getByteFrequencyData = (array: Uint8Array) => {
      const freq = freqDataRef.current;
      for (let i = 0; i < array.length; i++) array[i] = freq[i] || 0;
    };
    analyser.getByteTimeDomainData = (array: Uint8Array) => {
      const freq = freqDataRef.current;
      for (let i = 0; i < array.length; i++)
        array[i] = 128 + (freq[i % freq.length] || 0) * 0.5 - 64;
    };

    const w = canvas.offsetWidth || 800;
    const h = canvas.offsetHeight || 500;
    canvas.width = w;
    canvas.height = h;

    const viz = butterchurn.createVisualizer(audioCtx, canvas, {
      width: w,
      height: h,
      pixelRatio: window.devicePixelRatio || 1,
    });
    visualizerRef.current = viz;
    viz.connectAudio(analyser);

    const name = presetNames[Math.floor(Math.random() * presetNames.length)];
    viz.loadPreset(presets[name], 0);
    setPresetName(name);

    const resize = () => {
      if (!canvas || !visualizerRef.current) return;
      const rw = canvas.offsetWidth;
      const rh = canvas.offsetHeight;
      if (rw === 0 || rh === 0) return;
      canvas.width = rw;
      canvas.height = rh;
      visualizerRef.current.setRendererSize(rw, rh);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = () => {
      if (isPlayingRef.current) viz.render();
      animIdRef.current = requestAnimationFrame(render);
    };
    animIdRef.current = requestAnimationFrame(render);

    // 🔥 FIX #12: Proper cleanup - close AudioContext, cancel animation, disconnect observer
    return () => {
      cancelAnimationFrame(animIdRef.current);
      observer.disconnect();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      visualizerRef.current = null;
    };
  }, []);

  return { presetName, loadRandomPreset };
}

// ── Overlay controls ────────────────────────────────────────────

const OverlayControls: React.FC<{
  presetName: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onNextPreset: () => void;
}> = ({ presetName, isFullscreen, onToggleFullscreen, onNextPreset }) => {
  const btnStyle: React.CSSProperties = {
    background: "rgba(10,10,15,0.8)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "6px 14px",
    color: "var(--text2)",
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={onToggleFullscreen} style={btnStyle}>
          {isFullscreen ? "✕ Exit" : "⛶ Fullscreen"}
        </button>
        <button onClick={onNextPreset} style={btnStyle}>
          🎨 Next
        </button>
      </div>

      {presetName && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            zIndex: 10,
            color: "rgba(255,255,255,0.3)",
            fontSize: 10,
            fontFamily: "'DM Mono', monospace",
            maxWidth: "60%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            background: "rgba(0,0,0,0.4)",
            padding: "4px 8px",
            borderRadius: 12,
          }}
        >
          🎵 {presetName}
        </div>
      )}
    </>
  );
};

// ── Fullscreen portal ────────────────────────────────────────────

const FullscreenVisualizer: React.FC<{
  freqDataRef: React.MutableRefObject<Uint8Array>;
  isPlaying: boolean;
  onClose: () => void;
}> = ({ freqDataRef, isPlaying, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { presetName, loadRandomPreset } = useVisualizer(
    canvasRef,
    freqDataRef,
    isPlaying,
  );

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <OverlayControls
        presetName={presetName}
        isFullscreen={true}
        onToggleFullscreen={onClose}
        onNextPreset={loadRandomPreset}
      />
    </div>,
    document.body,
  );
};

// ── Main component ──────────────────────────────────────────────

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(512).fill(0));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  const { presetName, loadRandomPreset } = useVisualizer(
    canvasRef,
    freqDataRef,
    isPlaying,
  );

  // Listen for audio frequency data from Tauri backend
  useEffect(() => {
    let cancelled = false;
    listen<number[]>("audio-frequencies", (event) => {
      if (cancelled) return;
      const payload = event.payload;
      if (!payload?.length) return;
      const arr = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        const fi = Math.floor((i * payload.length) / 512);
        arr[i] = Math.min(255, Math.round((payload[fi] || 0) * 255));
      }
      freqDataRef.current = arr;
    }).then((u) => {
      if (!cancelled) unlistenRef.current = u;
    });

    // 🔥 FIX #12: Clean up event listener on unmount
    return () => {
      cancelled = true;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Inline visualizer */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#000",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          className={className}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <OverlayControls
          presetName={presetName}
          isFullscreen={false}
          onToggleFullscreen={() => setIsFullscreen(true)}
          onNextPreset={loadRandomPreset}
        />
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <FullscreenVisualizer
          freqDataRef={freqDataRef}
          isPlaying={isPlaying}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
};

export default AudioVisualizer;
