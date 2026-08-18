import { calculateValidMoves, calculateCapturesOnly, checkKingPromotion } from './gameLogic';

// Evaluation Weights
const PIECE_WEIGHT = 120;
const KING_WEIGHT = 350;
const ADVANCEMENT_BONUS = 6;
const DEFENSE_BONUS = 25;
const CENTER_BONUS = 18;

// Center control heatmap
const POSITIONAL_WEIGHTS = [
  [10,  0, 10,  0, 10,  0, 10,  0],
  [ 0,  8,  0, 12,  0, 12,  0,  8],
  [ 8,  0, 18,  0, 18,  0,  8,  0],
  [ 0, 14,  0, 24,  0, 24,  0, 14],
  [14,  0, 24,  0, 24,  0, 14,  0],
  [ 0,  8,  0, 18,  0, 18,  0,  8],
  [ 8,  0, 12,  0, 12,  0,  8,  0],
  [ 0, 10,  0, 10,  0, 10,  0, 10],
];

/**
 * Aggressive Evaluation Engine (White perspective)
 */
const evaluateBoard = (board) => {
  let score = 0;
  let whiteCount = 0;
  let redCount = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let pieceVal = piece.isKing ? KING_WEIGHT : PIECE_WEIGHT;
      pieceVal += POSITIONAL_WEIGHTS[r][c];

      if (piece.color === 'white') {
        whiteCount++;
        // Encourage advancing forward to become King
        if (!piece.isKing) {
          pieceVal += r * ADVANCEMENT_BONUS;
        }
        // Baseline Wall defense (row 0)
        if (r === 0 && !piece.isKing) {
          pieceVal += DEFENSE_BONUS;
        }
        // Edge safety bonus
        if (c === 0 || c === 7) {
          pieceVal += 8;
        }
        score += pieceVal;
      } else {
        redCount++;
        // Penalize player's advance
        if (!piece.isKing) {
          pieceVal += (7 - r) * ADVANCEMENT_BONUS;
        }
        if (r === 7 && !piece.isKing) {
          pieceVal += DEFENSE_BONUS;
        }
        if (c === 0 || c === 7) {
          pieceVal += 8;
        }
        score -= pieceVal;
      }
    }
  }

  // Endgame instinct: If winning, punish opponent piece count heavily
  if (whiteCount > redCount) {
    score += (12 - redCount) * 25;
  }

  return score;
};

/**
 * Get all legal moves for a player (Enforcing mandatory jumps)
 */
const getAllMovesForColor = (board, color) => {
  const normalMoves = [];
  const captureMoves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
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
            normalMoves.push(moveObj);
          }
        }
      }
    }
  }

  return captureMoves.length > 0 ? captureMoves : normalMoves;
};

/**
 * Simulates a move and handles chain promotions
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
 * Minimax with Alpha-Beta Pruning & Move Ordering
 */
const minimax = (board, depth, alpha, beta, isMaximizing) => {
  if (depth === 0) {
    return evaluateBoard(board);
  }

  const currentColor = isMaximizing ? 'white' : 'red';
  const legalMoves = getAllMovesForColor(board, currentColor);

  if (legalMoves.length === 0) {
    return isMaximizing ? -100000 : 100000;
  }

  // Move Ordering: Evaluate jumps first for faster Alpha-Beta cutoffs
  legalMoves.sort((a, b) => (b.isJump ? 1 : 0) - (a.isJump ? 1 : 0));

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
 * Master Unbeatable AI Decision Engine
 */
export const getBestAiMove = (board, aiColor = 'white') => {
  // Count remaining pieces to adjust deep search dynamically
  let totalPieces = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]) totalPieces++;
    }
  }

  // Deep search: Depth 4 for mid-game, Depth 5/6 for end-game
  const searchDepth = totalPieces <= 10 ? 5 : 4;
  const legalMoves = getAllMovesForColor(board, aiColor);
  if (legalMoves.length === 0) return null;

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  // Move Ordering on Root
  legalMoves.sort((a, b) => (b.isJump ? 1 : 0) - (a.isJump ? 1 : 0));

  for (const move of legalMoves) {
    const simBoard = applySimulatedMove(board, move);
    const score = minimax(simBoard, searchDepth - 1, -Infinity, Infinity, false);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};