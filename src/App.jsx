import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import HomeHub from './components/HomeHub';
import Board3D from './components/Board3D';
import HandTracker from './components/HandTracker';
import TankGame from './components/TankGame';
import { calculateValidMoves, calculateCapturesOnly, checkKingPromotion, getGameStats } from './utils/gameLogic';
import { getBestAiMove } from './utils/aiLogic';
import { sounds } from './utils/audio';

const socket = io('https://server-production-836b.up.railway.app', {
  transports: ['websocket', 'polling'],
  autoConnect: true
});

const createInitialBoard = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  let pieceIdCounter = 1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) {
          board[r][c] = { id: `white-${pieceIdCounter++}`, color: 'white', isKing: false };
        } else if (r > 4) {
          board[r][c] = { id: `red-${pieceIdCounter++}`, color: 'red', isKing: false };
        }
      }
    }
  }
  return board;
};

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [inLobby, setInLobby] = useState(true);
  const [gameMode, setGameMode] = useState('multi'); // 'multi' | 'ai'
  const [roomId, setRoomId] = useState('');
  const [myColor, setMyColor] = useState('red');

  const [boardState, setBoardState] = useState(createInitialBoard);
  const [currentTurn, setCurrentTurn] = useState('red');
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [moveLogs, setMoveLogs] = useState([]);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isPinching, setIsPinching] = useState(false);
  const [isMultiJumping, setIsMultiJumping] = useState(false);

  const stats = getGameStats(boardState);

  useEffect(() => {
    socket.on('player_assigned', ({ color, roomId }) => {
      setMyColor(color);
      setRoomId(roomId);
      setInLobby(false);
      setMoveLogs([`Match joined. Assigned to ${color.toUpperCase()} pieces.`]);
    });

    socket.on('opponent_moved', ({ newBoard, nextTurn, logMsg, isCapture, isKing }) => {
      setBoardState(newBoard);
      setCurrentTurn(nextTurn);
      setSelectedPiece(null);
      setValidMoves([]);
      setIsMultiJumping(false);

      if (isKing) sounds.playKing();
      else if (isCapture) sounds.playCapture();
      else sounds.playMove();

      if (logMsg) setMoveLogs(prev => [logMsg, ...prev].slice(0, 12));
    });

    socket.on('room_full', () => {
      alert('Room is already full! Please try a different room name.');
    });

    return () => {
      socket.off('player_assigned');
      socket.off('opponent_moved');
      socket.off('room_full');
    };
  }, []);

  // AI Logic Execution
  useEffect(() => {
    if (gameMode === 'ai' && !inLobby && currentTurn === 'white' && !stats.winner) {
      const timer = setTimeout(() => {
        executeAiTurn();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, gameMode, inLobby, boardState, stats.winner]);

  const executeAiTurn = () => {
    const aiMove = getBestAiMove(boardState, 'white');
    if (!aiMove) return;

    const newBoard = boardState.map(r => [...r]);
    const piece = { ...newBoard[aiMove.fromRow][aiMove.fromCol] };

    const wasKing = piece.isKing;
    piece.isKing = checkKingPromotion(piece, aiMove.toRow);

    newBoard[aiMove.toRow][aiMove.toCol] = piece;
    newBoard[aiMove.fromRow][aiMove.fromCol] = null;

    if (aiMove.isJump) {
      newBoard[aiMove.capturedRow][aiMove.capturedCol] = null;
    }

    const justBecameKing = !wasKing && piece.isKing;
    if (justBecameKing) sounds.playKing();
    else if (aiMove.isJump) sounds.playCapture();
    else sounds.playMove();

    let furtherCaptures = [];
    if (aiMove.isJump) {
      furtherCaptures = calculateCapturesOnly(newBoard, aiMove.toRow, aiMove.toCol);
    }

    if (furtherCaptures.length > 0) {
      const nextJump = furtherCaptures[0];
      const logMsg = `AI chained jump to (${aiMove.toRow},${aiMove.toCol}) ⚔️`;
      setBoardState(newBoard);
      setMoveLogs(prev => [logMsg, ...prev].slice(0, 12));

      setTimeout(() => {
        const chainBoard = newBoard.map(r => [...r]);
        const chainPiece = { ...chainBoard[aiMove.toRow][aiMove.toCol] };
        chainPiece.isKing = checkKingPromotion(chainPiece, nextJump.row);

        chainBoard[nextJump.row][nextJump.col] = chainPiece;
        chainBoard[aiMove.toRow][aiMove.toCol] = null;
        chainBoard[nextJump.capturedRow][nextJump.capturedCol] = null;

        sounds.playCapture();
        setBoardState(chainBoard);
        setCurrentTurn('red');
        setMoveLogs(prev => [`AI completed chain to (${nextJump.row},${nextJump.col}) ⚔️`, ...prev].slice(0, 12));
      }, 500);
    } else {
      const logMsg = `AI moved to (${aiMove.toRow},${aiMove.toCol}) ${aiMove.isJump ? '⚔️' : ''} ${justBecameKing ? '👑' : ''}`;
      setBoardState(newBoard);
      setCurrentTurn('red');
      setMoveLogs(prev => [logMsg, ...prev].slice(0, 12));
    }
  };

  const handleStartAiGame = () => {
    setGameMode('ai');
    setMyColor('red');
    setInLobby(false);
    setBoardState(createInitialBoard());
    setCurrentTurn('red');
    setMoveLogs(['Single Player Arena vs Grandmaster AI initiated.']);
  };

  const handleJoinOnlineRoom = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    setGameMode('multi');
    socket.emit('join_room', { roomId: roomId.trim(), playerName: 'Player' });
  };

  const handlePieceClick = (row, col) => {
    if (stats.winner || currentTurn !== myColor || isMultiJumping) return;
    const piece = boardState[row][col];
    if (piece && piece.color === myColor) {
      setSelectedPiece({ row, col });
      const moves = calculateValidMoves(boardState, row, col);
      setValidMoves(moves);
    }
  };

  const handleTileClick = (row, col) => {
    if (!selectedPiece || stats.winner || currentTurn !== myColor) return;

    const chosenMove = validMoves.find(m => m.row === row && m.col === col);
    if (chosenMove) {
      const newBoard = boardState.map(r => [...r]);
      const piece = { ...newBoard[selectedPiece.row][selectedPiece.col] };

      const wasKing = piece.isKing;
      piece.isKing = checkKingPromotion(piece, row);

      newBoard[row][col] = piece;
      newBoard[selectedPiece.row][selectedPiece.col] = null;

      const isCapture = chosenMove.isJump;
      if (isCapture) {
        newBoard[chosenMove.capturedRow][chosenMove.capturedCol] = null;
      }

      const justBecameKing = !wasKing && piece.isKing;
      if (justBecameKing) sounds.playKing();
      else if (isCapture) sounds.playCapture();
      else sounds.playMove();

      let furtherCaptures = [];
      if (isCapture) {
        furtherCaptures = calculateCapturesOnly(newBoard, row, col);
      }

      if (furtherCaptures.length > 0) {
        setBoardState(newBoard);
        setSelectedPiece({ row, col });
        setValidMoves(furtherCaptures);
        setIsMultiJumping(true);

        const partialLog = `${myColor.toUpperCase()} jumped to (${row},${col}) ⚔️ [Chain!]`;
        setMoveLogs(prev => [partialLog, ...prev].slice(0, 12));

        if (gameMode === 'multi') {
          socket.emit('make_move', {
            roomId,
            moveData: { newBoard, nextTurn: currentTurn, logMsg: partialLog, isCapture: true, isKing: justBecameKing }
          });
        }
      } else {
        const nextTurn = currentTurn === 'red' ? 'white' : 'red';
        const logMsg = `${myColor.toUpperCase()} moved to (${row},${col}) ${isCapture ? '⚔️' : ''} ${justBecameKing ? '👑' : ''}`;

        setBoardState(newBoard);
        setSelectedPiece(null);
        setValidMoves([]);
        setIsMultiJumping(false);
        setCurrentTurn(nextTurn);
        setMoveLogs(prev => [logMsg, ...prev].slice(0, 12));

        if (gameMode === 'multi') {
          socket.emit('make_move', {
            roomId,
            moveData: { newBoard, nextTurn, logMsg, isCapture, isKing: justBecameKing }
          });
        }
      }
    }
  };

  const isMyTurn = currentTurn === myColor;

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#050811', color: '#f8fafc', overflowX: 'hidden' }}>
      <Navbar onNavigate={setCurrentView} activeTab={currentView} />

      {/* 1. Home Hub */}
      {currentView === 'home' && (
        <HomeHub onSelectGame={(gameId) => {
          if (gameId === 'daam') setCurrentView('daam');
          if (gameId === 'tank') setCurrentView('tank');
        }} />
      )}

      {/* 2. Tank Arena 2D View */}
      {currentView === 'tank' && (
        <TankGame socket={socket} onBackToHub={() => setCurrentView('home')} />
      )}

      {/* 3. 3D Daam Arena View */}
      {currentView === 'daam' && (
        <>
          {/* Hand Tracker Gesture Cursor */}
          <div 
            style={{
              position: 'fixed',
              left: cursorPos.x - (isPinching ? 10 : 14),
              top: cursorPos.y - (isPinching ? 10 : 14),
              width: isPinching ? '20px' : '28px',
              height: isPinching ? '20px' : '28px',
              borderRadius: '50%',
              backgroundColor: isPinching ? '#10b981' : '#38bdf8',
              border: '2px solid #ffffff',
              boxShadow: isPinching ? '0 0 25px #10b981' : '0 0 20px rgba(56, 189, 248, 0.8)',
              pointerEvents: 'none',
              zIndex: 9999,
              transition: 'width 0.08s, height 0.08s, background-color 0.08s'
            }}
          />

          {inLobby ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '20px 16px' }}>
              <motion.div 
                initial={{ scale: 0.92, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(20px)',
                  padding: '36px 28px',
                  borderRadius: '28px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  width: '100%',
                  maxWidth: '420px',
                  textAlign: 'center',
                  boxShadow: '0 30px 60px rgba(0, 0, 0, 0.7)',
                  position: 'relative'
                }}
              >
                {/* Glow Orb */}
                <div style={{ position: 'absolute', top: '-10%', left: '30%', right: '30%', height: '40px', background: 'radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #0284c7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(56, 189, 248, 0.5)' }}>
                  ♟️
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: '6px' }}>3D Daam Arena</h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
                  Select your combat protocol to challenge the Grandmaster AI or battle online.
                </p>

                {/* Single Player Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartAiGame}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    letterSpacing: '0.5px'
                  }}
                >
                  🤖 Single Player (vs Grandmaster AI)
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                  <span style={{ padding: '0 12px' }}>OR ONLINE MULTIPLAYER</span>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                </div>

                {/* Multiplayer Form */}
                <form onSubmit={handleJoinOnlineRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Enter Custom Room ID (e.g. ARENA_99)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{
                      padding: '13px 16px',
                      borderRadius: '14px',
                      border: '1px solid #334155',
                      background: 'rgba(2, 6, 23, 0.8)',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                    }}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{
                      padding: '13px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 8px 25px rgba(2, 132, 199, 0.45)',
                      letterSpacing: '0.5px'
                    }}
                  >
                    🌐 Enter Online Match
                  </motion.button>
                </form>

                <button
                  onClick={() => setCurrentView('home')}
                  style={{ marginTop: '18px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'color 0.2s' }}
                >
                  ← Return to Game Hub
                </button>
              </motion.div>
            </div>
          ) : (
            <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 20px' }}>
              
              {/* Premium Esports Top HUD */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '12px 18px',
                marginBottom: '16px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
              }}>
                {/* Red Player Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 14px',
                  borderRadius: '14px',
                  background: currentTurn === 'red' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(2, 6, 23, 0.5)',
                  border: `1px solid ${currentTurn === 'red' ? '#ef4444' : 'transparent'}`,
                  boxShadow: currentTurn === 'red' ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 0 12px rgba(239,68,68,0.5)' }}>
                    🔴
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#f8fafc', letterSpacing: '0.5px' }}>
                      RED {myColor === 'red' ? '(YOU)' : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Pieces Remaining: <strong style={{ color: '#ef4444', fontSize: '12px' }}>{stats.redCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Match Status Center Pill */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 18px',
                    borderRadius: '24px',
                    fontSize: '11px',
                    fontWeight: '900',
                    letterSpacing: '1px',
                    background: isMultiJumping ? 'rgba(239, 68, 68, 0.25)' : isMyTurn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                    color: isMultiJumping ? '#f87171' : isMyTurn ? '#10b981' : '#eab308',
                    border: `1px solid ${isMultiJumping ? '#ef4444' : isMyTurn ? '#10b981' : '#eab308'}`,
                    boxShadow: isMyTurn ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isMultiJumping ? '#ef4444' : isMyTurn ? '#10b981' : '#eab308' }} />
                    {isMultiJumping ? '⚡ CHAIN CAPTURE AVAILABLE' : isMyTurn ? '⚡ YOUR TURN TO MOVE' : (gameMode === 'ai' ? '🤖 AI THINKING...' : '⏳ OPPONENT TURN')}
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
                    {gameMode === 'ai' ? 'SINGLE PLAYER ARENA' : `ROOM: ${roomId}`}
                  </div>
                </div>

                {/* White Player Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  padding: '8px 14px',
                  borderRadius: '14px',
                  background: currentTurn === 'white' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(2, 6, 23, 0.5)',
                  border: `1px solid ${currentTurn === 'white' ? '#f8fafc' : 'transparent'}`,
                  boxShadow: currentTurn === 'white' ? '0 0 15px rgba(255, 255, 255, 0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#f8fafc', letterSpacing: '0.5px' }}>
                      WHITE {gameMode === 'ai' ? '(AI BOT)' : (myColor === 'white' ? '(YOU)' : '')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Pieces Remaining: <strong style={{ color: '#f8fafc', fontSize: '12px' }}>{stats.whiteCount}</strong>
                    </div>
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 0 12px rgba(255,255,255,0.4)' }}>
                    {gameMode === 'ai' ? '🤖' : '⚪'}
                  </div>
                </div>
              </div>

              {/* Victory Screen Modal */}
              <AnimatePresence>
                {stats.winner && (
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      background: stats.winner.toLowerCase() === myColor ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #b91c1c, #ef4444)',
                      color: '#ffffff',
                      textAlign: 'center',
                      borderRadius: '16px',
                      fontWeight: '900',
                      fontSize: '18px',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                      letterSpacing: '0.5px'
                    }}
                  >
                    🏆 VICTORY! {stats.winner === (myColor ? myColor.charAt(0).toUpperCase() + myColor.slice(1) : '') ? 'YOU CONQUERED THE ARENA!' : (gameMode === 'ai' ? 'AI BOT WON THE MATCH!' : 'OPPONENT WON THE MATCH!')}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Board & Hand Tracker Area */}
              <div className="arena-grid">
                <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)' }}>
                  <Board3D 
                    boardState={boardState}
                    selectedPiece={selectedPiece}
                    validMoves={validMoves}
                    onPieceClick={handlePieceClick}
                    onTileClick={handleTileClick}
                    cursorPos={cursorPos}
                    isPinching={isPinching}
                  />
                </div>

                {/* Right Combat Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <HandTracker 
                    onCursorMove={setCursorPos}
                    onPinchStateChange={setIsPinching}
                  />

                  {/* Glassmorphism Live Combat Log */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '16px',
                    height: '210px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#38bdf8', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚡</span> ARENA COMBAT LOG
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {moveLogs.length === 0 ? (
                        <div style={{ color: '#475569', fontStyle: 'italic' }}>Awaiting initial combat deployment...</div>
                      ) : (
                        moveLogs.map((log, idx) => (
                          <div key={idx} style={{ padding: '5px 8px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}