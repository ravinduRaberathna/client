// Directions: [dRow, dCol]
const ALL_DIRECTIONS = [
  [-1, -1], [-1, 1],
  [1, -1],  [1, 1]
];

/**
 * Check if coordinate is within 8x8 board
 */
const isValidPos = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

/**
 * Calculates ONLY capture/jump moves for a piece at (row, col)
 */
export const calculateCapturesOnly = (board, row, col) => {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const myColor = piece.color;
  const oppColor = myColor === 'red' ? 'white' : 'red';

  if (!piece.isKing) {
    // Regular piece: Can capture in ALL 4 diagonal directions (Forward & Backward)
    for (const [dr, dc] of ALL_DIRECTIONS) {
      const enemyRow = row + dr;
      const enemyCol = col + dc;
      const landingRow = row + dr * 2;
      const landingCol = col + dc * 2;

      if (isValidPos(landingRow, landingCol)) {
        const midPiece = board[enemyRow][enemyCol];
        const destPiece = board[landingRow][landingCol];

        if (midPiece && midPiece.color === oppColor && !destPiece) {
          moves.push({
            row: landingRow,
            col: landingCol,
            isJump: true,
            capturedRow: enemyRow,
            capturedCol: enemyCol
          });
        }
      }
    }
  } else {
    // Flying King (Dama): Can capture from any distance along diagonal rays
    for (const [dr, dc] of ALL_DIRECTIONS) {
      let r = row + dr;
      let c = col + dc;
      let enemyFound = null;

      while (isValidPos(r, c)) {
        const currentPiece = board[r][c];

        if (!enemyFound) {
          if (currentPiece) {
            if (currentPiece.color === oppColor) {
              enemyFound = { r, c };
            } else {
              break; // Blocked by friendly piece
            }
          }
        } else {
          // After finding 1 enemy piece, all consecutive empty squares are valid landing squares
          if (!currentPiece) {
            moves.push({
              row: r,
              col: c,
              isJump: true,
              capturedRow: enemyFound.r,
              capturedCol: enemyFound.c
            });
          } else {
            break; // Blocked by another piece behind enemy
          }
        }
        r += dr;
        c += dc;
      }
    }
  }

  return moves;
};

/**
 * Calculates all valid moves (Captures + Normal Sliding Moves)
 */
export const calculateValidMoves = (board, row, col) => {
  const piece = board[row][col];
  if (!piece) return [];

  // Captures take priority
  const captureMoves = calculateCapturesOnly(board, row, col);

  const normalMoves = [];
  const forwardDir = piece.color === 'red' ? -1 : 1;

  if (!piece.isKing) {
    // Regular piece: Single step forward only
    const regularDirs = [
      [forwardDir, -1],
      [forwardDir, 1]
    ];

    for (const [dr, dc] of regularDirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (isValidPos(nr, nc) && !board[nr][nc]) {
        normalMoves.push({ row: nr, col: nc, isJump: false });
      }
    }
  } else {
    // Flying King (Dama): Glide any distance along all 4 diagonals
    for (const [dr, dc] of ALL_DIRECTIONS) {
      let nr = row + dr;
      let nc = col + dc;
      while (isValidPos(nr, nc) && !board[nr][nc]) {
        normalMoves.push({ row: nr, col: nc, isJump: false });
        nr += dr;
        nc += dc;
      }
    }
  }

  return [...captureMoves, ...normalMoves];
};

/**
 * Checks if piece reached opponent base line for King promotion
 */
export const checkKingPromotion = (piece, targetRow) => {
  if (piece.isKing) return true;
  if (piece.color === 'red' && targetRow === 0) return true;
  if (piece.color === 'white' && targetRow === 7) return true;
  return false;
};

/**
 * Count remaining pieces and calculate winner
 */
export const getGameStats = (board) => {
  let redCount = 0;
  let whiteCount = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === 'red') redCount++;
        else if (piece.color === 'white') whiteCount++;
      }
    }
  }

  let winner = null;
  if (redCount === 0) winner = 'White';
  if (whiteCount === 0) winner = 'Red';

  return { redCount, whiteCount, winner };
};