import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

function useVisualizer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isPlaying: boolean,
) {
  const isPlayingRef = useRef(isPlaying);
  const visualizerRef = useRef<any>(null);
  const animIdRef = useRef<number>(0);
  const [presetName, setPresetName] = useState("");
  const presets = butterchurnPresets.getPresets();
  const presetNames = Object.keys(presets);

  // Keep ref in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const loadRandomPreset = useCallback(() => {
    if (!visualizerRef.current) return;
    const name = presetNames[Math.floor(Math.random() * presetNames.length)];
    visualizerRef.current.loadPreset(presets[name], 2.0);
    setPresetName(name);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audioCtx = new AudioContext();
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
      if (isPlayingRef.current) {
        viz.render();
      }
      animIdRef.current = requestAnimationFrame(render);
    };
    animIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      observer.disconnect();
      audioCtx.close().catch(() => {});
      visualizerRef.current = null;
    };
  }, []);

  return { presetName, loadRandomPreset };
}

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

const FullscreenVisualizer: React.FC<{
  isPlaying: boolean;
  onClose: () => void;
}> = ({ isPlaying, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { presetName, loadRandomPreset } = useVisualizer(canvasRef, isPlaying);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}
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

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { presetName, loadRandomPreset } = useVisualizer(canvasRef, isPlaying);

  return (
    <>
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
      {isFullscreen && (
        <FullscreenVisualizer
          isPlaying={isPlaying}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
};

export default AudioVisualizer;
