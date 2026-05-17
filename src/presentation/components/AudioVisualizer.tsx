import React, { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

type VisualizerPreset = "bars" | "mirror" | "spectrum" | "orb" | "line";

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
  showPresetButton?: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  className = "",
  showPresetButton = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frequenciesRef = useRef<number[]>(new Array(64).fill(0));
  const [preset, setPreset] = useState<VisualizerPreset>("bars");
  const [showMenu, setShowMenu] = useState(false);
  const timeRef = useRef(0);

  const presets: { value: VisualizerPreset; label: string }[] = [
    { value: "bars", label: "Bars" },
    { value: "mirror", label: "Mirror" },
    { value: "spectrum", label: "Spectrum" },
    { value: "orb", label: "Orb" },
    { value: "line", label: "Line" },
  ];

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setupListener = async () => {
      unlisten = await listen<number[]>("audio-frequencies", (event) => {
        if (event.payload && event.payload.length === 64) {
          frequenciesRef.current = event.payload;
        } else if (event.payload && event.payload.length > 0) {
          const resized = [];
          const step = event.payload.length / 64;
          for (let i = 0; i < 64; i++) {
            resized.push(event.payload[Math.floor(i * step)] || 0);
          }
          frequenciesRef.current = resized;
        }
      });
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) frequenciesRef.current.fill(0);
  }, [isPlaying]);

  const drawBars = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const count = 48,
      gap = 3;
    const barW = (w - gap * (count - 1)) / count;
    for (let i = 0; i < count; i++) {
      const v = frequenciesRef.current[Math.floor((i * 64) / count)];
      const bh = Math.max(3, v * h * 0.85);
      const x = i * (barW + gap);
      ctx.fillStyle = `rgba(124,106,245,${0.5 + v * 0.5})`;
      ctx.beginPath();
      ctx.roundRect(x, h - bh, barW, bh, [3, 3, 0, 0]);
      ctx.fill();
      ctx.fillStyle = `rgba(192,132,252,${v * 0.6})`;
      ctx.beginPath();
      ctx.roundRect(x, h - bh, barW, Math.min(bh, 4), [3, 3, 0, 0]);
      ctx.fill();
    }
  };

  const drawMirror = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const count = 48,
      gap = 3;
    const barW = (w - gap * (count - 1)) / count;
    const cy = h / 2;
    for (let i = 0; i < count; i++) {
      const v = frequenciesRef.current[Math.floor((i * 64) / count)];
      const half = Math.max(2, v * cy * 0.85);
      const x = i * (barW + gap);
      ctx.fillStyle = `rgba(124,106,245,${0.4 + v * 0.6})`;
      ctx.beginPath();
      ctx.roundRect(x, cy - half, barW, half, [2, 2, 0, 0]);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x, cy, barW, half, [0, 0, 2, 2]);
      ctx.fill();
      ctx.fillStyle = `rgba(192,132,252,${v * 0.5})`;
      ctx.fillRect(x, cy - 1, barW, 2);
    }
  };

  const drawSpectrum = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) => {
    const freq = frequenciesRef.current;
    ctx.beginPath();
    for (let i = 0; i < 64; i++) {
      const x = (i / 63) * w;
      const y = h - freq[i] * h * 0.85;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(56,189,248,0.6)");
    grad.addColorStop(0.5, "rgba(124,106,245,0.6)");
    grad.addColorStop(1, "rgba(192,132,252,0.6)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 64; i++) {
      const x = (i / 63) * w;
      const y = h - freq[i] * h * 0.85;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const lgrad = ctx.createLinearGradient(0, 0, w, 0);
    lgrad.addColorStop(0, "rgba(56,189,248,1)");
    lgrad.addColorStop(0.5, "rgba(124,106,245,1)");
    lgrad.addColorStop(1, "rgba(192,132,252,1)");
    ctx.strokeStyle = lgrad;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawOrb = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const freq = frequenciesRef.current;
    const cx = w / 2,
      cy = h / 2;
    const bass = freq[0],
      mid = freq[20];
    const r = 30 + bass * 40;
    const pts = 64;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const angle = (i / pts) * Math.PI * 2;
      const push = freq[Math.floor((i * 63) / pts)] * 28;
      const rx = cx + (r + push) * Math.cos(angle);
      const ry = cy + (r + push) * Math.sin(angle);
      i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(124,106,245,${0.6 + bass * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const angle = (i / pts) * Math.PI * 2 + Math.PI / pts;
      const push = freq[Math.floor((i * 63) / pts)] * 16;
      const rx = cx + (r * 0.6 + push) * Math.cos(angle);
      const ry = cy + (r * 0.6 + push) * Math.sin(angle);
      i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(192,132,252,${0.4 + mid * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 4 + bass * 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(192,132,252,${0.6 + bass * 0.4})`;
    ctx.fill();
  };

  const drawLine = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const freq = frequenciesRef.current;
    const cy = h / 2;
    const t = timeRef.current;
    const pts = 128;
    ctx.beginPath();
    for (let i = 0; i < pts; i++) {
      const x = (i / (pts - 1)) * w;
      const v = freq[Math.floor((i * 63) / pts)];
      const y = cy + (v - 0.5) * h * 0.7 + Math.sin(t * 2 + i * 0.15) * 8 * v;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(192,132,252,0.9)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < pts; i++) {
      const x = (i / (pts - 1)) * w;
      const v = freq[Math.floor((i * 63) / pts)];
      const y =
        cy + (v - 0.5) * h * 0.4 + Math.sin(t * 2 + i * 0.15 + 0.5) * 5 * v;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(124,106,245,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width,
        h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.shadowBlur = 0;

      if (!isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      timeRef.current += 0.04;

      switch (preset) {
        case "mirror":
          drawMirror(ctx, w, h);
          break;
        case "spectrum":
          drawSpectrum(ctx, w, h);
          break;
        case "orb":
          drawOrb(ctx, w, h);
          break;
        case "line":
          drawLine(ctx, w, h);
          break;
        default:
          drawBars(ctx, w, h);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, preset]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width: "100%", height: "100%", borderRadius: "var(--radius)" }}
        width={800}
        height={200}
      />

      {showPresetButton && (
        <div style={{ position: "absolute", bottom: 12, right: 12 }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: "rgba(10,10,15,0.8)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "6px 12px",
              color: "var(--text2)",
              fontSize: "11px",
              fontFamily: "'DM Mono', monospace",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🎨 {presets.find((p) => p.value === preset)?.label}{" "}
            {showMenu ? "▲" : "▼"}
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "36px",
                right: "0",
                background: "rgba(17,17,24,0.95)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                minWidth: "110px",
                backdropFilter: "blur(8px)",
              }}
            >
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPreset(p.value);
                    setShowMenu(false);
                  }}
                  style={{
                    background:
                      preset === p.value
                        ? "rgba(124,106,245,0.2)"
                        : "transparent",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    color:
                      preset === p.value ? "var(--accent2)" : "var(--text2)",
                    fontSize: "11px",
                    fontFamily: "'DM Mono', monospace",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;
