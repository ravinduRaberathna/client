import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Navbar({ onNavigate, activeTab }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isScrolled ? '10px 20px' : '16px 20px',
        backgroundColor: isScrolled ? 'rgba(11, 15, 25, 0.85)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)',
        WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)',
        borderBottom: isScrolled ? '1px solid rgba(56, 189, 248, 0.15)' : '1px solid transparent',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s ease'
      }}
    >
      <div 
        onClick={() => onNavigate('home')} 
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '900',
          color: '#fff',
          fontSize: '14px'
        }}>
          G
        </div>
        <span style={{
          fontSize: '18px',
          fontWeight: '900',
          background: 'linear-gradient(to right, #ffffff, #38bdf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          NEXUS ARENA
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button 
          onClick={() => onNavigate('home')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'home' ? '#38bdf8' : '#94a3b8',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          All Games
        </button>

        <button 
          onClick={() => onNavigate('daam')}
          style={{ 
            background: 'linear-gradient(135deg, #0284c7, #2563eb)', 
            color: '#fff', 
            border: 'none', 
            padding: '7px 16px', 
            borderRadius: '20px', 
            fontWeight: '700', 
            fontSize: '12px', 
            cursor: 'pointer'
          }}
        >
          Play Daam 3D
        </button>
      </div>
    </motion.nav>
  );
}