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
      alert('Room is already full! Please try another room code.');
    });

    return () => {
      socket.off('player_assigned');
      socket.off('opponent_moved');
      socket.off('room_full');
    };
  }, []);

  // AI Turn Execution
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
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#070b14', color: '#f8fafc' }}>
      <Navbar onNavigate={setCurrentView} activeTab={currentView} />

      {/* Home Hub View */}
      {currentView === 'home' && (
        <HomeHub onSelectGame={(gameId) => {
          if (gameId === 'daam') setCurrentView('daam');
          if (gameId === 'tank') setCurrentView('tank');
        }} />
      )}

      {/* Tank Game View */}
      {currentView === 'tank' && (
        <TankGame socket={socket} onBackToHub={() => setCurrentView('home')} />
      )}

      {/* 3D Daam View */}
      {currentView === 'daam' && (
        <>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '16px' }}>
              <motion.div 
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(16px)',
                  padding: '32px 24px',
                  borderRadius: '24px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  width: '100%',
                  maxWidth: '400px',
                  textAlign: 'center',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.7)'
                }}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #0284c7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 14px', boxShadow: '0 0 25px rgba(56, 189, 248, 0.4)' }}>
                  ♟️
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#f8fafc', marginBottom: '6px' }}>3D Daam Arena</h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '22px' }}>Choose your mode to battle online or vs AI</p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartAiGame}
                  style={{ width: '100%', padding: '13px', borderRadius: '14px', border: '1px solid #38bdf8', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '14px', fontWeight: '800', cursor: 'pointer', marginBottom: '16px' }}
                >
                  🤖 Single Player vs AI Bot
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                  <span style={{ padding: '0 10px' }}>OR ONLINE MULTIPLAYER</span>
                  <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                </div>

                <form onSubmit={handleJoinOnlineRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Enter Room Code (e.g. SL_PRO)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #334155', background: '#020617', color: '#fff', fontSize: '14px', outline: 'none' }}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}
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
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
              
              {/* Sleek Top HUD Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '12px',
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '10px 16px',
                marginBottom: '14px'
              }}>
                {/* Red Player */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  background: currentTurn === 'red' ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
                  border: `1px solid ${currentTurn === 'red' ? '#ef4444' : 'transparent'}`
                }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    🔴
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc' }}>
                      RED {myColor === 'red' ? '(You)' : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      Pieces: <strong style={{ color: '#ef4444' }}>{stats.redCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Center Turn Pill */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '800',
                    background: isMultiJumping ? 'rgba(239, 68, 68, 0.25)' : isMyTurn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                    color: isMultiJumping ? '#f87171' : isMyTurn ? '#10b981' : '#eab308',
                    border: `1px solid ${isMultiJumping ? '#ef4444' : isMyTurn ? '#10b981' : '#eab308'}`
                  }}>
                    {isMultiJumping ? '⚡ CHAIN JUMP!' : isMyTurn ? '⚡ YOUR TURN' : (gameMode === 'ai' ? '🤖 AI THINKING...' : '⏳ OPPONENT')}
                  </span>
                </div>

                {/* White Player */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  background: currentTurn === 'white' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  border: `1px solid ${currentTurn === 'white' ? '#f8fafc' : 'transparent'}`
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc' }}>
                      WHITE {gameMode === 'ai' ? '(AI Bot)' : (myColor === 'white' ? '(You)' : '')}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      Pieces: <strong style={{ color: '#f8fafc' }}>{stats.whiteCount}</strong>
                    </div>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    {gameMode === 'ai' ? '🤖' : '⚪'}
                  </div>
                </div>
              </div>

              {/* Victory Banner */}
              <AnimatePresence>
                {stats.winner && (
                  <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{
                      marginBottom: '14px',
                      padding: '12px',
                      background: stats.winner.toLowerCase() === myColor ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #b91c1c, #ef4444)',
                      color: '#ffffff',
                      textAlign: 'center',
                      borderRadius: '14px',
                      fontWeight: '800',
                      fontSize: '15px'
                    }}
                  >
                    🏆 VICTORY! {stats.winner === (myColor ? myColor.charAt(0).toUpperCase() + myColor.slice(1) : '') ? 'YOU WON THE MATCH!' : (gameMode === 'ai' ? 'AI BOT WON!' : 'OPPONENT WON!')}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Game Layout */}
              <div className="daam-layout">
                {/* 3D Board Canvas */}
                <div style={{ height: '620px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                  <Board3D 
                    boardState={boardState}
                    selectedPiece={selectedPiece}
                    validMoves={validMoves}
                    onPieceClick={handlePieceClick}
                    onTileClick={handleTileClick}
                  />
                </div>

                {/* Right Panel: HandTracker + Logs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <HandTracker 
                    onCursorMove={setCursorPos}
                    onPinchStateChange={setIsPinching}
                  />

                  {/* Combat Logs */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '14px',
                    height: '210px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', marginBottom: '8px' }}>
                      ⚡ LIVE COMBAT LOG
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {moveLogs.length === 0 ? (
                        <div style={{ color: '#475569', fontStyle: 'italic' }}>Waiting for moves...</div>
                      ) : (
                        moveLogs.map((log, idx) => (
                          <div key={idx} style={{ padding: '4px 8px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
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