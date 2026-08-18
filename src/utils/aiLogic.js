import { calculateValidMoves, calculateCapturesOnly, checkKingPromotion } from './gameLogic';

// Piece and Position Weights
const PIECE_WEIGHT = 100;
const KING_WEIGHT = 280;

// Positional weight map: Center control and advancement
const POSITIONAL_WEIGHTS = [
  [4, 0, 4, 0, 4, 0, 4, 0],
  [0, 3, 0, 3, 0, 3, 0, 3],
  [2, 0, 5, 0, 5, 0, 2, 0],
  [0, 4, 0, 7, 0, 7, 0, 4],
  [4, 0, 7, 0, 7, 0, 4, 0],
  [0, 2, 0, 5, 0, 5, 0, 2],
  [3, 0, 3, 0, 3, 0, 3, 0],
  [0, 4, 0, 4, 0, 4, 0, 4],
];

/**
 * Evaluates board state score from AI's perspective (White)
 */
const evaluateBoard = (board) => {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let pieceVal = piece.isKing ? KING_WEIGHT : PIECE_WEIGHT;
      pieceVal += POSITIONAL_WEIGHTS[r][c];

      // Defend baseline for White (row 0)
      if (!piece.isKing && piece.color === 'white' && r === 0) {
        pieceVal += 15;
      }

      if (piece.color === 'white') {
        score += pieceVal;
      } else {
        score -= pieceVal;
      }
    }
  }
  return score;
};

/**
 * Gets all legal moves for a given player color
 */
const getAllMovesForColor = (board, color) => {
  const moves = [];
  const captureMoves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const valid = calculateValidMoves(board, r, c);
        for (const m of valid) {
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
            moves.push(moveObj);
          }
        }
      }
    }
  }

  // Sri Lankan rule: Mandatory captures
  return captureMoves.length > 0 ? captureMoves : moves;
};

/**
 * Applies a virtual move on a clone of the board
 */
const applySimulatedMove = (board, move) => {
  const newBoard = board.map(r => [...r]);
  const piece = { ...newBoard[move.fromRow][move.fromCol] };

  piece.isKing = checkKingPromotion(piece, move.toRow);
  newBoard[move.toRow][move.toCol] = piece;
  newBoard[move.fromRow][move.fromCol] = null;

  if (move.isJump) {
    newBoard[move.capturedRow][move.capturedCol] = null;
  }

  return newBoard;
};

/**
 * Minimax algorithm with Alpha-Beta pruning
 */
const minimax = (board, depth, alpha, beta, isMaximizing) => {
  if (depth === 0) {
    return evaluateBoard(board);
  }

  const currentColor = isMaximizing ? 'white' : 'red';
  const legalMoves = getAllMovesForColor(board, currentColor);

  if (legalMoves.length === 0) {
    return isMaximizing ? -9999 : 9999;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      const simBoard = applySimulatedMove(board, move);
      const evalScore = minimax(simBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const simBoard = applySimulatedMove(board, move);
      const evalScore = minimax(simBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
};

/**
 * Master Decision Function: Returns the Grandmaster AI Move
 */
export const getBestAiMove = (board, aiColor = 'white', searchDepth = 3) => {
  const legalMoves = getAllMovesForColor(board, aiColor);
  if (legalMoves.length === 0) return null;

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const simBoard = applySimulatedMove(board, move);
    // Depth 3 search with Alpha-Beta
    const score = minimax(simBoard, searchDepth - 1, -Infinity, Infinity, false);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};