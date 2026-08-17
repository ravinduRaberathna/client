import React from 'react';

export default function HeroCanvas({ mousePos }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        backgroundColor: '#070b14'
      }}
    >
      {/* 1. Dynamic Mouse Follower Spotlight (ප්‍රධාන Neon Light එක) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(99, 102, 241, 0.08) 40%, transparent 70%)',
          transform: `translate(${mousePos.x - 350}px, ${mousePos.y - 350}px)`,
          transition: 'transform 0.06s cubic-bezier(0.1, 0.9, 0.2, 1)',
          willChange: 'transform',
          filter: 'blur(30px)'
        }}
      />

      {/* 2. Secondary Intense Center Core Light */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, transparent 70%)',
          transform: `translate(${mousePos.x - 100}px, ${mousePos.y - 100}px)`,
          transition: 'transform 0.02s linear',
          willChange: 'transform',
          filter: 'blur(15px)'
        }}
      />

      {/* 3. Subtle Cyber Dot Grid Texture (Spotlight එක වැටෙනකොට ඉස්මතු වන grid එක) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: `radial-gradient(circle 450px at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle 450px at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 100%)`,
          opacity: 0.8
        }}
      />

      {/* 4. Ambient Background Top Horizon Light */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(56, 189, 248, 0.1) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 80%)',
          filter: 'blur(60px)'
        }}
      />
    </div>
  );
}