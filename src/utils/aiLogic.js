import { calculateValidMoves, calculateCapturesOnly, checkKingPromotion } from './gameLogic';

/**
 * Generates the best move for AI (White pieces)
 */
export const getBestAiMove = (board, aiColor = 'white') => {
  const allMoves = [];
  const captureMoves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === aiColor) {
        const moves = calculateValidMoves(board, r, c);
        for (const m of moves) {
          const moveObj = {
            fromRow: r,
            fromCol: c,
            toRow: m.row,
            toCol: m.col,
            isJump: m.isJump,
            capturedRow: m.capturedRow,
            capturedCol: m.capturedCol
          };

          if (m.isJump) {
            captureMoves.push(moveObj);
          } else {
            allMoves.push(moveObj);
          }
        }
      }
    }
  }

  // Priority 1: Mandatory Captures
  if (captureMoves.length > 0) {
    return captureMoves[Math.floor(Math.random() * captureMoves.length)];
  }

  // Priority 2: Normal Strategic Move
  if (allMoves.length > 0) {
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  return null; // No moves available
};