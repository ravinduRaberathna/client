import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomeHub({ onSelectGame }) {
  const [mousePos, setMousePos] = useState({ x: -800, y: -800 });
  const [touchRipples, setTouchRipples] = useState([]);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);

  // Particle System Animation (Canvas 60fps)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial ambient floating background particles
    const ambientCount = 35;
    for (let i = 0; i < ambientCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1.2,
        color: Math.random() > 0.5 ? '#38bdf8' : '#818cf8',
        alpha: Math.random() * 0.4 + 0.15,
        isAmbient: true
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.isAmbient) {
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
        } else {
          p.alpha -= 0.025; // Particle trail decay
          p.size *= 0.96;
          if (p.alpha <= 0 || p.size <= 0.2) {
            particlesRef.current.splice(i, 1);
            continue;
          }
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.isAmbient ? 6 : 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Global Mouse Move & Trail Particle Spawn
  useEffect(() => {
    let lastSpawn = 0;

    const handleGlobalMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      const now = Date.now();
      if (now - lastSpawn > 25) { // Spawn particle every 25ms
        lastSpawn = now;
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push({
            x: e.clientX + (Math.random() - 0.5) * 16,
            y: e.clientY + (Math.random() - 0.5) * 16,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            size: Math.random() * 3.5 + 1.5,
            color: Math.random() > 0.4 ? '#00f0ff' : '#a855f7',
            alpha: 0.8,
            isAmbient: false
          });
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  // Mobile Touch Ripple & Sparks
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const newRipple = {
      id: Date.now() + Math.random(),
      x: touch.clientX,
      y: touch.clientY
    };
    setTouchRipples((prev) => [...prev.slice(-3), newRipple]);

    // Spawn touch sparkles
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 1.0;
      particlesRef.current.push({
        x: touch.clientX,
        y: touch.clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.5 ? '#00f0ff' : '#ec4899',
        alpha: 1.0,
        isAmbient: false
      });
    }
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
      btnGradient: '#1e293b',
      active: false,
      features: ['Realistic Striker Physics', 'Pocket Collisions', 'Local & Online Co-op']
    }
  ];

  return (
    <div
      onTouchStart={handleTouchStart}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {/* 🌌 Background Floating Particle Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* 🌟 Ambient Floating Blurred Bokeh Orbs */}
      <div style={{ position: 'fixed', top: '15%', left: '10%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.09) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '10%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* 💡 Dual-Tone Screen-Wide Interactive Cursor Glow */}
      <div
        style={{
          position: 'fixed',
          left: mousePos.x,
          top: mousePos.y,
          width: '780px',
          height: '780px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.16) 0%, rgba(99, 102, 241, 0.07) 40%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'left 0.05s ease-out, top 0.05s ease-out'
        }}
      />

      {/* Mobile Touch Ripple Layer */}
      <AnimatePresence>
        {touchRipples.map((r) => (
          <motion.div
            key={r.id}
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 3.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: r.x,
              top: r.y,
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.5) 0%, transparent 80%)',
              border: '1.5px solid rgba(0, 240, 255, 0.7)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main Content Container */}
      <div style={{ width: '100%', maxWidth: '1240px', padding: '24px 20px', position: 'relative', zIndex: 1 }}>
        
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', margin: '0 0 28px 0' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '30px',
            background: 'rgba(0, 240, 255, 0.08)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
            marginBottom: '14px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f0ff', boxShadow: '0 0 10px #00f0ff' }} />
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#00f0ff', letterSpacing: '1.2px' }}>NEXT-GEN WEB MULTIPLAYER ARENA</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #ffffff 20%, #38bdf8 65%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
            marginBottom: '10px'
          }}>
            NEXUS ARENA ARCADE
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 'clamp(13px, 2.2vw, 15px)', maxWidth: '620px', margin: '0 auto', lineHeight: '1.6' }}>
            Real-time WebSocket multiplayer, Computer Vision gesture tracking, and adaptive Deep-AI bots in high-performance WebGL.
          </p>
        </motion.div>

        {/* Games Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}>
          {games.map((g, idx) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={g.active ? { y: -7, boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8), 0 0 25px rgba(56, 189, 248, 0.2)' } : {}}
              onClick={() => g.active && onSelectGame(g.id)}
              style={{
                background: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(18px)',
                borderRadius: '24px',
                border: `1px solid ${g.active ? 'rgba(56, 189, 248, 0.25)' : 'rgba(51, 65, 85, 0.4)'}`,
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
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: `linear-gradient(90deg, transparent, ${g.badgeColor}, transparent)` }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: `${g.badgeColor}15`,
                    border: `1px solid ${g.badgeColor}35`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: `0 0 20px ${g.badgeColor}25`
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

                <h3 style={{ fontSize: '19px', fontWeight: '900', color: '#f8fafc', marginBottom: '4px' }}>
                  {g.title}
                </h3>
                <p style={{ color: '#00f0ff', fontSize: '11px', fontWeight: '700', marginBottom: '12px' }}>
                  {g.subtitle}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                  {g.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#94a3b8' }}>
                      <span style={{ color: g.badgeColor, fontSize: '10px' }}>✦</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={g.active ? { scale: 0.98 } : {}}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: g.btnGradient,
                  color: g.id === 'tank' ? '#020617' : '#ffffff',
                  fontWeight: '900',
                  fontSize: '13px',
                  cursor: g.active ? 'pointer' : 'not-allowed',
                  boxShadow: g.active ? `0 8px 25px ${g.badgeColor}35` : 'none',
                  letterSpacing: '0.5px'
                }}
              >
                {g.active ? 'Launch Arena →' : 'Under Construction'}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Feature Badges Footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '14px',
          padding: '12px 18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#f8fafc' }}>Sub-30ms Latency</div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>Real-time WebSockets</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🖐️</span>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#f8fafc' }}>MediaPipe AI Vision</div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>Touchless Hand Tracking</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#f8fafc' }}>Cross-Device Engine</div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>Desktop & Touch Mobile</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}