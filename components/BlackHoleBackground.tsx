import React, { useEffect, useRef } from 'react';

export default function BlackHoleBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;
    let cx = 0, cy = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      cx = w / 2;
      cy = h * 0.55; // Horizon line slightly below center
    };
    window.addEventListener('resize', resize);
    resize();

    // Precompute starfield (increased to 350 stars)
    const stars = Array.from({ length: 350 }, () => ({
      x: Math.random() * 2000, 
      y: Math.random() * 2000,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.05 + 0.01
    }));

    let animId: number;
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const coreR = Math.min(w * 0.15, 120); // Responsive event horizon radius

      // Layer 1: Deep space background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#07001c');
      bgGrad.addColorStop(1, '#02000a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Layer 2: Starfield
      time += 0.01;
      ctx.save();
      stars.forEach(star => {
        let drawX = star.x - time * 50 * star.speed;
        let drawY = star.y;
        
        // Wrap around horizontally
        drawX = ((drawX % w) + w) % w;

        // Subtle gravitational lens distortion near black hole
        const dx = drawX - cx;
        const dy = drawY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let alpha = star.alpha;

        if (dist > 10 && dist < coreR * 4) {
          const pull = 1 - Math.pow(dist / (coreR * 4), 2);
          drawX -= dx * pull * 0.6;
          drawY -= dy * pull * 0.6;

          if (dist < coreR * 0.95) {
            alpha = 0; // Black hole eats the star
          }
        }

        if (alpha > 0) {
          // Twinkle effect
          const twinkle = Math.sin(time * 3 + star.size * 10) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * (0.3 + twinkle * 0.7)})`;
          ctx.beginPath();
          ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // Layer 3: Purple atmospheric haze (increased radius and intensity)
      const hazeGrad = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, w * 1.2);
      hazeGrad.addColorStop(0, 'rgba(120, 20, 255, 0.45)');
      hazeGrad.addColorStop(0.5, 'rgba(60, 10, 180, 0.2)');
      hazeGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = hazeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 1.2, Math.PI, Math.PI * 2);
      ctx.fill();

      // Soft purple haze addition (as requested: centerX, centerY, radius, centerX, centerY, radius * 5)
      const softHazeGrad = ctx.createRadialGradient(cx, cy, coreR, cx, cy, coreR * 5);
      softHazeGrad.addColorStop(0, 'rgba(150, 50, 255, 0.3)');
      softHazeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = softHazeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 5, 0, Math.PI * 2);
      ctx.fill();

      // Layer 4: Gravitational lens glow (Increased radius * 1.8 and bloom strength * 2)
      const glowR = (coreR + 60) * 1.8;
      const glowGrad = ctx.createRadialGradient(cx, cy, coreR - 5, cx, cy, glowR);
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      glowGrad.addColorStop(0.1, 'rgba(255, 200, 255, 1)'); // Stronger bloom
      glowGrad.addColorStop(0.4, 'rgba(140, 50, 255, 0.6)');
      glowGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, Math.PI, Math.PI * 2);
      ctx.fill();

      // Layer 7: Light bending arcs
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, cy);
      ctx.clip();
      
      for (let i = 0; i < 6; i++) {
        const arcT = (time * 0.3 + i * 0.166) % 1.0; 
        const radiusY = coreR + 10 + Math.pow(arcT, 1.5) * 120;
        const radiusX = coreR + 20 + Math.pow(arcT, 1.2) * 160;
        
        ctx.strokeStyle = `rgba(200, 150, 255, ${0.4 * (1 - arcT)})`;
        ctx.lineWidth = 1.5 - arcT;
        ctx.beginPath();
        ctx.ellipse(cx, Math.min(cy + 10, cy + radiusY/4), radiusX, radiusY, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Layer 5: Event horizon circle (Pure black circular core, upper half)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, Math.PI, Math.PI * 2);
      ctx.fill();

      // Very bright horizontal line at the equator
      ctx.globalCompositeOperation = 'screen';
      const beamW = Math.max(w * 0.9, coreR * 8); // Wider beam
      const beamGrad = ctx.createLinearGradient(cx - beamW/2, cy, cx + beamW/2, cy);
      beamGrad.addColorStop(0, 'rgba(100, 50, 255, 0)');
      beamGrad.addColorStop(0.3, 'rgba(200, 100, 255, 0.8)'); // Brighter
      beamGrad.addColorStop(0.45, 'rgba(255, 255, 255, 1)');
      beamGrad.addColorStop(0.55, 'rgba(255, 255, 255, 1)');
      beamGrad.addColorStop(0.7, 'rgba(200, 100, 255, 0.8)'); // Brighter
      beamGrad.addColorStop(1, 'rgba(100, 50, 255, 0)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(cx - beamW/2, cy - 2, beamW, 4); // Thicker line
      
      // Secondary thick blur along the horizon (increased bloom strength * 2)
      const beamBlur = ctx.createLinearGradient(cx - beamW/4, cy, cx + beamW/4, cy);
      beamBlur.addColorStop(0, 'rgba(150, 50, 255, 0)');
      beamBlur.addColorStop(0.5, 'rgba(220, 120, 255, 1)'); // Stronger bloom
      beamBlur.addColorStop(1, 'rgba(150, 50, 255, 0)');
      
      ctx.fillStyle = beamBlur;
      ctx.fillRect(cx - beamW/4, cy - 8, beamW/2, 16); // Wider blur
      ctx.globalCompositeOperation = 'source-over';


      // Layer 6: Horizontal horizon reflection (bottom half projection)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, cy, w, h - cy);
      ctx.clip(); 
      
      ctx.translate(cx, cy);
      ctx.scale(1, 0.3); // squash reflection vertically
      ctx.translate(-cx, -cy);

      const refGrad = ctx.createRadialGradient(cx, cy, coreR - 5, cx, cy, coreR + 80);
      refGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      refGrad.addColorStop(0.1, 'rgba(150, 50, 255, 0.7)');
      refGrad.addColorStop(0.5, 'rgba(50, 0, 150, 0.2)');
      refGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = refGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR + 80, 0, Math.PI);
      ctx.fill();

      // Lower half black hole reflection
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI);
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
