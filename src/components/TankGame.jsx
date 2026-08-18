import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

export default function TankGame({ socket, onBackToHub }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('lobby'); // 'lobby' | 'playing' | 'gameover'
  const [gameMode, setGameMode] = useState('single'); // 'single' | 'multi'
  const [roomId, setRoomId] = useState('');
  const [mySlot, setMySlot] = useState(0);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [winner, setWinner] = useState(null);
  const [matchTime, setMatchTime] = useState(0);
  const [killFeed, setKillFeed] = useState([]);

  const keysRef = useRef({});
  const gameLoopRef = useRef(null);
  const mySlotRef = useRef(0);
  const gameModeRef = useRef('single');
  const roomIdRef = useRef('');

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

  const addFeed = (text) => {
    setKillFeed(prev => [text, ...prev].slice(0, 4));
  };

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

  // Setup initial tanks configuration
  const buildInitialTanks = (mode, localSlot = 0) => {
    return [
      {
        id: 0,
        isHuman: mode === 'single' ? true : localSlot === 0,
        name: 'BLUE UNIT',
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
        isHuman: mode === 'single' ? false : localSlot === 1,
        name: 'RED UNIT',
        color: '#ff0055',
        x: CANVAS_WIDTH - 140,
        y: CANVAS_HEIGHT - 140,
        angle: Math.PI,
        hp: 100,
        maxHp: 100,
        speed: 2.4,
        respawnTimer: 0,
        cooldown: 0,
        shield: false,
        doubleFire: false,
        alive: true
      },
      {
        id: 2,
        isHuman: mode === 'single' ? false : localSlot === 2,
        name: 'GREEN UNIT',
        color: '#00ff88',
        x: CANVAS_WIDTH - 140,
        y: 140,
        angle: Math.PI / 2,
        hp: 100,
        maxHp: 100,
        speed: 2.4,
        respawnTimer: 0,
        cooldown: 0,
        shield: false,
        doubleFire: false,
        alive: true
      },
      {
        id: 3,
        isHuman: mode === 'single' ? false : localSlot === 3,
        name: 'GOLD UNIT',
        color: '#ffb700',
        x: 140,
        y: CANVAS_HEIGHT - 140,
        angle: -Math.PI / 2,
        hp: 100,
        maxHp: 100,
        speed: 2.4,
        respawnTimer: 0,
        cooldown: 0,
        shield: false,
        doubleFire: false,
        alive: true
      }
    ];
  };

  // Socket Multi-player Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('tank_player_assigned', ({ slot, unitName, roomId }) => {
      setMySlot(slot);
      mySlotRef.current = slot;
      setRoomId(roomId);
      roomIdRef.current = roomId;
      gameModeRef.current = 'multi';
      setGameMode('multi');

      startMatch('multi', slot);
      addFeed(`🎮 Assigned to ${unitName}. Multi-Arena Live!`);
    });

    socket.on('tank_room_update', (room) => {
      setConnectedPlayers(room.players);
    });

    socket.on('tank_state_updated', ({ tankData }) => {
      const state = stateRef.current;
      if (!state.tanks[tankData.id]) return;

      const remoteTank = state.tanks[tankData.id];
      if (tankData.id !== mySlotRef.current) {
        remoteTank.x = tankData.x;
        remoteTank.y = tankData.y;
        remoteTank.angle = tankData.angle;
        remoteTank.hp = tankData.hp;
        remoteTank.alive = tankData.alive;
        remoteTank.shield = tankData.shield;
      }
    });

    socket.on('bullet_spawned', (bullet) => {
      stateRef.current.bullets.push(bullet);
    });

    socket.on('core_damaged', ({ baseId, newHp, isDestroyed }) => {
      const state = stateRef.current;
      if (state.bases[baseId]) {
        state.bases[baseId].statueHp = newHp;
        if (isDestroyed) {
          state.bases[baseId].active = false;
          addFeed(`🚨 CRITICAL: ${state.bases[baseId].name} DESTROYED!`);
        }
      }
    });

    socket.on('tank_room_full', () => {
      alert('This Tank Arena room is full (Max 4 Players). Please join another room.');
    });

    return () => {
      socket.off('tank_player_assigned');
      socket.off('tank_room_update');
      socket.off('tank_state_updated');
      socket.off('bullet_spawned');
      socket.off('core_damaged');
      socket.off('tank_room_full');
    };
  }, [socket]);

  const startMatch = (mode, slot = 0) => {
    stateRef.current = {
      tanks: buildInitialTanks(mode, slot),
      bullets: [],
      particles: [],
      powerups: [],
      treadMarks: [],
      walls: initMap(),
      bases: JSON.parse(JSON.stringify(INITIAL_BASES)),
      matchStart: Date.now()
    };

    keysRef.current = {};
    setGameState('playing');
    setWinner(null);
  };

  const handleStartSinglePlayer = () => {
    gameModeRef.current = 'single';
    setGameMode('single');
    mySlotRef.current = 0;
    setMySlot(0);
    startMatch('single', 0);
    addFeed('Single Player Mode: Defend against 3 AI Cores');
  };

  const handleJoinMultiplayerRoom = (e) => {
    e.preventDefault();
    if (!roomId.trim() || !socket) return;
    socket.emit('join_tank_room', {
      roomId: roomId.trim(),
      playerName: `Player_${Math.floor(Math.random() * 900 + 100)}`
    });
  };

  // Controls Listener
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

  // Main 60 FPS Loop
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

    let syncTick = 0;

    const update = () => {
      const state = stateRef.current;
      const keys = keysRef.current;
      const currentMode = gameModeRef.current;
      const currentSlot = mySlotRef.current;

      setMatchTime(Math.floor((Date.now() - state.matchStart) / 1000));

      // 1. Tanks Update
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

        // Human Control
        if (tank.isHuman && tank.id === currentSlot) {
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

            if (Math.random() < 0.2) {
              state.treadMarks.push({ x: tank.x, y: tank.y, angle: tank.angle, life: 1.0 });
            }
          }

          // Fire
          if ((keys[' '] || keys['space'] || keys['Space']) && tank.cooldown === 0) {
            const bullet = {
              ownerId: tank.id,
              x: tank.x + Math.cos(tank.angle) * 22,
              y: tank.y + Math.sin(tank.angle) * 22,
              vx: Math.cos(tank.angle) * 8.2,
              vy: Math.sin(tank.angle) * 8.2,
              color: tank.color,
              bounces: 1
            };

            state.bullets.push(bullet);
            spawnExplosion(bullet.x, bullet.y, '#fff', 4);
            tank.cooldown = 14;

            if (currentMode === 'multi' && socket) {
              socket.emit('tank_fire_bullet', { roomId: roomIdRef.current, bulletData: bullet });
            }
          }
        } else if (currentMode === 'single' && !tank.isHuman) {
          // Single player AI
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
      });

      // Multiplayer State Sync (20 Ticks/sec)
      if (currentMode === 'multi' && socket) {
        syncTick++;
        if (syncTick % 3 === 0) {
          const myTank = state.tanks[currentSlot];
          if (myTank) {
            socket.emit('sync_tank_state', {
              roomId: roomIdRef.current,
              tankData: {
                id: myTank.id,
                x: myTank.x,
                y: myTank.y,
                angle: myTank.angle,
                hp: myTank.hp,
                alive: myTank.alive,
                shield: myTank.shield
              }
            });
          }
        }
      }

      // 2. Bullets & Collisions
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

              const isDestroyed = base.statueHp <= 0;
              if (isDestroyed) {
                base.statueHp = 0;
                base.active = false;
                spawnExplosion(base.x, base.y, '#ff0055', 45, true);
                addFeed(`🚨 CRITICAL: ${base.name} DESTROYED!`);
              }

              if (currentMode === 'multi' && socket && b.ownerId === currentSlot) {
                socket.emit('sync_core_damage', {
                  roomId: roomIdRef.current,
                  damageInfo: { baseId: base.id, newHp: base.statueHp, isDestroyed }
                });
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

      // 3. Particles
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

      // 4. Victory Check
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

      // Draw Grid
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

      // Draw Bases (Glowing Crystals)
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

        ctx.fillStyle = tank.color;
        ctx.shadowColor = tank.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, TANK_SIZE);

        ctx.fillStyle = '#020617';
        ctx.fillRect(-TANK_SIZE / 2 - 3, -TANK_SIZE / 2 - 4, TANK_SIZE + 6, 5);
        ctx.fillRect(-TANK_SIZE / 2 - 3, TANK_SIZE / 2 - 1, TANK_SIZE + 6, 5);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -3, 22, 6);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Particles
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
            const isMe = idx === mySlot;
            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'rgba(15, 23, 42, 0.75)', 
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${isMe ? '#fff' : base.active ? base.color : '#334155'}`, 
                  borderRadius: '16px', 
                  padding: '10px 14px',
                  boxShadow: base.active ? `0 0 20px ${base.glow}` : 'none',
                  opacity: base.active ? 1 : 0.45,
                  transform: isMe ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: base.color, letterSpacing: '1px' }}>
                    {base.name} {isMe ? '(YOU)' : ''}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', background: base.active ? `${base.color}20` : '#ef444420', color: base.active ? base.color : '#ef4444' }}>
                    {base.active ? 'ONLINE' : 'DESTROYED'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                  <span>CORE HP</span>
                  <strong style={{ color: base.color }}>{base.statueHp}</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#020617', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ width: `${(base.statueHp / base.maxStatueHp) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${base.color}, #fff)` }} />
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

      {/* Main Canvas Box */}
      <div style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, borderRadius: '22px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ display: 'block' }} />

        {gameState === 'playing' && (
          <>
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(7, 11, 20, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 18px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <span style={{ color: '#00f0ff' }}>⏱️ {Math.floor(matchTime / 60)}:{(matchTime % 60).toString().padStart(2, '0')}</span>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#f8fafc' }}>
                {gameMode === 'multi' ? `ONLINE 4P ARENA: ${roomId}` : 'SINGLE PLAYER vs 3 AI'}
              </span>
            </div>

            <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }}>
              {killFeed.map((feed, i) => (
                <div key={i} style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', borderLeft: '3px solid #00f0ff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                  {feed}
                </div>
              ))}
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
              <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', marginBottom: '8px' }}>TANK ARENA: CYBER CORE</h1>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
                4-Corner Base Defense Arena. Play Solo against 3 AI Cores or Challenge up to 4 Players Online!
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartSinglePlayer}
                  style={{ padding: '13px', borderRadius: '12px', border: '1px solid #00f0ff', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}
                >
                  🤖 Single Player vs 3 AI Tanks
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0', color: '#64748b', fontSize: '11px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }}></div>
                  <span style={{ padding: '0 10px' }}>OR 2 - 4 PLAYERS ONLINE ARENA</span>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }}></div>
                </div>

                <form onSubmit={handleJoinMultiplayerRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Enter Custom Room Code (e.g. TANK_WAR)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#020617', color: '#fff', fontSize: '13px', outline: 'none' }}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #00f0ff, #0072ff)', color: '#020617', fontSize: '14px', fontWeight: '900', cursor: 'pointer' }}
                  >
                    🌐 Enter 4-Player Battle Arena
                  </motion.button>
                </form>

                <button
                  onClick={onBackToHub}
                  style={{ padding: '9px', borderRadius: '10px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
                >
                  ← Return to Game Hub
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Game Over */}
        {gameState === 'gameover' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 7, 17, 0.92)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏆</div>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#00f0ff', marginBottom: '6px' }}>{winner} VICTORY!</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>All opposing Base Cores have been eradicated.</p>

              <button
                onClick={() => setGameState('lobby')}
                style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #00f0ff, #0072ff)', color: '#020617', fontSize: '14px', fontWeight: '900', cursor: 'pointer' }}
              >
                Back to Lobby
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}