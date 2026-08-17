import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Navbar({ onNavigate, activeTab }) {
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll detect කර Glassmorphism styles වෙනස් කිරීම
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isScrolled ? '12px 40px' : '20px 40px',
        backgroundColor: isScrolled ? 'rgba(11, 15, 25, 0.75)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)',
        WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'blur(0px)',
        borderBottom: isScrolled ? '1px solid rgba(56, 189, 248, 0.15)' : '1px solid transparent',
        boxShadow: isScrolled ? '0 10px 30px rgba(0, 0, 0, 0.4)' : 'none',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'padding 0.3s ease, background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
      }}
    >
      {/* Brand Logo */}
      <motion.div 
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onNavigate('home')} 
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '900',
          color: '#fff',
          boxShadow: '0 0 15px rgba(56, 189, 248, 0.5)'
        }}>
          G
        </div>
        <span style={{
          fontSize: '20px',
          fontWeight: '900',
          letterSpacing: '-0.5px',
          background: 'linear-gradient(to right, #ffffff, #38bdf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          NEXUS ARENA
        </span>
      </motion.div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <motion.button 
          whileHover={{ color: '#38bdf8' }}
          onClick={() => onNavigate('home')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'home' ? '#38bdf8' : '#94a3b8',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'color 0.2s'
          }}
        >
          All Games
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(56, 189, 248, 0.5)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate('daam')}
          style={{ 
            background: 'linear-gradient(135deg, #0284c7, #2563eb)', 
            color: '#fff', 
            border: 'none', 
            padding: '9px 20px', 
            borderRadius: '24px', 
            fontWeight: '700', 
            fontSize: '13px', 
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(2, 132, 199, 0.35)'
          }}
        >
          Play Daam 3D
        </motion.button>
      </div>
    </motion.nav>
  );
}