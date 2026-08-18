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
      setMoveLogs([`Online match joined. You play as ${color.toUpperCase()}`]);
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

      if (logMsg) setMoveLogs(prev => [logMsg, ...prev].slice(0, 15));
    });

    socket.on('room_full', () => {
      alert('Room is already full! Please choose another room name.');
    });

    return () => {
      socket.off('player_assigned');
      socket.off('opponent_moved');
      socket.off('room_full');
    };
  }, []);

  // AI Turn Handling for Daam Game
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

    // Check for AI Multi-jump
    let furtherCaptures = [];
    if (aiMove.isJump) {
      furtherCaptures = calculateCapturesOnly(newBoard, aiMove.toRow, aiMove.toCol);
    }

    if (furtherCaptures.length > 0) {
      const nextJump = furtherCaptures[0];
      const logMsg = `AI jumped to (${aiMove.toRow},${aiMove.toCol}) ⚔️ [Chain Jump!]`;
      setBoardState(newBoard);
      setMoveLogs(prev => [logMsg, ...prev].slice(0, 15));

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
        setMoveLogs(prev => [`AI completed chain jump to (${nextJump.row},${nextJump.col}) ⚔️`, ...prev].slice(0, 15));
      }, 500);
    } else {
      const logMsg = `AI moved to (${aiMove.toRow},${aiMove.toCol}) ${aiMove.isJump ? '⚔️' : ''} ${justBecameKing ? '👑' : ''}`;
      setBoardState(newBoard);
      setCurrentTurn('red');
      setMoveLogs(prev => [logMsg, ...prev].slice(0, 15));
    }
  };

  const handleStartAiGame = () => {
    setGameMode('ai');
    setMyColor('red');
    setInLobby(false);
    setBoardState(createInitialBoard());
    setCurrentTurn('red');
    setMoveLogs(['Single Player vs AI Bot started. You play as RED.']);
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

        const partialLog = `${myColor.toUpperCase()} jumped to (${row},${col}) ⚔️ [Chain Jump!]`;
        setMoveLogs(prev => [partialLog, ...prev].slice(0, 15));

        if (gameMode === 'multi') {
          socket.emit('make_move', {
            roomId,
            moveData: { 
              newBoard, 
              nextTurn: currentTurn, 
              logMsg: partialLog, 
              isCapture: true, 
              isKing: justBecameKing 
            }
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
        setMoveLogs(prev => [logMsg, ...prev].slice(0, 15));

        if (gameMode === 'multi') {
          socket.emit('make_move', {
            roomId,
            moveData: { 
              newBoard, 
              nextTurn, 
              logMsg, 
              isCapture, 
              isKing: justBecameKing 
            }
          });
        }
      }
    }
  };

  const isMyTurn = currentTurn === myColor;

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#070b14', color: '#f8fafc' }}>
      <Navbar onNavigate={setCurrentView} activeTab={currentView} />

      {/* Home Hub View */}
      {currentView === 'home' && (
        <HomeHub onSelectGame={(gameId) => {
          if (gameId === 'daam') setCurrentView('daam');
          if (gameId === 'tank') setCurrentView('tank');
        }} />
      )}

      {/* Tank Arena 2D View */}
      {currentView === 'tank' && (
        <TankGame onBackToHub={() => setCurrentView('home')} />
      )}

      {/* 3D Daam View */}
      {currentView === 'daam' && (
        <>
          <div 
            style={{
              position: 'fixed',
              left: cursorPos.x - (isPinching ? 10 : 14),
              top: cursorPos.y - (isPinching ? 10 : 14),
              width: isPinching ? '20px' : '28px',
              height: isPinching ? '20px' : '28px',
              borderRadius: '50%',
              backgroundColor: isPinching ? '#10b981' : '#38bdf8',
              border: '3px solid #ffffff',
              boxShadow: isPinching ? '0 0 25px #10b981' : '0 0 15px rgba(56, 189, 248, 0.8)',
              pointerEvents: 'none',
              zIndex: 9999,
              transition: 'width 0.08s, height 0.08s, background-color 0.08s'
            }}
          />

          {inLobby ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '16px' }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', padding: '32px 24px', borderRadius: '24px', border: '1px solid rgba(56, 189, 248, 0.25)', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg, #0284c7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 14px', boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)' }}>
                  ♟️
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginBottom: '6px' }}>3D Daam Arena</h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Play against AI Bot or Challenge a Friend Online</p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartAiGame}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #38bdf8', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '15px', fontWeight: '800', cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  🤖 Play vs AI Bot (Single Player)
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0', color: '#64748b', fontSize: '12px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }}></div>
                  <span style={{ padding: '0 10px' }}>OR ONLINE MULTIPLAYER</span>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }}></div>
                </div>

                <form onSubmit={handleJoinOnlineRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Enter Room Code (e.g. SL_ARENA)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155', background: '#020617', color: '#fff', fontSize: '14px', outline: 'none' }}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}
                  >
                    🌐 Enter Online Match
                  </motion.button>
                </form>

                <button
                  onClick={() => setCurrentView('home')}
                  style={{ marginTop: '16px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
                >
                  ← Back to Game Hub
                </button>
              </motion.div>
            </div>
          ) : (
            <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
              
              <div className="hud-grid">
                <div className="hud-card" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  padding: '10px 14px', 
                  borderRadius: '14px', 
                  background: currentTurn === 'red' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.6)', 
                  border: `1px solid ${currentTurn === 'red' ? '#ef4444' : '#1e293b'}`
                }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                    🔴
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>RED {myColor === 'red' ? '(You)' : ''}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pieces: <strong style={{ color: '#ef4444' }}>{stats.redCount}</strong></div>
                  </div>
                </div>

                <div className="hud-center" style={{ textAlign: 'center' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '5px 14px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: '800',
                    background: isMultiJumping ? 'rgba(239, 68, 68, 0.2)' : isMyTurn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                    color: isMultiJumping ? '#f87171' : isMyTurn ? '#10b981' : '#eab308',
                    border: `1px solid ${isMultiJumping ? '#ef4444' : isMyTurn ? '#10b981' : '#eab308'}`
                  }}>
                    {isMultiJumping ? '⚡ CHAIN JUMP!' : isMyTurn ? '⚡ YOUR TURN' : (gameMode === 'ai' ? "🤖 AI THINKING..." : "⏳ OPPONENT")}
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    Mode: <strong>{gameMode === 'ai' ? 'Single Player (vs AI)' : `Online Room: ${roomId}`}</strong>
                  </div>
                </div>

                <div className="hud-card" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: '10px', 
                  padding: '10px 14px', 
                  borderRadius: '14px', 
                  background: currentTurn === 'white' ? 'rgba(248, 250, 252, 0.15)' : 'rgba(15, 23, 42, 0.6)', 
                  border: `1px solid ${currentTurn === 'white' ? '#f8fafc' : '#1e293b'}`
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>WHITE {gameMode === 'ai' ? '(AI Bot)' : (myColor === 'white' ? '(You)' : '')}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pieces: <strong style={{ color: '#f8fafc' }}>{stats.whiteCount}</strong></div>
                  </div>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                    {gameMode === 'ai' ? '🤖' : '⚪'}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {stats.winner && (
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{ marginBottom: '16px', padding: '14px', background: stats.winner.toLowerCase() === myColor ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #b91c1c, #ef4444)', color: '#fff', textAlign: 'center', borderRadius: '14px', fontWeight: '800', fontSize: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  >
                    🏆 VICTORY! {stats.winner === (myColor ? myColor.charAt(0).toUpperCase() + myColor.slice(1) : '') ? 'YOU WON THE MATCH!' : (gameMode === 'ai' ? 'AI BOT WON THE MATCH!' : 'OPPONENT WON THE MATCH!')}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="arena-grid">
                <Board3D 
                  boardState={boardState}
                  selectedPiece={selectedPiece}
                  validMoves={validMoves}
                  onPieceClick={handlePieceClick}
                  onTileClick={handleTileClick}
                  cursorPos={cursorPos}
                  isPinching={isPinching}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <HandTracker 
                    onCursorMove={setCursorPos}
                    onPinchStateChange={setIsPinching}
                  />

                  <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid #1e293b', padding: '12px', height: '180px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', marginBottom: '6px' }}>
                      ⚡ LIVE COMBAT LOG
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {moveLogs.length === 0 ? (
                        <div style={{ color: '#475569', fontStyle: 'italic' }}>Waiting for first move...</div>
                      ) : (
                        moveLogs.map((log, idx) => (
                          <div key={idx} style={{ padding: '4px 6px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '4px', borderLeft: '2px solid #38bdf8' }}>
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