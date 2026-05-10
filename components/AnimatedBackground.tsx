"use client";

import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      hue: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        hue: 190 + Math.random() * 30,
      });
    }

    // Wave configuration
    const waves = [
      { amplitude: 50, frequency: 0.003, speed: 0.02, offset: 0 },
      { amplitude: 30, frequency: 0.005, speed: 0.015, offset: 100 },
      { amplitude: 40, frequency: 0.004, speed: 0.025, offset: 200 },
    ];

    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw flowing gradient mesh
      const gradient1 = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time * 0.5) * 100,
        canvas.height * 0.3 + Math.cos(time * 0.3) * 100,
        0,
        canvas.width * 0.3,
        canvas.height * 0.3,
        canvas.width * 0.6
      );
      gradient1.addColorStop(0, "rgba(14, 165, 233, 0.15)");
      gradient1.addColorStop(0.5, "rgba(56, 189, 248, 0.08)");
      gradient1.addColorStop(1, "rgba(125, 211, 252, 0)");

      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient2 = ctx.createRadialGradient(
        canvas.width * 0.7 + Math.cos(time * 0.4) * 150,
        canvas.height * 0.6 + Math.sin(time * 0.6) * 100,
        0,
        canvas.width * 0.7,
        canvas.height * 0.6,
        canvas.width * 0.5
      );
      gradient2.addColorStop(0, "rgba(56, 189, 248, 0.12)");
      gradient2.addColorStop(0.5, "rgba(14, 165, 233, 0.06)");
      gradient2.addColorStop(1, "rgba(2, 132, 199, 0)");

      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated waves
      waves.forEach((wave, index) => {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        for (let x = 0; x <= canvas.width; x += 5) {
          const y =
            canvas.height * 0.7 +
            wave.offset +
            Math.sin(x * wave.frequency + time * wave.speed * 100) * wave.amplitude +
            Math.sin(x * wave.frequency * 0.5 + time * wave.speed * 50) * wave.amplitude * 0.5;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        const waveGradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
        waveGradient.addColorStop(0, `rgba(14, 165, 233, ${0.03 - index * 0.008})`);
        waveGradient.addColorStop(1, `rgba(56, 189, 248, ${0.06 - index * 0.015})`);
        ctx.fillStyle = waveGradient;
        ctx.fill();
      });

      // Draw flowing lines
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const startY = canvas.height * 0.2 + i * 80;

        for (let x = 0; x <= canvas.width; x += 10) {
          const y =
            startY +
            Math.sin(x * 0.005 + time + i) * 30 +
            Math.sin(x * 0.01 + time * 1.5 + i * 0.5) * 15;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = `rgba(14, 165, 233, ${0.08 - i * 0.012})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw and update particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with glow
        const particleGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        );
        particleGradient.addColorStop(0, `hsla(${particle.hue}, 89%, 53%, ${particle.opacity})`);
        particleGradient.addColorStop(1, `hsla(${particle.hue}, 89%, 53%, 0)`);

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = particleGradient;
        ctx.fill();

        // Draw particle core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 89%, 63%, ${particle.opacity + 0.2})`;
        ctx.fill();
      });

      // Draw connection lines between close particles
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(14, 165, 233, ${0.15 * (1 - distance / 150)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      // Draw floating hexagons
      for (let i = 0; i < 6; i++) {
        const centerX = (canvas.width / 5) * (i + 0.5) + Math.sin(time + i) * 20;
        const centerY = canvas.height * 0.4 + Math.cos(time * 0.8 + i * 0.5) * 40 + i * 30;
        const size = 20 + Math.sin(time + i * 0.5) * 5;

        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (Math.PI / 3) * j + time * 0.2;
          const x = centerX + size * Math.cos(angle);
          const y = centerY + size * Math.sin(angle);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(14, 165, 233, ${0.1 - i * 0.01})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.9 }}
      />
      {/* Additional CSS-based animated elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl animate-pulse-slower" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-sky-300/10 rounded-full blur-3xl animate-drift" />
      </div>
    </>
  );
}
