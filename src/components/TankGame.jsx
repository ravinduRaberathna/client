import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CANVAS_WIDTH = 920;
const CANVAS_HEIGHT = 600;
const TANK_SIZE = 28;
const STATUE_SIZE = 34;

const INITIAL_BASES = [
  { id: 0, color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)', name: 'BLUE CORE', x: 65, y: 65, statueHp: 500, maxStatueHp: 500, active: true },
  { id: 1, color: '#ff0055', glow: 'rgba(255, 0, 85, 0.4)', name: 'RED CORE', x: CANVAS_WIDTH - 65, y: CANVAS_HEIGHT - 65, statueHp: 500, maxStatueHp: 500, active: true },
  { id: 2, color: '#00ff88', glow: 'rgba(0, 255, 136, 0.4)', name: 'GREEN CORE', x: CANVAS_WIDTH - 65, y: 65, statueHp: 500, maxStatueHp: 500, active: true },
  { id: 3, color: '#ffb700', glow: 'rgba(255, 183, 0, 0.4)', name: 'GOLD CORE', x: 65, y: CANVAS_HEIGHT - 65, statueHp: 500, maxStatueHp: 500, active: true }
];

export default function TankGame({ onBackToHub }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('lobby');
  const [winner, setWinner] = useState(null);
  const [matchTime, setMatchTime] = useState(0);
  const [killFeed, setKillFeed] = useState([]);

  const keysRef = useRef({});
  const gameLoopRef = useRef(null);

  const stateRef = useRef({
    tanks: [],
    bullets: [],
    particles: [],
    powerups: [],
    treadMarks: [],
    walls: [],
    bases: [],
    matchStart: 0
  });

  const initMap = () => {
    const walls = [];
    const brickGrid = [
      { x: 260, y: 130, w: 24, h: 130 },
      { x: CANVAS_WIDTH - 284, y: 130, w: 24, h: 130 },
      { x: 260, y: CANVAS_HEIGHT - 260, w: 24, h: 130 },
      { x: CANVAS_WIDTH - 284, y: CANVAS_HEIGHT - 260, w: 24, h: 130 },
      { x: 340, y: 220, w: 240, h: 22 },
      { x: 340, y: 358, w: 240, h: 22 }
    ];

    brickGrid.forEach(b => walls.push({ ...b, hp: 90, maxHp: 90, isSteel: false }));

    const steelBlocks = [
      { x: 448, y: 265, w: 24, h: 70 }
    ];
    steelBlocks.forEach(s => walls.push({ ...s, hp: 9999, maxHp: 9999, isSteel: true }));

    return walls;
  };

  const spawnPowerUp = () => {
    const types = ['shield', 'speed', 'double'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = CANVAS_WIDTH / 2 + (Math.random() * 260 - 130);
    const y = CANVAS_HEIGHT / 2 + (Math.random() * 160 - 80);
    stateRef.current.powerups.push({ x, y, type, life: 12.0 });
  };

  const addFeed = (text) => {
    setKillFeed(prev => [text, ...prev].slice(0, 4));
  };

  const startGame = () => {
    const bases = JSON.parse(JSON.stringify(INITIAL_BASES));
    const walls = initMap();

    const tanks = [
      {
        id: 0,
        isHuman: true,
        name: 'Player 1',
        color: '#00f0ff',
        x: 140,
        y: 140,
        angle: 0,
        hp: 100,
        maxHp: 100,
        speed: 3.6,
        respawnTimer: 0,
        cooldown: 0,
        shield: false,
        doubleFire: false,
        alive: true
      },
      {
        id: 1,
        isHuman: false,
        name: 'RED TANK (AI)',
        color: '#ff0055',
        x: CANVAS_WIDTH - 140,
        y: CANVAS_HEIGHT - 140,
        angle: Math.PI,
        hp: 100,
        maxHp: 100,
        speed: 2.3,
        respawnTimer: 0,
        cooldown: 0,
        shield: false,
        doubleFire: false,
        alive: true
      },
      {
        id: 2,
        isHuman: false,
        name: 'GREEN TANK (AI)',
        color: '#00ff88',
        x: CANVAS_WIDTH - 140,
        y: 140,
        angle: Math.PI / 2,
        hp: 100,
        maxHp: 100,
        speed: 2.3,
        respawnTimer: 0,
        cooldown: 0,
        shield: false,
        doubleFire: false,
        alive: true
      },
      {
        id: 3,
        isHuman: false,
        name: 'GOLD TANK (AI)',
        color: '#ffb700',
        x: 140,
        y: CANVAS_HEIGHT - 140,
        angle: -Math.PI / 2,
        hp: 100,
        maxHp: 100,
        speed: 2.3,
        respawnTimer: 0,
        cooldown: 0,
        shield: false,
        doubleFire: false,
        alive: true
      }
    ];

    stateRef.current = {
      tanks,
      bullets: [],
      particles: [],
      powerups: [],
      treadMarks: [],
      walls,
      bases,
      matchStart: Date.now()
    };

    keysRef.current = {};
    setKillFeed(['Match Initiated: 4-Core Base Defense']);
    setGameState('playing');
    setWinner(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      keysRef.current[e.code] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', ' '].includes(k)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = false;
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const spawnExplosion = (x, y, color, count = 18, isShockwave = false) => {
      for (let i = 0; i < count; i++) {
        const speed = Math.random() * 4.5 + 1.2;
        const angle = Math.random() * Math.PI * 2;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size: Math.random() * 4.5 + 2,
          life: 1.0,
          decay: Math.random() * 0.035 + 0.02
        });
      }
      if (isShockwave) {
        stateRef.current.particles.push({
          x,
          y,
          isRing: true,
          radius: 4,
          maxRadius: 40,
          color,
          life: 1.0,
          decay: 0.05
        });
      }
    };

    const isCollidingWithWalls = (x, y, size) => {
      const half = size / 2 - 2;
      for (const w of stateRef.current.walls) {
        if (x + half > w.x && x - half < w.x + w.w && y + half > w.y && y - half < w.y + w.h) {
          return true;
        }
      }
      return false;
    };

    let powerUpTimer = 0;

    const update = () => {
      const state = stateRef.current;
      const keys = keysRef.current;

      setMatchTime(Math.floor((Date.now() - state.matchStart) / 1000));

      // Periodic Power-Up Spawn
      powerUpTimer += 1 / 60;
      if (powerUpTimer > 14) {
        spawnPowerUp();
        powerUpTimer = 0;
      }

      // 1. Tanks
      state.tanks.forEach(tank => {
        const base = state.bases[tank.id];

        if (!tank.alive) {
          if (base.active) {
            tank.respawnTimer -= 1 / 60;
            if (tank.respawnTimer <= 0) {
              tank.alive = true;
              tank.hp = tank.maxHp;
              tank.x = base.x + (tank.id === 0 || tank.id === 3 ? 75 : -75);
              tank.y = base.y + (tank.id === 0 || tank.id === 2 ? 75 : -75);
              spawnExplosion(tank.x, tank.y, tank.color, 16, true);
              addFeed(`⚡ ${tank.name} respawned.`);
            }
          }
          return;
        }

        if (tank.cooldown > 0) tank.cooldown--;

        if (tank.isHuman) {
          let moveX = 0;
          let moveY = 0;

          if (keys['w'] || keys['arrowup'] || keys['KeyW']) moveY -= 1;
          if (keys['s'] || keys['arrowdown'] || keys['KeyS']) moveY += 1;
          if (keys['a'] || keys['arrowleft'] || keys['KeyA']) moveX -= 1;
          if (keys['d'] || keys['arrowright'] || keys['KeyD']) moveX += 1;

          if (moveX !== 0 || moveY !== 0) {
            tank.angle = Math.atan2(moveY, moveX);
            const currentSpeed = tank.speed * (tank.speedBoost ? 1.4 : 1);
            const nextX = tank.x + Math.cos(tank.angle) * currentSpeed;
            const nextY = tank.y + Math.sin(tank.angle) * currentSpeed;

            if (nextX > 25 && nextX < CANVAS_WIDTH - 25 && !isCollidingWithWalls(nextX, tank.y, TANK_SIZE)) {
              tank.x = nextX;
            }
            if (nextY > 25 && nextY < CANVAS_HEIGHT - 25 && !isCollidingWithWalls(tank.x, nextY, TANK_SIZE)) {
              tank.y = nextY;
            }

            // Tread marks
            if (Math.random() < 0.2) {
              state.treadMarks.push({ x: tank.x, y: tank.y, angle: tank.angle, life: 1.0 });
            }
          }

          // Fire
          if ((keys[' '] || keys['space'] || keys['Space']) && tank.cooldown === 0) {
            const createBullet = (angleOffset = 0) => ({
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle + angleOffset) * 22,
              y: tank.y + Math.sin(tank.angle + angleOffset) * 22,
              vx: Math.cos(tank.angle + angleOffset) * 8.2,
              vy: Math.sin(tank.angle + angleOffset) * 8.2,
              color: tank.color,
              bounces: 1
            });

            state.bullets.push(createBullet(0));
            if (tank.doubleFire) {
              state.bullets.push(createBullet(0.18));
              state.bullets.push(createBullet(-0.18));
            }

            spawnExplosion(tank.x + Math.cos(tank.angle) * 22, tank.y + Math.sin(tank.angle) * 22, '#fff', 4);
            tank.cooldown = 14;
          }
        } else {
          // AI Behavior
          const target = state.tanks[0].alive ? state.tanks[0] : state.bases[0];
          const angleToTarget = Math.atan2(target.y - tank.y, target.x - tank.x);
          tank.angle = angleToTarget + (Math.sin(Date.now() * 0.003 + tank.id) * 0.25);

          const nextX = tank.x + Math.cos(tank.angle) * tank.speed;
          const nextY = tank.y + Math.sin(tank.angle) * tank.speed;

          if (nextX > 30 && nextX < CANVAS_WIDTH - 30 && !isCollidingWithWalls(nextX, tank.y, TANK_SIZE)) {
            tank.x = nextX;
          }
          if (nextY > 30 && nextY < CANVAS_HEIGHT - 30 && !isCollidingWithWalls(tank.x, nextY, TANK_SIZE)) {
            tank.y = nextY;
          }

          if (tank.cooldown === 0 && Math.random() < 0.028) {
            state.bullets.push({
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * 22,
              y: tank.y + Math.sin(tank.angle) * 22,
              vx: Math.cos(tank.angle) * 6.8,
              vy: Math.sin(tank.angle) * 6.8,
              color: tank.color,
              bounces: 1
            });
            tank.cooldown = 36;
          }
        }

        // Power-Up Collisions
        for (let i = state.powerups.length - 1; i >= 0; i--) {
          const pup = state.powerups[i];
          if (Math.hypot(tank.x - pup.x, tank.y - pup.y) < TANK_SIZE) {
            if (pup.type === 'shield') tank.shield = true;
            if (pup.type === 'speed') tank.speedBoost = true;
            if (pup.type === 'double') tank.doubleFire = true;
            spawnExplosion(pup.x, pup.y, '#00f0ff', 12, true);
            addFeed(`✨ ${tank.name} secured ${pup.type.toUpperCase()} buff!`);
            state.powerups.splice(i, 1);
          }
        }
      });

      // 2. Bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.x < 10 || b.x > CANVAS_WIDTH - 10) {
          b.vx *= -1;
          b.bounces--;
        }
        if (b.y < 10 || b.y > CANVAS_HEIGHT - 10) {
          b.vy *= -1;
          b.bounces--;
        }

        let destroyed = false;

        // Wall Damage
        for (let j = state.walls.length - 1; j >= 0; j--) {
          const w = state.walls[j];
          if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
            if (!w.isSteel) {
              w.hp -= 30;
              spawnExplosion(b.x, b.y, '#f97316', 6);
              if (w.hp <= 0) state.walls.splice(j, 1);
            }
            destroyed = true;
            break;
          }
        }

        // Base Statue Hit
        if (!destroyed) {
          for (const base of state.bases) {
            if (!base.active) continue;
            const dist = Math.hypot(b.x - base.x, b.y - base.y);
            if (dist < STATUE_SIZE && b.ownerId !== base.id) {
              base.statueHp -= 25;
              spawnExplosion(b.x, b.y, base.color, 12, true);
              destroyed = true;
              if (base.statueHp <= 0) {
                base.statueHp = 0;
                base.active = false;
                spawnExplosion(base.x, base.y, '#ff0055', 45, true);
                addFeed(`🚨 CRITICAL: ${base.name} DESTROYED!`);
              }
              break;
            }
          }
        }

        // Tank Hit
        if (!destroyed) {
          for (const tank of state.tanks) {
            if (!tank.alive) continue;
            const dist = Math.hypot(b.x - tank.x, b.y - tank.y);
            if (dist < TANK_SIZE / 1.5 && b.ownerId !== tank.id) {
              if (tank.shield) {
                tank.shield = false;
                spawnExplosion(tank.x, tank.y, '#00f0ff', 10, true);
              } else {
                tank.hp -= 35;
                spawnExplosion(b.x, b.y, tank.color, 10);
                if (tank.hp <= 0) {
                  tank.hp = 0;
                  tank.alive = false;
                  tank.respawnTimer = 3.0;
                  spawnExplosion(tank.x, tank.y, '#ff0055', 28, true);
                  addFeed(`💀 ${tank.name} was eliminated.`);
                }
              }
              destroyed = true;
              break;
            }
          }
        }

        if (destroyed || b.bounces < 0) {
          state.bullets.splice(i, 1);
        }
      }

      // 3. Particles & Tread marks
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        if (p.isRing) {
          p.radius += 2.5;
          p.life -= p.decay;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
        }
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      for (let i = state.treadMarks.length - 1; i >= 0; i--) {
        state.treadMarks[i].life -= 0.005;
        if (state.treadMarks[i].life <= 0) state.treadMarks.splice(i, 1);
      }

      // Check Victory Condition
      const activeBases = state.bases.filter(b => b.active);
      if (activeBases.length <= 1) {
        setWinner(activeBases[0] ? activeBases[0].name : 'Draw');
        setGameState('gameover');
      }
    };

    const draw = () => {
      ctx.fillStyle = '#050711';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const state = stateRef.current;

      // Draw Cyberpunk Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw Tread Marks
      state.treadMarks.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life * 0.2;
        ctx.fillStyle = '#94a3b8';
        ctx.translate(t.x, t.y);
        ctx.rotate(t.angle);
        ctx.fillRect(-10, -8, 4, 16);
        ctx.restore();
      });

      // Draw Bases (Glowing Holographic Cores)
      state.bases.forEach(base => {
        ctx.save();
        ctx.translate(base.x, base.y);

        if (base.active) {
          const pulse = Math.sin(Date.now() * 0.005) * 4;
          ctx.fillStyle = base.glow;
          ctx.beginPath();
          ctx.arc(0, 0, STATUE_SIZE + 8 + pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = base.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Rotating Core Crystal
          ctx.rotate(Date.now() * 0.001);
          ctx.fillStyle = base.color;
          ctx.shadowColor = base.color;
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(0, -STATUE_SIZE / 1.5);
          ctx.lineTo(STATUE_SIZE / 1.7, 0);
          ctx.lineTo(0, STATUE_SIZE / 1.5);
          ctx.lineTo(-STATUE_SIZE / 1.7, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(0, 0, STATUE_SIZE, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Power-ups
      state.powerups.forEach(pup => {
        ctx.save();
        ctx.translate(pup.x, pup.y);
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pup.type === 'shield' ? '🛡️' : pup.type === 'speed' ? '⚡' : '🚀', 0, 0);
        ctx.restore();
      });

      // Draw Walls
      state.walls.forEach(w => {
        if (w.isSteel) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(w.x, w.y, w.w, w.h);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.strokeRect(w.x, w.y, w.w, w.h);
        } else {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(w.x, w.y, w.w, w.h);
          ctx.strokeStyle = '#d97706';
          ctx.strokeRect(w.x, w.y, w.w, w.h);
        }
      });

      // Draw Bullets
      state.bullets.forEach(b => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Tanks
      state.tanks.forEach(tank => {
        if (!tank.alive) return;

        ctx.save();
        ctx.translate(tank.x, tank.y);
        ctx.rotate(tank.angle);

        // Body with Outer Glow
        ctx.fillStyle = tank.color;
        ctx.shadowColor = tank.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, TANK_SIZE);

        // Tread Wheels
        ctx.fillStyle = '#020617';
        ctx.fillRect(-TANK_SIZE / 2 - 3, -TANK_SIZE / 2 - 4, TANK_SIZE + 6, 5);
        ctx.fillRect(-TANK_SIZE / 2 - 3, TANK_SIZE / 2 - 1, TANK_SIZE + 6, 5);

        // Barrel
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -3, 22, 6);

        // Turret Cap
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Shield Bubble
        if (tank.shield) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, TANK_SIZE + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Draw Particles & Rings
      state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        if (p.isRing) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    };

    const loop = () => {
      update();
      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameState]);

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 70px)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#f8fafc' }}>
      
      {/* 4-Corner Top Glassmorphism HUD */}
      {gameState === 'playing' && (
        <div style={{ width: '100%', maxWidth: '920px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {stateRef.current.bases.map((base, idx) => {
            const tank = stateRef.current.tanks[idx];
            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(15, 23, 42, 0.75)', 
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${base.active ? base.color : '#334155'}`, 
                  borderRadius: '16px', 
                  padding: '10px 14px',
                  boxShadow: base.active ? `0 0 20px ${base.glow}` : 'none',
                  opacity: base.active ? 1 : 0.45,
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: base.color, letterSpacing: '1px' }}>{base.name}</span>
                  <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', background: base.active ? `${base.color}20` : '#ef444420', color: base.active ? base.color : '#ef4444' }}>
                    {base.active ? 'ONLINE' : 'DESTROYED'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                  <span>CORE HP</span>
                  <strong style={{ color: base.color }}>{base.statueHp}</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#020617', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ width: `${(base.statueHp / base.maxStatueHp) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${base.color}, #fff)`, transition: 'width 0.15s' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                  <span>TANK UNIT</span>
                  <span>{tank && tank.alive ? `${tank.hp}%` : 'RESPAWNING'}</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#020617', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${tank && tank.alive ? (tank.hp / tank.maxHp) * 100 : 0}%`, height: '100%', background: '#f8fafc' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Canvas Frame */}
      <div style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, borderRadius: '22px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'block' }} />

        {/* Live Minimap & Feed Overlay */}
        {gameState === 'playing' && (
          <>
            {/* Top Bar Match Info */}
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(7, 11, 20, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 18px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'flex', gap: '14px', alignItems: 'center', letterSpacing: '1px' }}>
              <span style={{ color: '#00f0ff' }}>⏱️ {Math.floor(matchTime / 60)}:{(matchTime % 60).toString().padStart(2, '0')}</span>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#f8fafc' }}>ARENA PROTOCOL: 4-BASE ELIMINATION</span>
            </div>

            {/* KillFeed / Event Box */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }}>
              {killFeed.map((feed, i) => (
                <div key={i} style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', borderLeft: '3px solid #00f0ff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                  {feed}
                </div>
              ))}
            </div>

            {/* Minimap Radar */}
            <div style={{ position: 'absolute', bottom: 16, right: 16, width: '110px', height: '75px', background: 'rgba(2, 6, 23, 0.85)', border: '1px solid rgba(0, 240, 255, 0.4)', borderRadius: '8px', overflow: 'hidden', padding: '4px' }}>
              <div style={{ fontSize: '8px', fontWeight: '900', color: '#00f0ff', textAlign: 'center', marginBottom: '2px' }}>RADAR</div>
              <div style={{ position: 'relative', width: '100%', height: '55px', background: 'rgba(0, 240, 255, 0.05)' }}>
                {stateRef.current.bases.map(b => b.active && (
                  <div key={b.id} style={{ position: 'absolute', left: `${(b.x / CANVAS_WIDTH) * 100}%`, top: `${(b.y / CANVAS_HEIGHT) * 100}%`, width: '5px', height: '5px', borderRadius: '50%', background: b.color, transform: 'translate(-50%, -50%)' }} />
                ))}
                {stateRef.current.tanks.map(t => t.alive && (
                  <div key={t.id} style={{ position: 'absolute', left: `${(t.x / CANVAS_WIDTH) * 100}%`, top: `${(t.y / CANVAS_HEIGHT) * 100}%`, width: '4px', height: '4px', background: '#fff', transform: 'translate(-50%, -50%)' }} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Lobby Overlay */}
        {gameState === 'lobby' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 7, 17, 0.88)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', maxWidth: '440px', padding: '24px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg, #00f0ff, #0072ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(0, 240, 255, 0.5)' }}>
                🛡️
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', marginBottom: '8px', letterSpacing: '1px' }}>TANK ARENA: CYBER CORE</h1>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
                Defend your Base Core crystal from 3 AI tanks. Collect power-ups and destroy enemy cores to claim victory.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  style={{ padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #00f0ff, #0072ff)', color: '#020617', fontSize: '15px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0, 240, 255, 0.4)', letterSpacing: '1px' }}
                >
                  🚀 INITIATE COMBAT PROTOCOL
                </motion.button>

                <button
                  onClick={onBackToHub}
                  style={{ padding: '11px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                >
                  ← Return to Game Hub
                </button>
              </div>

              <div style={{ marginTop: '24px', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <span>🎮 <strong>WASD / Arrows:</strong> Drive</span>
                <span>•</span>
                <span>🔥 <strong>Space:</strong> Fire Cannons</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 7, 17, 0.92)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏆</div>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#00f0ff', marginBottom: '6px', letterSpacing: '1px' }}>{winner} VICTORY!</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>All opposing Base Cores have been eradicated.</p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={startGame}
                  style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #00f0ff, #0072ff)', color: '#020617', fontSize: '14px', fontWeight: '900', cursor: 'pointer' }}
                >
                  Battle Again
                </button>
                <button
                  onClick={onBackToHub}
                  style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}
                >
                  Game Hub
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}