"use client";

import { useEffect, useRef, useState } from "react";
import { EDGE_NODES } from "@/data/home";

interface Pulse {
  id: number;
  t: number;
}

interface Drop {
  x: number;
  y: number;
  t: number;
}

export default function TopologyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const stateRef = useRef<{ pulses: Pulse[]; drops: Drop[]; seq: number }>({ pulses: [], drops: [], seq: 0 });

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastPulse = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const layout = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.365;
      return { w, h, cx, cy, radius };
    };

    const nodePos = (angleDeg: number, cx: number, cy: number, radius: number) => {
      const a = ((angleDeg - 90) * Math.PI) / 180;
      return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
    };

    const loop = (now: number) => {
      const s = stateRef.current;
      const { w, h, cx, cy, radius } = layout();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (now - lastPulse > 620) {
        lastPulse = now;
        s.pulses.push({ id: s.seq++, t: now });
        if (s.pulses.length > 8) s.pulses.shift();
      }

      // orbit + hub rings
      ctx.strokeStyle = "rgba(26,34,50,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.18)";
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 44, 0, Math.PI * 2);
      ctx.stroke();

      // hub diamond
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#00E5FF";
      ctx.shadowColor = "rgba(0,229,255,0.9)";
      ctx.shadowBlur = 18;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
      ctx.shadowBlur = 0;

      const positions = EDGE_NODES.map((n) => ({ n, ...nodePos(n.angle, cx, cy, radius) }));

      // links
      for (const p of positions) {
        ctx.strokeStyle = hoveredRef.current === p.n.id ? "rgba(255,51,102,0.7)" : "rgba(0,229,255,0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // pulses
      for (const pulse of s.pulses) {
        const age = (now - pulse.t) / 2400;
        if (age > 1) continue;
        for (const p of positions) {
          const px = cx + (p.x - cx) * age;
          const py = cy + (p.y - cy) * age;
          ctx.fillStyle = `rgba(0,229,255,${0.9 * (1 - age)})`;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // random drops on hover
      if (hoveredRef.current && Math.random() < 0.14) {
        const target = positions.find((p) => p.n.id === hoveredRef.current);
        if (target) {
          s.drops.push({ x: target.x + (Math.random() - 0.5) * 40, y: target.y + (Math.random() - 0.5) * 24, t: now });
          if (s.drops.length > 24) s.drops.shift();
        }
      }
      for (const d of s.drops) {
        const age = (now - d.t) / 1200;
        if (age > 1) continue;
        ctx.strokeStyle = `rgba(255,51,102,${1 - age})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(d.x - 4, d.y - 4);
        ctx.lineTo(d.x + 4, d.y + 4);
        ctx.moveTo(d.x + 4, d.y - 4);
        ctx.lineTo(d.x - 4, d.y + 4);
        ctx.stroke();
      }

      // nodes
      for (const p of positions) {
        const isHover = hoveredRef.current === p.n.id;
        ctx.fillStyle = p.n.color;
        ctx.shadowColor = p.n.color;
        ctx.shadowBlur = isHover ? 16 : 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHover ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = isHover ? "#F0F4F8" : "rgba(240,244,248,0.75)";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.n.short, p.x, p.y - 12);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { cx, cy, radius } = (() => {
        const w = rect.width;
        const h = rect.height;
        return { cx: w / 2, cy: h / 2, radius: Math.min(w, h) * 0.365 };
      })();
      let hit: string | null = null;
      for (const n of EDGE_NODES) {
        const p = nodePos(n.angle, cx, cy, radius);
        if (Math.hypot(mx - p.x, my - p.y) < 20) {
          hit = n.id;
          break;
        }
      }
      setHovered(hit);
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", () => setHovered(null));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, []);

  const active = EDGE_NODES.find((n) => n.id === hovered);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="h-[340px] w-full sm:h-[420px]" aria-label="Distributed edge appliance topology" />
      {active && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-md border border-threat/50 bg-void/90 px-3 py-2 font-mono text-[10.5px]">
          <span className="text-muted">{active.site} · {active.proto}</span>
          <span className="ml-2 text-threat">VERDICT XDP_DROP @0.84µs</span>
        </div>
      )}
    </div>
  );
}
