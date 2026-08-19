import React from 'react';
import { motion } from 'framer-motion';

export default function Navbar({ onNavigate, activeTab }) {
  return (
    <header style={{
      width: '100%',
      height: '64px',
      background: 'rgba(7, 11, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand Logo */}
      <div 
        onClick={() => onNavigate('home')}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #00f0ff, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)'
        }}>
          ⚡
        </div>
        <div>
          <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '1px', background: 'linear-gradient(90deg, #ffffff, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NEXUS
          </span>
          <span style={{ fontSize: '16px', fontWeight: '900', color: '#00f0ff', marginLeft: '4px' }}>
            ARCADE
          </span>
        </div>
      </div>

      {/* Navigation Pill Buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => onNavigate('home')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: activeTab === 'home' ? '1px solid #38bdf8' : '1px solid transparent',
            background: activeTab === 'home' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'home' ? '#38bdf8' : '#94a3b8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🎮 Hub
        </button>

        <button
          onClick={() => onNavigate('daam')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: activeTab === 'daam' ? '1px solid #38bdf8' : '1px solid transparent',
            background: activeTab === 'daam' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'daam' ? '#38bdf8' : '#94a3b8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ♟️ 3D Daam
        </button>

        <button
          onClick={() => onNavigate('tank')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: activeTab === 'tank' ? '1px solid #00f0ff' : '1px solid transparent',
            background: activeTab === 'tank' ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
            color: activeTab === 'tank' ? '#00f0ff' : '#94a3b8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🛡️ Tank 4P
        </button>
      </div>
    </header>
  );
}