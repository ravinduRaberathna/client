import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ onNavigate, activeTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Hub', icon: '🎮', color: '#38bdf8' },
    { id: 'daam', label: '3D Daam', icon: '♟️', color: '#38bdf8' },
    { id: 'tank', label: 'Tank 4P', icon: '🛡️', color: '#00f0ff' }
  ];

  const handleItemClick = (id) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header style={{
      width: '100%',
      height: '60px',
      background: 'rgba(7, 11, 20, 0.85)',
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
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        
        {/* Brand Logo */}
        <div 
          onClick={() => handleItemClick('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00f0ff, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)'
          }}>
            ⚡
          </div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '0.5px', background: 'linear-gradient(90deg, #ffffff, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              NEXUS
            </span>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#00f0ff', marginLeft: '3px' }}>
              ARCADE
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                style={{
                  padding: '6px 14px',
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

        {/* Mobile Hamburger Menu Button */}
        <button
          className="mobile-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          <motion.span
            animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            style={{ width: '18px', height: '2px', background: '#38bdf8', borderRadius: '2px' }}
          />
          <motion.span
            animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
            style={{ width: '18px', height: '2px', background: '#38bdf8', borderRadius: '2px' }}
          />
          <motion.span
            animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            style={{ width: '18px', height: '2px', background: '#38bdf8', borderRadius: '2px' }}
          />
        </button>

      </div>

      {/* Mobile Animated Dropdown Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '60px',
              left: 0,
              right: 0,
              background: 'rgba(7, 11, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
              zIndex: 999
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isActive ? `1px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.05)',
                    background: isActive ? `${item.color}20` : 'rgba(15, 23, 42, 0.6)',
                    color: isActive ? item.color : '#f8fafc',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, boxShadow: `0 0 8px ${item.color}` }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}