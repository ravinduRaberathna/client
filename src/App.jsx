import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import HomeHub from './components/HomeHub';
import Board3D from './components/Board3D';
import HandTracker from './components/HandTracker';
import { calculateValidMoves, checkKingPromotion, getGameStats } from './utils/gameLogic';
import { sounds } from './utils/audio';

const socket = io('https://server-production-836b.up.railway.app', {
  transports: ['websocket', 'polling'],
  autoConnect: true
});
// Initial Board with Persistent Unique IDs for each piece
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
    if (stats.winner || currentTurn !== myColor) return;
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

      // Move same piece instance to new coordinate
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

      const nextTurn = currentTurn === 'red' ? 'white' : 'red';
      const logMsg = `${myColor.toUpperCase()} moved (${selectedPiece.row},${selectedPiece.col}) → (${row},${col}) ${isCapture ? '⚔️' : ''} ${justBecameKing ? '👑' : ''}`;

      setBoardState(newBoard);
      setSelectedPiece(null);
      setValidMoves([]);
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
  };

  const isMyTurn = currentTurn === myColor;

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#070b14', color: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '20px' }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(56, 189, 248, 0.25)', width: '390px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #0284c7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)' }}>
                  ⚔️
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>1v1 Arena Match</h2>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '28px' }}>Enter a custom Room ID to battle online</p>

                <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input
                    type="text"
                    placeholder="Enter Room Code (e.g. SL_PRO)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155', background: '#020617', color: '#fff', fontSize: '15px', outline: 'none' }}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.4)' }}
                  >
                    Enter Arena
                  </motion.button>
                </form>
              </motion.div>
            </div>
          ) : (
            <div style={{ padding: '24px 30px', maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '14px', 
                  padding: '12px 20px', 
                  borderRadius: '16px', 
                  background: currentTurn === 'red' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.6)', 
                  border: `1px solid ${currentTurn === 'red' ? '#ef4444' : '#1e293b'}`,
                  boxShadow: currentTurn === 'red' ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none'
                }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff' }}>
                    🔴
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>RED PLAYER {myColor === 'red' ? '(You)' : ''}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Pieces: <strong style={{ color: '#ef4444' }}>{stats.redCount}</strong> / 12</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '6px 16px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '800',
                    background: isMyTurn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                    color: isMyTurn ? '#10b981' : '#eab308',
                    border: `1px solid ${isMyTurn ? '#10b981' : '#eab308'}`
                  }}>
                    {isMyTurn ? '⚡ YOUR TURN' : "⏳ OPPONENT THINKING"}
                  </span>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Room: <strong>{roomId}</strong> ({playerCount}/2)</div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: '14px', 
                  padding: '12px 20px', 
                  borderRadius: '16px', 
                  background: currentTurn === 'white' ? 'rgba(248, 250, 252, 0.15)' : 'rgba(15, 23, 42, 0.6)', 
                  border: `1px solid ${currentTurn === 'white' ? '#f8fafc' : '#1e293b'}`,
                  boxShadow: currentTurn === 'white' ? '0 0 20px rgba(248, 250, 252, 0.2)' : 'none'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>WHITE PLAYER {myColor === 'white' ? '(You)' : ''}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Pieces: <strong style={{ color: '#f8fafc' }}>{stats.whiteCount}</strong> / 12</div>
                  </div>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0f172a' }}>
                    ⚪
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {stats.winner && (
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{ marginBottom: '20px', padding: '16px', background: stats.winner.toLowerCase() === myColor ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #b91c1c, #ef4444)', color: '#fff', textAlign: 'center', borderRadius: '16px', fontWeight: '800', fontSize: '18px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  >
                    🏆 VICTORY! {stats.winner === (myColor ? myColor.charAt(0).toUpperCase() + myColor.slice(1) : '') ? 'YOU WON THE MATCH!' : 'OPPONENT WON THE MATCH!'}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
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

                  <div style={{ background: '#0f172a', borderRadius: '14px', border: '1px solid #1e293b', padding: '14px', height: '220px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      ⚡ LIVE COMBAT LOG
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
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