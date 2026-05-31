"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
};

const COLORS = ["#F59E0B", "#22D3EE", "#A78BFA", "#F472B6", "#FDE68A", "#34D399"];

function createBurst(x: number, y: number): Particle[] {
  return Array.from({ length: 46 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 1.6 + Math.random() * 2.6,
    };
  });
}

export function FireworksCelebration() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const currentCanvas = canvas;
    const ctx = context;
    let animationId = 0;
    let frame = 0;
    let particles: Particle[] = [];

    function resize() {
      currentCanvas.width = window.innerWidth * window.devicePixelRatio;
      currentCanvas.height = window.innerHeight * window.devicePixelRatio;
      currentCanvas.style.width = `${window.innerWidth}px`;
      currentCanvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function launch() {
      const x = window.innerWidth * (0.18 + Math.random() * 0.64);
      const y = window.innerHeight * (0.18 + Math.random() * 0.34);
      particles = particles.concat(createBurst(x, y));
    }

    function tick() {
      frame += 1;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (frame % 18 === 1) {
        launch();
      }

      particles = particles
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.045,
          alpha: particle.alpha - 0.012,
        }))
        .filter((particle) => particle.alpha > 0);

      for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.alpha);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationId = window.requestAnimationFrame(tick);
    }

    resize();
    launch();
    window.addEventListener("resize", resize);
    animationId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden
    />
  );
}
