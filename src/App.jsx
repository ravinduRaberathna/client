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

const socket = io('https://web-production-b7ad7.up.railway.app', {
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
  const [gameMode, setGameMode] = useState('multi');
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
  const isWinner = stats.winner && stats.winner.toLowerCase() === myColor.toLowerCase();
  const isGameOver = Boolean(stats.winner);

  useEffect(() => {
    socket.on('player_assigned', ({ color, roomId }) => {
      setMyColor(color);
      setRoomId(roomId);
      setInLobby(false);
      setMoveLogs([`Joined match as ${color.toUpperCase()}`]);
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

      if (logMsg) setMoveLogs(prev => [logMsg, ...prev].slice(0, 10));
    });

    socket.on('room_full', () => {
      alert('Room is full! Choose another room code.');
    });

    return () => {
      socket.off('player_assigned');
      socket.off('opponent_moved');
      socket.off('room_full');
    };
  }, []);

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
      const logMsg = `AI jumped to (${aiMove.toRow},${aiMove.toCol}) ⚔️`;
      setBoardState(newBoard);
      setMoveLogs(prev => [logMsg, ...prev].slice(0, 10));

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
        setMoveLogs(prev => [`AI chained jump to (${nextJump.row},${nextJump.col}) ⚔️`, ...prev].slice(0, 10));
      }, 500);
    } else {
      const logMsg = `AI moved to (${aiMove.toRow},${aiMove.toCol}) ${aiMove.isJump ? '⚔️' : ''} ${justBecameKing ? '👑' : ''}`;
      setBoardState(newBoard);
      setCurrentTurn('red');
      setMoveLogs(prev => [logMsg, ...prev].slice(0, 10));
    }
  };

  const handleStartAiGame = () => {
    setGameMode('ai');
    setMyColor('red');
    setInLobby(false);
    setBoardState(createInitialBoard());
    setCurrentTurn('red');
    setMoveLogs(['Single Player vs AI started.']);
  };

  const handleJoinOnlineRoom = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    setGameMode('multi');
    socket.emit('join_room', { roomId: roomId.trim(), playerName: 'Player' });
  };

  const handleResetGame = () => {
    setBoardState(createInitialBoard());
    setCurrentTurn('red');
    setSelectedPiece(null);
    setValidMoves([]);
    setIsMultiJumping(false);
    setMoveLogs(['New Arena Match Initiated.']);
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
        setMoveLogs(prev => [partialLog, ...prev].slice(0, 10));

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
        setMoveLogs(prev => [logMsg, ...prev].slice(0, 10));

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
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#070b14', color: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Navbar onNavigate={setCurrentView} activeTab={currentView} />

      {/* 1. Home View */}
      {currentView === 'home' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <HomeHub onSelectGame={(gameId) => {
            if (gameId === 'daam') setCurrentView('daam');
            if (gameId === 'tank') setCurrentView('tank');
          }} />
        </div>
      )}

      {/* 2. Tank Game View */}
      {currentView === 'tank' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TankGame socket={socket} onBackToHub={() => setCurrentView('home')} />
        </div>
      )}

      {/* 3. 3D Daam View */}
      {currentView === 'daam' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 12px 12px 12px', maxWidth: '1400px', width: '100%', margin: '0 auto', position: 'relative' }}>
          
          {/* Hand Tracker Cursor */}
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
              boxShadow: isPinching ? '0 0 25px #10b981' : '0 0 15px rgba(56, 189, 248, 0.8)',
              pointerEvents: 'none',
              zIndex: 9999,
              transition: 'width 0.08s, height 0.08s, background-color 0.08s'
            }}
          />

          {inLobby ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px' }}>
              <motion.div 
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(16px)',
                  padding: '24px 20px',
                  borderRadius: '18px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  width: '100%',
                  maxWidth: '360px',
                  textAlign: 'center',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.7)'
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284c7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', margin: '0 auto 10px' }}>
                  ♟️
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#f8fafc', marginBottom: '4px' }}>3D Daam Arena</h2>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '16px' }}>Choose your mode to battle online or vs AI</p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartAiGame}
                  style={{ width: '100%', padding: '11px', borderRadius: '12px', border: '1px solid #38bdf8', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '13px', fontWeight: '800', cursor: 'pointer', marginBottom: '12px' }}
                >
                  🤖 Single Player vs AI Bot
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', color: '#64748b', fontSize: '10px', fontWeight: '700' }}>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                  <span style={{ padding: '0 8px' }}>OR ONLINE MATCH</span>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                </div>

                <form onSubmit={handleJoinOnlineRoom} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter Room Code (e.g. SL_PRO)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#020617', color: '#fff', fontSize: '12px', outline: 'none' }}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    🌐 Enter Online Match
                  </motion.button>
                </form>

                <button
                  onClick={() => setCurrentView('home')}
                  style={{ marginTop: '12px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}
                >
                  ← Back to Game Hub
                </button>
              </motion.div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              
              {/* Top Clean HUD */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '8px',
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '4px 10px',
                marginBottom: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: currentTurn === 'red' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  border: `1px solid ${currentTurn === 'red' ? '#ef4444' : 'transparent'}`
                }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                    🔴
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#f8fafc' }}>
                      RED {myColor === 'red' ? '(You)' : ''}
                    </div>
                    <div style={{ fontSize: '8px', color: '#94a3b8' }}>
                      Left: <strong style={{ color: '#ef4444' }}>{stats.redCount}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '9px',
                    fontWeight: '800',
                    background: isMultiJumping ? 'rgba(239, 68, 68, 0.25)' : isMyTurn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                    color: isMultiJumping ? '#f87171' : isMyTurn ? '#10b981' : '#eab308',
                    border: `1px solid ${isMultiJumping ? '#ef4444' : isMyTurn ? '#10b981' : '#eab308'}`
                  }}>
                    {isMultiJumping ? '⚡ CHAIN!' : isMyTurn ? '⚡ YOUR TURN' : (gameMode === 'ai' ? '🤖 THINKING' : '⏳ OPPONENT')}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '6px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: currentTurn === 'white' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  border: `1px solid ${currentTurn === 'white' ? '#f8fafc' : 'transparent'}`
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#f8fafc' }}>
                      WHITE {gameMode === 'ai' ? '(AI)' : (myColor === 'white' ? '(You)' : '')}
                    </div>
                    <div style={{ fontSize: '8px', color: '#94a3b8' }}>
                      Left: <strong style={{ color: '#f8fafc' }}>{stats.whiteCount}</strong>
                    </div>
                  </div>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                    {gameMode === 'ai' ? '🤖' : '⚪'}
                  </div>
                </div>
              </div>

              {/* Main Game Layout */}
              <div className="daam-main-grid">
                <div className="daam-board-panel">
                  <Board3D 
                    boardState={boardState}
                    selectedPiece={selectedPiece}
                    validMoves={validMoves}
                    onPieceClick={handlePieceClick}
                    onTileClick={handleTileClick}
                  />
                </div>

                <div className="daam-side-panel">
                  <HandTracker 
                    onCursorMove={setCursorPos}
                    onPinchStateChange={setIsPinching}
                  />

                  <div style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100px'
                  }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#38bdf8', marginBottom: '4px' }}>
                      ⚡ LIVE COMBAT LOG
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {moveLogs.length === 0 ? (
                        <div style={{ color: '#475569', fontStyle: 'italic' }}>Waiting for moves...</div>
                      ) : (
                        moveLogs.map((log, idx) => (
                          <div key={idx} style={{ padding: '2px 5px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '4px', borderLeft: '2px solid #38bdf8' }}>
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

          {/* 🌟 CINEMATIC VICTORY / DEFEAT MODAL OVERLAY */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: isWinner 
                    ? 'radial-gradient(circle at center, rgba(6, 78, 59, 0.88) 0%, rgba(5, 8, 17, 0.96) 80%)'
                    : 'radial-gradient(circle at center, rgba(136, 19, 55, 0.88) 0%, rgba(5, 8, 17, 0.96) 80%)',
                  backdropFilter: 'blur(14px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000,
                  padding: '20px'
                }}
              >
                <motion.div
                  initial={{ scale: 0.7, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 220 }}
                  style={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(20px)',
                    border: `2px solid ${isWinner ? '#10b981' : '#ef4444'}`,
                    borderRadius: '28px',
                    padding: '36px 28px',
                    textAlign: 'center',
                    maxWidth: '420px',
                    width: '100%',
                    boxShadow: isWinner 
                      ? '0 0 60px rgba(16, 185, 129, 0.45), 0 20px 50px rgba(0,0,0,0.8)' 
                      : '0 0 60px rgba(239, 68, 68, 0.45), 0 20px 50px rgba(0,0,0,0.8)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top Ambient Glow Line */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '15%',
                    right: '15%',
                    height: '3px',
                    background: isWinner 
                      ? 'linear-gradient(90deg, transparent, #10b981, transparent)'
                      : 'linear-gradient(90deg, transparent, #ef4444, transparent)'
                  }} />

                  {/* Animated Badge Icon */}
                  <motion.div
                    animate={isWinner 
                      ? { rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1] } 
                      : { x: [-4, 4, -3, 3, 0], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: isWinner ? 1.4 : 0.6, repeat: Infinity, repeatDelay: isWinner ? 2 : 1 }}
                    style={{
                      width: '76px',
                      height: '76px',
                      borderRadius: '24px',
                      background: isWinner ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${isWinner ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '38px',
                      margin: '0 auto 16px',
                      boxShadow: isWinner ? '0 0 30px rgba(16, 185, 129, 0.35)' : '0 0 30px rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    {isWinner ? '🏆' : '💀'}
                  </motion.div>

                  {/* Outcome Title Banner */}
                  <motion.h1
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      fontSize: '28px',
                      fontWeight: '900',
                      letterSpacing: '1px',
                      marginBottom: '8px',
                      color: isWinner ? '#34d399' : '#f87171',
                      textShadow: isWinner ? '0 0 20px rgba(52, 211, 153, 0.5)' : '0 0 20px rgba(248, 113, 113, 0.5)'
                    }}
                  >
                    {isWinner ? 'VICTORY SECURED!' : 'ARENA DEFEAT'}
                  </motion.h1>

                  <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', marginBottom: '22px' }}>
                    {isWinner 
                      ? (gameMode === 'ai' ? 'You completely outmaneuvered the Grandmaster AI!' : 'You crushed your online opponent and claimed the arena crown!')
                      : (gameMode === 'ai' ? 'The Grandmaster AI captured all your forces.' : 'Your opposing rival claimed victory in this match.')}
                  </p>

                  {/* Match Stats Summary Pill */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    background: 'rgba(2, 6, 23, 0.6)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    marginBottom: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>RED REMAINING</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{stats.redCount} Pieces</div>
                    </div>
                    <div style={{ width: '1px', background: '#1e293b' }} />
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>WHITE REMAINING</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>{stats.whiteCount} Pieces</div>
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleResetGame}
                      style={{
                        padding: '13px',
                        borderRadius: '14px',
                        border: 'none',
                        background: isWinner 
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '900',
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                        boxShadow: isWinner 
                          ? '0 8px 25px rgba(16, 185, 129, 0.4)' 
                          : '0 8px 25px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      🔄 Play Again (Rematch)
                    </motion.button>

                    <button
                      onClick={() => {
                        setInLobby(true);
                        handleResetGame();
                      }}
                      style={{
                        padding: '11px',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        background: 'transparent',
                        color: '#94a3b8',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ← Back to Arena Lobby
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}