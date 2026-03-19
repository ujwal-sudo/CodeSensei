import React, { useEffect, useRef } from 'react';

export default function StitchBackground() {
  const blobLeftRef = useRef<HTMLDivElement>(null);
  const blobRightRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let smoothX = 0;
    let smoothY = 0;
    let targetX = 0;
    let targetY = 0;
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = e.clientX / window.innerWidth - 0.5;
      const cy = e.clientY / window.innerHeight - 0.5;
      targetX = cx * window.innerWidth * 0.06;
      targetY = cy * window.innerHeight * 0.06;
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const animate = () => {
      smoothX += (targetX - smoothX) * 0.08;
      smoothY += (targetY - smoothY) * 0.08;

      const blobX = smoothX * 0.5;
      const blobY = smoothY * 0.5;
      const gridX = -smoothX * 0.2;
      const gridY = -smoothY * 0.2;

      if (blobLeftRef.current) {
        blobLeftRef.current.style.transform = `translate(${blobX}px, ${blobY}px)`;
      }
      if (blobRightRef.current) {
        blobRightRef.current.style.transform = `translate(${blobX}px, ${blobY}px)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform = `translate(${gridX}px, ${gridY}px)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: '#0d0d0d',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* DOT GRID — moves opposite to cursor for depth */}
      <div
        ref={gridRef}
        style={{
          position: 'absolute',
          inset: '-5%',
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          zIndex: 1,
          willChange: 'transform',
        }}
      />

      {/* DARK CENTER VOID */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '65vw',
          height: '65vh',
          background:
            'radial-gradient(ellipse at center, #0d0d0d 40%, transparent 75%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* BLOB LEFT — parallax wrapper */}
      <div
        ref={blobLeftRef}
        style={{
          position: 'absolute',
          top: '25%',
          left: '-20%',
          width: '60vw',
          height: '65vh',
          zIndex: 2,
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `radial-gradient(ellipse at 60% 50%,
              #6d28d9 0%,
              #7c3aed 30%,
              #3b82f6 55%,
              #67e8f9 75%,
              transparent 85%)`,
            filter: 'blur(55px)',
            opacity: 0.85,
            animation: 'driftLeft 10s linear infinite',
          }}
        />
      </div>

      {/* BLOB RIGHT — parallax wrapper */}
      <div
        ref={blobRightRef}
        style={{
          position: 'absolute',
          top: '25%',
          right: '-20%',
          width: '60vw',
          height: '65vh',
          zIndex: 2,
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `radial-gradient(ellipse at 40% 50%,
              #6d28d9 0%,
              #7c3aed 30%,
              #3b82f6 55%,
              #67e8f9 75%,
              transparent 85%)`,
            filter: 'blur(55px)',
            opacity: 0.85,
            animation: 'driftRight 10s linear infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes driftLeft {
          0%   { transform: translate(0px,   0px)   rotate(0deg);   }
          25%  { transform: translate(30px,  -40px) rotate(90deg);  }
          50%  { transform: translate(15px,  -70px) rotate(180deg); }
          75%  { transform: translate(-20px, -40px) rotate(270deg); }
          100% { transform: translate(0px,   0px)   rotate(360deg); }
        }
        @keyframes driftRight {
          0%   { transform: translate(0px,   0px)   rotate(0deg);    }
          25%  { transform: translate(-30px, -40px) rotate(-90deg);  }
          50%  { transform: translate(-15px, -70px) rotate(-180deg); }
          75%  { transform: translate(20px,  -40px) rotate(-270deg); }
          100% { transform: translate(0px,   0px)   rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}

