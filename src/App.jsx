import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import HomeHub from './components/HomeHub';
import Board3D from './components/Board3D';
import HandTracker from './components/HandTracker';
import { calculateValidMoves, calculateCapturesOnly, checkKingPromotion, getGameStats } from './utils/gameLogic';
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
  const [roomId, setRoomId] = useState('');
  const [myColor, setMyColor] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);

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
      setMoveLogs([`Match joined. You play as ${color.toUpperCase()}`]);
    });

    socket.on('room_update', (room) => {
      setPlayerCount(room.players.length);
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
      socket.off('room_update');
      socket.off('opponent_moved');
      socket.off('room_full');
    };
  }, []);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
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

      // Check if chain jumps are available from new landing spot
      let furtherCaptures = [];
      if (isCapture) {
        furtherCaptures = calculateCapturesOnly(newBoard, row, col);
      }

      if (furtherCaptures.length > 0) {
        // Continue turn for multi-jump
        setBoardState(newBoard);
        setSelectedPiece({ row, col });
        setValidMoves(furtherCaptures);
        setIsMultiJumping(true);

        const partialLog = `${myColor.toUpperCase()} jumped to (${row},${col}) ⚔️ [Chain Jump!]`;
        setMoveLogs(prev => [partialLog, ...prev].slice(0, 15));

        socket.emit('make_move', {
          roomId,
          moveData: { 
            newBoard, 
            nextTurn: currentTurn, // Keep same turn
            logMsg: partialLog, 
            isCapture: true, 
            isKing: justBecameKing 
          }
        });
      } else {
        // Complete turn and switch
        const nextTurn = currentTurn === 'red' ? 'white' : 'red';
        const logMsg = `${myColor.toUpperCase()} moved to (${row},${col}) ${isCapture ? '⚔️' : ''} ${justBecameKing ? '👑' : ''}`;

        setBoardState(newBoard);
        setSelectedPiece(null);
        setValidMoves([]);
        setIsMultiJumping(false);
        setCurrentTurn(nextTurn);
        setMoveLogs(prev => [logMsg, ...prev].slice(0, 15));

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
  };

  const isMyTurn = currentTurn === myColor;

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#070b14', color: '#f8fafc' }}>
      <Navbar onNavigate={setCurrentView} activeTab={currentView} />

      {currentView === 'home' && (
        <HomeHub onSelectGame={(gameId) => {
          if (gameId === 'daam') setCurrentView('daam');
        }} />
      )}

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
                style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', padding: '32px 24px', borderRadius: '24px', border: '1px solid rgba(56, 189, 248, 0.25)', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg, #0284c7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 14px', boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)' }}>
                  ⚔️
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>1v1 Arena Match</h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>Enter a custom Room ID to battle online</p>

                <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input
                    type="text"
                    placeholder="Enter Room Code (e.g. SL_PRO)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155', background: '#020617', color: '#fff', fontSize: '15px', outline: 'none' }}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}
                  >
                    Enter Arena
                  </motion.button>
                </form>
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
                    {isMultiJumping ? '⚡ CHAIN JUMP!' : isMyTurn ? '⚡ YOUR TURN' : "⏳ OPPONENT"}
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Room: <strong>{roomId}</strong></div>
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
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>WHITE {myColor === 'white' ? '(You)' : ''}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pieces: <strong style={{ color: '#f8fafc' }}>{stats.whiteCount}</strong></div>
                  </div>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                    ⚪
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
                    🏆 VICTORY! {stats.winner === (myColor ? myColor.charAt(0).toUpperCase() + myColor.slice(1) : '') ? 'YOU WON THE MATCH!' : 'OPPONENT WON THE MATCH!'}
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