
import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  baseSpeedX: number;
  baseSpeedY: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  life: number; // for respawning consumed particles
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Black hole center (top-center of viewport, where the hero sits)
    const getCenter = () => ({ cx: w / 2, cy: h * 0.30 });

    const spawnParticle = (isBack: boolean): Particle => {
      // Spawn from edges or random positions
      const edge = Math.random();
      let x: number, y: number;
      if (edge < 0.25) { x = 0; y = Math.random() * h; }
      else if (edge < 0.5) { x = w; y = Math.random() * h; }
      else if (edge < 0.75) { x = Math.random() * w; y = 0; }
      else { x = Math.random() * w; y = h; }

      return {
        x,
        y,
        size: isBack ? 1 : 1.5 + Math.random() * 0.5,
        baseSpeedX: (Math.random() - 0.5) * 0.3,
        baseSpeedY: (Math.random() - 0.5) * 0.3,
        opacity: isBack ? 0.15 : 0.35,
        twinkleSpeed: 3000 + Math.random() * 5000,
        twinklePhase: Math.random() * Math.PI * 2,
        color: isBack ? '108, 99, 255' : '0, 212, 255',
        life: 1,
      };
    };

    // Initial particles — spread across canvas
    for (let i = 0; i < 180; i++) {
      const p = spawnParticle(true);
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      particles.push(p);
    }
    for (let i = 0; i < 60; i++) {
      const p = spawnParticle(false);
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      particles.push(p);
    }

    const animate = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      const { cx, cy } = getCenter();

      // Gravitational pull parameters
      const pullStrength = 0.00035;
      const eventHorizon = 20;
      const maxAccel = 1.5;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Vector from particle to black hole center
        const dx = cx - p.x;
        const dy = cy - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Gravitational acceleration (inverse square, capped)
        const accel = Math.min(pullStrength * (w * h) / Math.max(distSq, 100), maxAccel);
        const ax = (dx / dist) * accel;
        const ay = (dy / dist) * accel;

        // Add a tangential swirl component for spiral effect
        const swirlStrength = accel * 1.2;
        const sx = (-dy / dist) * swirlStrength;
        const sy = (dx / dist) * swirlStrength;

        // Update velocity (drift + gravity + swirl)
        p.x += p.baseSpeedX + ax + sx;
        p.y += p.baseSpeedY + ay + sy;

        // Fade out as particle approaches the center
        const fadeFactor = Math.min(dist / 150, 1);

        // Particle consumed — respawn from edge
        if (dist < eventHorizon) {
          const isBack = p.color.startsWith('108');
          Object.assign(p, spawnParticle(isBack));
          continue;
        }

        // Twinkle
        const twinkle = Math.sin((time / p.twinkleSpeed) * Math.PI * 2 + p.twinklePhase);
        const currentOpacity = (0.1 + (twinkle * 0.5 + 0.5) * 0.4) * fadeFactor;

        // Size grows as particles get closer (lensing effect)
        const sizeScale = 1 + (1 - fadeFactor) * 3;

        ctx.fillStyle = `rgba(${p.color}, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * sizeScale, 0, Math.PI * 2);
        ctx.fill();

        // Particles close to the center get a streak/trail
        if (dist < 180) {
          const trailLen = (1 - dist / 180) * 20;
          const trailDx = -(ax + sx) * trailLen * 3;
          const trailDy = -(ay + sy) * trailLen * 3;
          ctx.strokeStyle = `rgba(${p.color}, ${currentOpacity * 0.4})`;
          ctx.lineWidth = p.size * sizeScale * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + trailDx, p.y + trailDy);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Radial vignette */}
      <div className="vignette-overlay" />
    </>
  );
};

export default ParticleBackground;
