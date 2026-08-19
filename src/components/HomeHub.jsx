import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomeHub({ onSelectGame }) {
  const [mousePos, setMousePos] = useState({ x: -600, y: -600 });
  const [touchRipples, setTouchRipples] = useState([]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTouchStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const newRipple = {
      id: Date.now() + Math.random(),
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    setTouchRipples((prev) => [...prev.slice(-3), newRipple]);
  };

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
      subtitle: 'Online Multiplayer • AI Bot • Hand Gestures',
      tag: 'FLAGSHIP',
      badgeColor: '#38bdf8',
      icon: '♟️',
      gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)',
      btnGradient: 'linear-gradient(135deg, #0284c7, #2563eb)',
      active: true,
      features: ['3D WebGL Realistic Arena', 'Vision ML Hand Tracking', 'Adaptive Grandmaster AI']
    },
    {
      id: 'tank',
      title: 'Tank Arena: Cyber Core',
      subtitle: '4-Player Base Defense Battle',
      tag: '4P MULTIPLAYER',
      badgeColor: '#00f0ff',
      icon: '🛡️',
      gradient: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(244, 63, 94, 0.05) 100%)',
      btnGradient: 'linear-gradient(135deg, #00f0ff, #0072ff)',
      active: true,
      features: ['4-Corner Core Defense', 'Touch D-Pad Controls', 'Real-Time Bullet Sync']
    },
    {
      id: 'carrom',
      title: 'Carrom 3D Arena',
      subtitle: 'Physics-Based Board Strike',
      tag: 'COMING SOON',
      badgeColor: '#fbbf24',
      icon: '🎯',
      gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
      btnGradient: '#1e293b',
      active: false,
      features: ['Realistic Striker Physics', 'Pocket Collisions', 'Local & Online Co-op']
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
        padding: '36px 20px',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}
    >
      {/* Background Neon Spotlight (Desktop) */}
      <div
        style={{
          position: 'absolute',
          left: mousePos.x,
          top: mousePos.y,
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, rgba(56, 189, 248, 0.04) 40%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'left 0.05s ease-out, top 0.05s ease-out'
        }}
      />

      {/* Mobile Touch Ripples */}
      <AnimatePresence>
        {touchRipples.map((r) => (
          <motion.div
            key={r.id}
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: 3.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4) 0%, transparent 80%)',
              border: '1px solid rgba(0, 240, 255, 0.6)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        ))}
      </AnimatePresence>

      {/* Hero Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', margin: '10px 0 32px 0', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '30px',
          background: 'rgba(0, 240, 255, 0.08)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          marginBottom: '16px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f0ff', boxShadow: '0 0 10px #00f0ff' }} />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#00f0ff', letterSpacing: '1.2px' }}>NEXT-GEN WEB MULTIPLAYER ARENA</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(30px, 5.5vw, 50px)',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #ffffff 20%, #38bdf8 65%, #6366f1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
          marginBottom: '12px'
        }}>
          NEXUS ARENA ARCADE
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 'clamp(13px, 2.2vw, 15px)', maxWidth: '620px', margin: '0 auto', lineHeight: '1.6' }}>
          Real-time WebSocket multiplayer, Computer Vision gesture tracking, and adaptive Deep-AI bots in high-performance WebGL.
        </p>
      </motion.div>

      {/* Main Game Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        position: 'relative',
        zIndex: 1,
        marginBottom: '36px'
      }}>
        {games.map((g, idx) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.12 }}
            whileHover={g.active ? { y: -8, boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7)' } : {}}
            onClick={() => g.active && onSelectGame(g.id)}
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(16px)',
              borderRadius: '24px',
              border: `1px solid ${g.active ? 'rgba(56, 189, 248, 0.22)' : 'rgba(51, 65, 85, 0.4)'}`,
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
            {/* Top Accent Rim */}
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: `linear-gradient(90deg, transparent, ${g.badgeColor}, transparent)` }} />

            <div>
              {/* Card Top Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: `${g.badgeColor}15`,
                  border: `1px solid ${g.badgeColor}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  boxShadow: `0 0 20px ${g.badgeColor}20`
                }}>
                  {g.icon}
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '900',
                  color: g.badgeColor,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: `${g.badgeColor}15`,
                  border: `1px solid ${g.badgeColor}40`,
                  letterSpacing: '0.5px'
                }}>
                  {g.tag}
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#f8fafc', marginBottom: '4px' }}>
                {g.title}
              </h3>
              <p style={{ color: '#00f0ff', fontSize: '11px', fontWeight: '700', marginBottom: '14px' }}>
                {g.subtitle}
              </p>

              {/* Features List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                {g.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                    <span style={{ color: g.badgeColor, fontSize: '10px' }}>✦</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <motion.button
              whileTap={g.active ? { scale: 0.98 } : {}}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                border: 'none',
                background: g.btnGradient,
                color: g.id === 'tank' ? '#020617' : '#ffffff',
                fontWeight: '900',
                fontSize: '13px',
                cursor: g.active ? 'pointer' : 'not-allowed',
                boxShadow: g.active ? `0 8px 25px ${g.badgeColor}30` : 'none',
                letterSpacing: '0.5px'
              }}
            >
              {g.active ? 'Launch Arena →' : 'Under Construction'}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Bottom Features Info Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '14px 20px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc' }}>Sub-30ms Latency</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Real-time WebSockets</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🖐️</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc' }}>MediaPipe AI Vision</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Touchless Hand Tracking</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📱</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc' }}>Cross-Device Engine</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Desktop & Touch Mobile</div>
          </div>
        </div>
      </div>
    </div>
  );
}