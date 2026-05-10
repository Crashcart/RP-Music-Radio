import { useEffect, useRef, useState } from "react";

interface Star {
  angle: number;
  dist: number;
  speed: number;
  size: number;
  opacity: number;
}

const LOGO_DELAY_MS = 200;
const EXIT_DELAY_MS = 1800;
const COMPLETE_DELAY_MS = 2600;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const exitingRef = useRef(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setLogoVisible(true), LOGO_DELAY_MS);
    const t1 = setTimeout(() => {
      exitingRef.current = true;
      setExiting(true);
    }, EXIT_DELAY_MS);
    const t2 = setTimeout(onDone, COMPLETE_DELAY_MS);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const STAR_COUNT = 220;
    const maxR = () => Math.hypot(canvas.width, canvas.height) * 0.6;

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * maxR(),
      speed: 0.25 + Math.random() * 0.5,
      size: Math.random() * 1.4 + 0.4,
      opacity: Math.random() * 0.5 + 0.3,
    }));

    const draw = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const warp = exitingRef.current;
      const speedMult = warp ? 14 : 1;
      const limit = maxR();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.dist += s.speed * speedMult;

        if (s.dist > limit + 100) {
          s.dist = 1 + Math.random() * 30;
          s.angle = Math.random() * Math.PI * 2;
        }

        const x = cx + Math.cos(s.angle) * s.dist;
        const y = cy + Math.sin(s.angle) * s.dist;

        if (warp && s.dist > 20) {
          const streakLen = s.speed * 18;
          const x0 = cx + Math.cos(s.angle) * (s.dist - streakLen);
          const y0 = cy + Math.sin(s.angle) * (s.dist - streakLen);
          const grad = ctx.createLinearGradient(x0, y0, x, y);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(1, `rgba(180,240,255,${s.opacity})`);
          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = s.size;
          ctx.moveTo(x0, y0);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,240,255,${s.opacity})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className={`splash-screen${exiting ? " splash-exit" : ""}`}
      aria-label="AetherWave loading"
      role="status"
    >
      <canvas ref={canvasRef} className="splash-canvas" aria-hidden="true" />
      <div className="splash-nebula" aria-hidden="true" />
      <div className={`splash-center${logoVisible ? " splash-logo-in" : ""}`}>
        <div className="splash-ring" aria-hidden="true" />
        <div className="splash-logo-icon" aria-hidden="true">
          A
        </div>
        <h1 className="splash-wordmark">AetherWave</h1>
        <p className="splash-tagline">Procedural Radio · Lore-Heavy Content</p>
      </div>
    </div>
  );
}
