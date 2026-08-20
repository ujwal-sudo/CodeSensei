import React, { useEffect, useRef } from 'react';

const NeuralGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Configuration
    const spacing = 35; // Space between dots
    const glowRadius = 150;
    const repulsionRadius = 80;
    const maxDisplacement = 30;
    const damping = 0.75;
    const stiffness = 0.1; // Spring stiffness
    const repulsionForce = 2.0;

    // Mouse tracking
    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      // Get mouse position relative to canvas
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initDots();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Initialize dots
    let dots: { rx: number; ry: number; x: number; y: number; vx: number; vy: number }[] = [];

    const initDots = () => {
      dots = [];
      for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
          dots.push({
            rx: x, // rest x
            ry: y, // rest y
            x: x,  // current x
            y: y,  // current y
            vx: 0,
            vy: 0
          });
        }
      }
    };
    initDots();

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const dot of dots) {
        // Calculate distance from mouse to current position
        const dxMouse = mouse.x - dot.x;
        const dyMouse = mouse.y - dot.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        // Repulsion logic
        if (distMouse < repulsionRadius) {
          // Push away from mouse
          const force = (repulsionRadius - distMouse) / repulsionRadius * repulsionForce;
          const angle = Math.atan2(dyMouse, dxMouse);
          
          dot.vx -= Math.cos(angle) * force;
          dot.vy -= Math.sin(angle) * force;
        }

        // Spring logic (pull toward rest position)
        const dxRest = dot.rx - dot.x;
        const dyRest = dot.ry - dot.y;
        
        dot.vx += dxRest * stiffness;
        dot.vy += dyRest * stiffness;

        // Apply damping
        dot.vx *= damping;
        dot.vy *= damping;

        // Update position
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Cap displacement
        const displacementX = dot.x - dot.rx;
        const displacementY = dot.y - dot.ry;
        const displacementDist = Math.sqrt(displacementX * displacementX + displacementY * displacementY);
        
        if (displacementDist > maxDisplacement) {
          const ratio = maxDisplacement / displacementDist;
          dot.x = dot.rx + displacementX * ratio;
          dot.y = dot.ry + displacementY * ratio;
        }

        // Draw dot
        let alpha = 0.2;
        let radius = 1.5;
        let color = `rgba(183, 243, 74, ${alpha})`;

        // Glow logic based on rest position so it glows even if repelled
        const dxRestMouse = mouse.x - dot.rx;
        const dyRestMouse = mouse.y - dot.ry;
        const distRestMouse = Math.sqrt(dxRestMouse * dxRestMouse + dyRestMouse * dyRestMouse);

        if (distRestMouse < glowRadius) {
          const intensity = 1 - (distRestMouse / glowRadius);
          alpha = 0.2 + intensity * 0.8;
          radius = 1.5 + intensity * 1.5;
        } else {
          color = `rgba(100, 110, 80, 0.2)`; // default subtle olive dot
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = distRestMouse < glowRadius ? `rgba(183, 243, 74, ${alpha})` : color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default NeuralGrid;
