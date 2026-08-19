import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ onNavigate, activeTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Hub', icon: '🎮', color: '#38bdf8', desc: 'Game Lobby & Selection' },
    { id: 'daam', label: '3D Daam', icon: '♟️', color: '#38bdf8', desc: 'AI Bot & Multiplayer 3D' },
    { id: 'tank', label: 'Tank 4P', icon: '🛡️', color: '#00f0ff', desc: '4-Player Base Defense' }
  ];

  const handleItemClick = (id) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header style={{
      width: '100%',
      height: '60px',
      background: 'rgba(7, 11, 20, 0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: '1240px',
        height: '100%',
        margin: '0 auto',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        
        {/* Brand Text */}
        <div 
          onClick={() => handleItemClick('home')}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ 
            fontSize: '16px', 
            fontWeight: '900', 
            letterSpacing: '1px', 
            background: 'linear-gradient(90deg, #ffffff, #38bdf8)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            NEXUS
          </span>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: '900', 
            letterSpacing: '1px',
            color: '#00f0ff', 
            marginLeft: '5px' 
          }}>
            ARCADE
          </span>
        </div>

        {/* Desktop / Laptop Horizontal Navigation (>= 850px) */}
        <nav className="desktop-navbar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '10px',
                  border: isActive ? `1px solid ${item.color}` : '1px solid transparent',
                  background: isActive ? `${item.color}15` : 'transparent',
                  color: isActive ? item.color : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isActive ? `0 0 15px ${item.color}25` : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile / Tablet Hamburger Toggle Button (< 850px) */}
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4.5px',
            cursor: 'pointer',
            padding: '8px',
            boxShadow: mobileMenuOpen ? '0 0 15px rgba(56, 189, 248, 0.4)' : 'none',
            transition: 'border 0.2s'
          }}
        >
          <motion.span
            animate={mobileMenuOpen ? { rotate: 45, y: 6.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: '20px', height: '2px', background: '#38bdf8', borderRadius: '2px' }}
          />
          <motion.span
            animate={mobileMenuOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: '20px', height: '2px', background: '#38bdf8', borderRadius: '2px' }}
          />
          <motion.span
            animate={mobileMenuOpen ? { rotate: -45, y: -6.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: '20px', height: '2px', background: '#38bdf8', borderRadius: '2px' }}
          />
        </button>

      </div>

      {/* Animated Dropdown Drawer for Mobile & Tablets */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '60px',
              left: 0,
              right: 0,
              background: 'rgba(7, 11, 20, 0.96)',
              backdropFilter: 'blur(24px)',
              borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
              overflow: 'hidden',
              zIndex: 999
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: isActive ? `1px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                    background: isActive ? `${item.color}20` : 'rgba(15, 23, 42, 0.65)',
                    color: isActive ? item.color : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 0 15px ${item.color}25` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: `${item.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: isActive ? item.color : '#f8fafc' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                  ) : (
                    <span style={{ fontSize: '14px', color: '#475569' }}>→</span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}