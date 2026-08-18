import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomeHub({ onSelectGame }) {
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [touchRipples, setTouchRipples] = useState([]);

  // Mouse Glow Listener (Desktop)
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Touch Ripple Listener (Mobile)
  const handleTouchStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const newRipple = {
      id: Date.now() + Math.random(),
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    setTouchRipples((prev) => [...prev.slice(-4), newRipple]);
  };

  // Clean old ripples
  useEffect(() => {
    if (touchRipples.length > 0) {
      const timer = setTimeout(() => {
        setTouchRipples((prev) => prev.slice(1));
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [touchRipples]);

  const games = [
    {
      id: 'daam',
      title: '3D Sri Lankan Daam',
      tag: 'FLAGSHIP • 3D ML',
      desc: 'Real-time online multiplayer and Deep-AI draughts featuring realistic 3D WebGL graphics and interactive hand gesture tracking.',
      badgeColor: '#38bdf8',
      icon: '♟️',
      active: true
    },
    {
      id: 'tank',
      title: 'Tank Arena: Base Defense',
      tag: 'HOT • 4P ACTION',
      desc: '4-Player Corner Base Defense Mayhem. Defend your Core Statue crystal while obliterating enemy bases with real-time socket sync.',
      badgeColor: '#00f0ff',
      icon: '🛡️',
      active: true
    },
    {
      id: 'carrom',
      title: 'Carrom 3D Arena',
      tag: 'COMING SOON',
      desc: 'Authentic Sri Lankan 3D Carrom board with realistic striker physics, coin collisions, and gesture-driven strikes.',
      badgeColor: '#fbbf24',
      icon: '🎯',
      active: false
    }
  ];

  return (
    <div
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      style={{
        position: 'relative',
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '30px 16px',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Desktop Dynamic Mouse Glow Spotlight */}
      <div
        style={{
          position: 'absolute',
          left: mousePos.x,
          top: mousePos.y,
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, rgba(99, 102, 241, 0.06) 45%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'left 0.05s ease-out, top 0.05s ease-out'
        }}
      />

      {/* Mobile Touch Ripple Pulses */}
      <AnimatePresence>
        {touchRipples.map((r) => (
          <motion.div
            key={r.id}
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: 3.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4) 0%, rgba(56, 189, 248, 0.2) 50%, transparent 80%)',
              border: '1px solid rgba(56, 189, 248, 0.6)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        ))}
      </AnimatePresence>

      {/* Hero Banner Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '36px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '30px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '14px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }} />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', letterSpacing: '1px' }}>NEXT-GEN MULTIPLAYER ARCADE</span>
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: '900', background: 'linear-gradient(135deg, #ffffff 30%, #38bdf8 80%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px', marginBottom: '10px' }}>
          NEXUS ARENA ARCADE
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 'clamp(13px, 2.5vw, 15px)', maxWidth: '580px', margin: '0 auto', lineHeight: '1.6' }}>
          Experience competitive multiplayer and advanced AI gaming with real-time WebSockets and cross-device optimization.
        </p>
      </motion.div>

      {/* Responsive Games Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '22px', position: 'relative', zIndex: 1 }}>
        {games.map((g, idx) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={g.active ? { y: -8, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)' } : {}}
            onClick={() => g.active && onSelectGame(g.id)}
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(16px)',
              borderRadius: '24px',
              border: `1px solid ${g.active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(51, 65, 85, 0.4)'}`,
              padding: '24px',
              cursor: g.active ? 'pointer' : 'not-allowed',
              opacity: g.active ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: `linear-gradient(90deg, transparent, ${g.badgeColor}, transparent)` }} />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `${g.badgeColor}15`, border: `1px solid ${g.badgeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: `0 0 20px ${g.badgeColor}20` }}>
                  {g.icon}
                </div>
                <span style={{ fontSize: '10px', fontWeight: '900', color: g.badgeColor, padding: '4px 10px', borderRadius: '20px', background: `${g.badgeColor}15`, border: `1px solid ${g.badgeColor}40`, letterSpacing: '0.5px' }}>
                  {g.tag}
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>{g.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6' }}>{g.desc}</p>
            </div>

            <button
              style={{
                marginTop: '22px',
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                border: 'none',
                background: g.active ? 'linear-gradient(135deg, #0284c7, #2563eb)' : '#1e293b',
                color: g.active ? '#ffffff' : '#64748b',
                fontWeight: '800',
                fontSize: '13px',
                cursor: g.active ? 'pointer' : 'not-allowed',
                boxShadow: g.active ? '0 8px 20px rgba(2, 132, 199, 0.35)' : 'none',
                letterSpacing: '0.5px'
              }}
            >
              {g.active ? 'Enter Arena →' : 'Under Development'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}