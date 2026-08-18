import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const TANK_SIZE = 28;
const STATUE_SIZE = 34;

const INITIAL_BASES = [
  { id: 0, color: '#38bdf8', name: 'Blue Base', x: 60, y: 60, statueHp: 500, maxStatueHp: 500, active: true },
  { id: 1, color: '#ef4444', name: 'Red Base', x: CANVAS_WIDTH - 60, y: CANVAS_HEIGHT - 60, statueHp: 500, maxStatueHp: 500, active: true },
  { id: 2, color: '#10b981', name: 'Green Base', x: CANVAS_WIDTH - 60, y: 60, statueHp: 500, maxStatueHp: 500, active: true },
  { id: 3, color: '#f59e0b', name: 'Yellow Base', x: 60, y: CANVAS_HEIGHT - 60, statueHp: 500, maxStatueHp: 500, active: true }
];

export default function TankGame({ onBackToHub }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('lobby');
  const [winner, setWinner] = useState(null);

  const keysRef = useRef({});
  const gameLoopRef = useRef(null);

  const stateRef = useRef({
    tanks: [],
    bullets: [],
    particles: [],
    walls: [],
    bases: []
  });

  const initMap = () => {
    const walls = [];
    // Destructible brick walls (Bases වලට ඈතින් මැද කොටසේ පමණක් පිහිටුවා ඇත)
    const brickGrid = [
      { x: 260, y: 140, w: 20, h: 120 },
      { x: CANVAS_WIDTH - 280, y: 140, w: 20, h: 120 },
      { x: 260, y: CANVAS_HEIGHT - 260, w: 20, h: 120 },
      { x: CANVAS_WIDTH - 280, y: CANVAS_HEIGHT - 260, w: 20, h: 120 },
      { x: 340, y: 220, w: 220, h: 20 },
      { x: 340, y: 360, w: 220, h: 20 }
    ];

    brickGrid.forEach(b => {
      walls.push({ ...b, hp: 80, maxHp: 80, isSteel: false });
    });

    // Steel boundary blocks
    const steelBlocks = [
      { x: 440, y: 270, w: 20, h: 60 }
    ];

    steelBlocks.forEach(s => {
      walls.push({ ...s, hp: 9999, maxHp: 9999, isSteel: true });
    });

    return walls;
  };

  const startGame = () => {
    const bases = JSON.parse(JSON.stringify(INITIAL_BASES));
    const walls = initMap();

    // Spawning tanks in completely open areas away from walls
    const tanks = [
      {
        id: 0,
        isHuman: true,
        name: 'Player 1',
        color: '#38bdf8',
        x: 140,
        y: 140,
        angle: 0,
        hp: 100,
        maxHp: 100,
        speed: 3.5,
        respawnTimer: 0,
        cooldown: 0,
        alive: true
      },
      {
        id: 1,
        isHuman: false,
        name: 'Red AI',
        color: '#ef4444',
        x: CANVAS_WIDTH - 140,
        y: CANVAS_HEIGHT - 140,
        angle: Math.PI,
        hp: 100,
        maxHp: 100,
        speed: 2.2,
        respawnTimer: 0,
        cooldown: 0,
        alive: true
      },
      {
        id: 2,
        isHuman: false,
        name: 'Green AI',
        color: '#10b981',
        x: CANVAS_WIDTH - 140,
        y: 140,
        angle: Math.PI / 2,
        hp: 100,
        maxHp: 100,
        speed: 2.2,
        respawnTimer: 0,
        cooldown: 0,
        alive: true
      },
      {
        id: 3,
        isHuman: false,
        name: 'Yellow AI',
        color: '#f59e0b',
        x: 140,
        y: CANVAS_HEIGHT - 140,
        angle: -Math.PI / 2,
        hp: 100,
        maxHp: 100,
        speed: 2.2,
        respawnTimer: 0,
        cooldown: 0,
        alive: true
      }
    ];

    stateRef.current = {
      tanks,
      bullets: [],
      particles: [],
      walls,
      bases
    };

    keysRef.current = {};
    setGameState('playing');
    setWinner(null);
  };

  // Keyboard Event Handlers with e.key and preventDefault
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      keysRef.current[e.code] = true;

      // Arrow keys / Space නිසා පිටුව Scroll වීම වැළැක්වීම
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

  // Main Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const spawnExplosion = (x, y, color, count = 14) => {
      for (let i = 0; i < count; i++) {
        const speed = Math.random() * 4 + 1;
        const angle = Math.random() * Math.PI * 2;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size: Math.random() * 4 + 2,
          life: 1.0,
          decay: Math.random() * 0.04 + 0.02
        });
      }
    };

    const isCollidingWithWalls = (x, y, size) => {
      const half = size / 2 - 2; // slight padding for smooth sliding
      for (const w of stateRef.current.walls) {
        if (
          x + half > w.x &&
          x - half < w.x + w.w &&
          y + half > w.y &&
          y - half < w.y + w.h
        ) {
          return true;
        }
      }
      return false;
    };

    const update = () => {
      const state = stateRef.current;
      const keys = keysRef.current;

      // 1. Tanks Movement
      state.tanks.forEach(tank => {
        const base = state.bases[tank.id];

        if (!tank.alive) {
          if (base.active) {
            tank.respawnTimer -= 1 / 60;
            if (tank.respawnTimer <= 0) {
              tank.alive = true;
              tank.hp = tank.maxHp;
              tank.x = base.x + (tank.id === 0 || tank.id === 3 ? 70 : -70);
              tank.y = base.y + (tank.id === 0 || tank.id === 2 ? 70 : -70);
              spawnExplosion(tank.x, tank.y, tank.color, 12);
            }
          }
          return;
        }

        if (tank.cooldown > 0) tank.cooldown--;

        if (tank.isHuman) {
          let moveX = 0;
          let moveY = 0;

          if (keys['w'] || keys['arrowup'] || keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
          if (keys['s'] || keys['arrowdown'] || keys['KeyS'] || keys['ArrowDown']) moveY += 1;
          if (keys['a'] || keys['arrowleft'] || keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
          if (keys['d'] || keys['arrowright'] || keys['KeyD'] || keys['ArrowRight']) moveX += 1;

          if (moveX !== 0 || moveY !== 0) {
            tank.angle = Math.atan2(moveY, moveX);
            const nextX = tank.x + Math.cos(tank.angle) * tank.speed;
            const nextY = tank.y + Math.sin(tank.angle) * tank.speed;

            // X Axis move check
            if (nextX > 25 && nextX < CANVAS_WIDTH - 25 && !isCollidingWithWalls(nextX, tank.y, TANK_SIZE)) {
              tank.x = nextX;
            }
            // Y Axis move check
            if (nextY > 25 && nextY < CANVAS_HEIGHT - 25 && !isCollidingWithWalls(tank.x, nextY, TANK_SIZE)) {
              tank.y = nextY;
            }
          }

          // Fire
          if ((keys[' '] || keys['space'] || keys['Space']) && tank.cooldown === 0) {
            state.bullets.push({
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * 22,
              y: tank.y + Math.sin(tank.angle) * 22,
              vx: Math.cos(tank.angle) * 7.5,
              vy: Math.sin(tank.angle) * 7.5,
              color: tank.color,
              bounces: 1
            });
            tank.cooldown = 16;
          }
        } else {
          // AI Logic
          const target = state.tanks[0].alive ? state.tanks[0] : state.bases[0];
          const angleToTarget = Math.atan2(target.y - tank.y, target.x - tank.x);
          tank.angle = angleToTarget + (Math.sin(Date.now() * 0.003 + tank.id) * 0.3);

          const nextX = tank.x + Math.cos(tank.angle) * tank.speed;
          const nextY = tank.y + Math.sin(tank.angle) * tank.speed;

          if (nextX > 30 && nextX < CANVAS_WIDTH - 30 && !isCollidingWithWalls(nextX, tank.y, TANK_SIZE)) {
            tank.x = nextX;
          }
          if (nextY > 30 && nextY < CANVAS_HEIGHT - 30 && !isCollidingWithWalls(tank.x, nextY, TANK_SIZE)) {
            tank.y = nextY;
          }

          if (tank.cooldown === 0 && Math.random() < 0.03) {
            state.bullets.push({
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * 22,
              y: tank.y + Math.sin(tank.angle) * 22,
              vx: Math.cos(tank.angle) * 6,
              vy: Math.sin(tank.angle) * 6,
              color: tank.color,
              bounces: 1
            });
            tank.cooldown = 40;
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

        // Walls Collision
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

        // Base Statue Collision
        if (!destroyed) {
          for (const base of state.bases) {
            if (!base.active) continue;
            const dist = Math.hypot(b.x - base.x, b.y - base.y);
            if (dist < STATUE_SIZE && b.ownerId !== base.id) {
              base.statueHp -= 25;
              spawnExplosion(b.x, b.y, base.color, 10);
              destroyed = true;
              if (base.statueHp <= 0) {
                base.statueHp = 0;
                base.active = false;
                spawnExplosion(base.x, base.y, '#f43f5e', 40);
              }
              break;
            }
          }
        }

        // Tank Collision
        if (!destroyed) {
          for (const tank of state.tanks) {
            if (!tank.alive) continue;
            const dist = Math.hypot(b.x - tank.x, b.y - tank.y);
            if (dist < TANK_SIZE / 1.5 && b.ownerId !== tank.id) {
              tank.hp -= 35;
              spawnExplosion(b.x, b.y, tank.color, 10);
              destroyed = true;
              if (tank.hp <= 0) {
                tank.hp = 0;
                tank.alive = false;
                tank.respawnTimer = 3.0;
                spawnExplosion(tank.x, tank.y, '#ef4444', 25);
              }
              break;
            }
          }
        }

        if (destroyed || b.bounces < 0) {
          state.bullets.splice(i, 1);
        }
      }

      // 3. Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      // Check Victory
      const activeBases = state.bases.filter(b => b.active);
      if (activeBases.length <= 1) {
        setWinner(activeBases[0] ? activeBases[0].name : 'Draw');
        setGameState('gameover');
      }
    };

    const draw = () => {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const state = stateRef.current;

      // Draw Grid Lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw Bases
      state.bases.forEach(base => {
        ctx.save();
        ctx.translate(base.x, base.y);
        ctx.fillStyle = base.active ? `${base.color}22` : 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.arc(0, 0, STATUE_SIZE + 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = base.active ? base.color : '#475569';
        ctx.shadowColor = base.active ? base.color : 'transparent';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -STATUE_SIZE / 1.6);
        ctx.lineTo(STATUE_SIZE / 1.8, 0);
        ctx.lineTo(0, STATUE_SIZE / 1.6);
        ctx.lineTo(-STATUE_SIZE / 1.8, 0);
        ctx.closePath();
        ctx.fill();

        if (base.active) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-24, -30, 48, 6);
          ctx.fillStyle = base.color;
          ctx.fillRect(-24, -30, (base.statueHp / base.maxStatueHp) * 48, 6);
        }
        ctx.restore();
      });

      // Draw Walls
      state.walls.forEach(w => {
        if (w.isSteel) {
          ctx.fillStyle = '#475569';
          ctx.fillRect(w.x, w.y, w.w, w.h);
        } else {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(w.x, w.y, w.w, w.h);
          ctx.strokeStyle = '#d97706';
          ctx.strokeRect(w.x, w.y, w.w, w.h);
        }
      });

      // Draw Particles
      state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Bullets
      state.bullets.forEach(b => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Tanks
      state.tanks.forEach(tank => {
        if (!tank.alive) return;

        ctx.save();
        ctx.translate(tank.x, tank.y);
        ctx.rotate(tank.angle);

        // Body
        ctx.fillStyle = tank.color;
        ctx.shadowColor = tank.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, TANK_SIZE);

        // Treads
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-TANK_SIZE / 2 - 2, -TANK_SIZE / 2 - 4, TANK_SIZE + 4, 5);
        ctx.fillRect(-TANK_SIZE / 2 - 2, TANK_SIZE / 2 - 1, TANK_SIZE + 4, 5);

        // Barrel
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, -3, 20, 6);

        // Center Cap
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Tank HP Bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(tank.x - 16, tank.y - 24, 32, 4);
        ctx.fillStyle = tank.color;
        ctx.fillRect(tank.x - 16, tank.y - 24, (tank.hp / tank.maxHp) * 32, 4);
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
    <div style={{ width: '100%', minHeight: 'calc(100vh - 70px)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* HUD Cards */}
      {gameState === 'playing' && (
        <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
          {stateRef.current.bases.map((base, idx) => {
            const tank = stateRef.current.tanks[idx];
            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(15, 23, 42, 0.85)', 
                  border: `1px solid ${base.active ? base.color : '#334155'}`, 
                  borderRadius: '12px', 
                  padding: '8px 12px',
                  opacity: base.active ? 1 : 0.4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: base.color }}>{base.name}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{base.active ? 'ACTIVE' : 'DESTROYED'}</span>
                </div>

                <div style={{ fontSize: '10px', color: '#64748b' }}>Statue: {base.statueHp} HP</div>
                <div style={{ width: '100%', height: '6px', background: '#020617', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ width: `${(base.statueHp / base.maxStatueHp) * 100}%`, height: '100%', background: base.color }} />
                </div>

                <div style={{ fontSize: '10px', color: '#64748b' }}>Tank: {tank && tank.alive ? `${tank.hp} HP` : 'RESPAWNING...'}</div>
                <div style={{ width: '100%', height: '4px', background: '#020617', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${tank && tank.alive ? (tank.hp / tank.maxHp) * 100 : 0}%`, height: '100%', background: '#f8fafc' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Canvas Box */}
      <div style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.25)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'block' }} />

        {/* Lobby Overlay */}
        {gameState === 'lobby' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 11, 20, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
              <div style={{ fontSize: '38px', marginBottom: '10px' }}>🛡️⚡</div>
              <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', marginBottom: '8px' }}>TANK ARENA: BASE DEFENSE</h1>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>
                Drive your tank with <strong>WASD / Arrow Keys</strong> and Shoot with <strong>Space</strong>. Defend your base core from 3 AI tanks!
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  style={{ padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 25px rgba(2, 132, 199, 0.4)' }}
                >
                  🚀 Start Game (Single Player)
                </motion.button>

                <button
                  onClick={onBackToHub}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                >
                  ← Back to Game Hub
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 11, 20, 0.92)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🏆</div>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#38bdf8', marginBottom: '6px' }}>{winner} VICTORY!</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>All opposing bases have been destroyed.</p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={startGame}
                  style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Play Again
                </button>
                <button
                  onClick={onBackToHub}
                  style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}
                >
                  Main Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}