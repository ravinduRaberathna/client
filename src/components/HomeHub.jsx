import React from 'react';
import { motion } from 'framer-motion';

export default function HomeHub({ onSelectGame }) {
  const games = [
    {
      id: 'daam',
      title: '3D Sri Lankan Daam',
      tag: 'FLAGSHIP • 3D ML',
      desc: 'Real-time 1v1 online draughts with AI Bot, 3D WebGL physics, and WebCam Hand Gesture tracking.',
      badgeColor: '#38bdf8',
      icon: '♟️'
    },
    {
      id: 'tank',
      title: 'Tank Arena: Base Defense',
      tag: 'NEW • 2D ACTION',
      desc: '4-Player Corner Base Defense arena. Protect your statue core while destroying enemy bases.',
      badgeColor: '#ef4444',
      icon: '🛡️⚡'
    },
    {
      id: 'carrom',
      title: 'Carrom 3D Arena',
      tag: 'COMING SOON',
      desc: 'Traditional Sri Lankan 3D Carrom with realistic striker physics and gesture controls.',
      badgeColor: '#fbbf24',
      icon: '🎯'
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', background: 'linear-gradient(to right, #f8fafc, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          NEXUS ARENA ARCADE
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
          Select an arena to battle online or against advanced AI bots
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {games.map((g) => (
          <motion.div
            key={g.id}
            whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
            onClick={() => onSelectGame(g.id)}
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              padding: '24px',
              cursor: g.id === 'carrom' ? 'not-allowed' : 'pointer',
              opacity: g.id === 'carrom' ? 0.6 : 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '32px' }}>{g.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: g.badgeColor, padding: '4px 10px', borderRadius: '12px', background: `${g.badgeColor}15`, border: `1px solid ${g.badgeColor}40` }}>
                  {g.tag}
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>{g.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5' }}>{g.desc}</p>
            </div>

            <button
              style={{
                marginTop: '20px',
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                background: g.id === 'carrom' ? '#334155' : 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: g.id === 'carrom' ? 'not-allowed' : 'pointer'
              }}
            >
              {g.id === 'carrom' ? 'Under Development' : 'Enter Arena →'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}