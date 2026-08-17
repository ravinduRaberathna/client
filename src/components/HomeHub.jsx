import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroCanvas from './HeroCanvas';

const GAMES_LIST = [
  {
    id: 'daam',
    title: '3D Sri Lankan Daam',
    tagline: 'Hand-Tracked Real-time Multiplayer Checkers arena',
    status: 'PLAYABLE NOW',
    active: true,
    tags: ['Three.js', 'MediaPipe AI', 'Socket.io', '3D Physics'],
  },
  {
    id: 'carrom',
    title: '3D Classic Carrom Arena',
    tagline: 'Physics-driven striker simulation with finger gestures',
    status: 'COMING SOON',
    active: false,
    tags: ['Rapier Physics', 'Multiplayer', 'Hand Tracking'],
  },
  {
    id: 'chess',
    title: 'Cyberpunk 3D Chess',
    tagline: 'Futuristic holographic pieces with smart AI opponent',
    status: 'IN DEVELOPMENT',
    active: false,
    tags: ['Stockfish AI', 'React Three Fiber', 'GLSL Shaders'],
  }
];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.18, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } 
  }
};

export default function HomeHub({ onSelectGame }) {
  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', backgroundColor: '#070b14' }}>
      
      {/* 1. Custom Glowing Mouse Cursor */}
      <motion.div
        style={{
          position: 'fixed',
          left: mousePos.x - 6,
          top: mousePos.y - 6,
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#38bdf8',
          boxShadow: '0 0 14px #38bdf8, 0 0 28px #0284c7',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
        animate={{ x: 0, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      />

      {/* 2. Interactive Spotlight Background */}
      <HeroCanvas mousePos={mousePos} />

      {/* 3. Hero Area (Initial Load Animation) */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '100px 20px 60px',
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto'
        }}
      >
        <motion.div 
          variants={itemVariants}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 18px',
            borderRadius: '30px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '24px',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.1)'
          }}
        >
          <span>✨ Next-Gen Browser Gaming Platform</span>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          style={{
            fontSize: '54px',
            fontWeight: '900',
            lineHeight: '1.15',
            marginBottom: '22px',
            letterSpacing: '-1.5px',
            color: '#ffffff'
          }}
        >
          Play Classic Board Games In <br />
          <span style={{
            background: 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            3D With Hand Gestures
          </span>
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          style={{
            fontSize: '18px',
            color: '#94a3b8',
            lineHeight: '1.6',
            maxWidth: '680px',
            margin: '0 auto 36px'
          }}
        >
          No physical controllers needed. Use your WebCam to grab and move 3D pieces in real-time or challenge friends online with instant room codes.
        </motion.p>

        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: '0 12px 30px rgba(2, 132, 199, 0.6)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelectGame('daam')}
            style={{
              padding: '15px 36px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(2, 132, 199, 0.4)',
            }}
          >
            Launch Daam 3D 🚀
          </motion.button>
        </motion.div>
      </motion.section>

      {/* 4. Games Showcase Grid (Scroll-Triggered Reveal) */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '30px 20px 100px'
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '32px' }}
        >
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', margin: '0 0 6px' }}>
            Available & Upcoming Games
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Explore WebGL powered real-time multiplayer titles
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {GAMES_LIST.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              whileHover={game.active ? { y: -8, transition: { duration: 0.2 } } : {}}
              onClick={() => game.active && onSelectGame(game.id)}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                borderRadius: '16px',
                padding: '26px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: game.active ? 'pointer' : 'default',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: game.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                    color: game.active ? '#10b981' : '#94a3b8',
                    border: `1px solid ${game.active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`
                  }}>
                    {game.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>{game.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5', marginBottom: '22px' }}>{game.tagline}</p>
              </div>

              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '22px' }}>
                  {game.tags.map((t, idx) => (
                    <span key={idx} style={{ background: '#090d16', color: '#cbd5e1', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', border: '1px solid #1e293b' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <motion.button
                  whileHover={game.active ? { scale: 1.02 } : {}}
                  whileTap={game.active ? { scale: 0.98 } : {}}
                  disabled={!game.active}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: game.active ? 'linear-gradient(135deg, #0284c7, #2563eb)' : '#1e293b',
                    color: game.active ? '#fff' : '#64748b',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: game.active ? 'pointer' : 'not-allowed',
                    boxShadow: game.active ? '0 4px 14px rgba(2, 132, 199, 0.3)' : 'none'
                  }}
                >
                  {game.active ? 'Play Match Now' : 'Stay Tuned'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}