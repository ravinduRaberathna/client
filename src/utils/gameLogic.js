// Valid moves සහ Jumps (කැපීම්) ගණනය කරන function එක
export function calculateValidMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const isKing = piece.isKing;
  const color = piece.color;

  // Normal piece එකකට move විය හැකි දිශාව (Red උඩට -1, White පහළට +1)
  // King කෙනෙක්ට දිශා 4ටම (forward & backward) යන්න පුළුවන්
  const directions = isKing 
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] 
    : color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

  directions.forEach(([dRow, dCol]) => {
    const targetRow = row + dRow;
    const targetCol = col + dCol;

    // 1. Regular 1-step Move
    if (isValidSquare(targetRow, targetCol)) {
      if (!board[targetRow][targetCol]) {
        moves.push({
          row: targetRow,
          col: targetCol,
          isJump: false
        });
      } 
      // 2. Jump Move (ඉත්තෙක් උඩින් පැන කපා දැමීම)
      else if (board[targetRow][targetCol].color !== color) {
        const jumpRow = targetRow + dRow;
        const jumpCol = targetCol + dCol;

        if (isValidSquare(jumpRow, jumpCol) && !board[jumpRow][jumpCol]) {
          moves.push({
            row: jumpRow,
            col: jumpCol,
            isJump: true,
            capturedRow: targetRow,
            capturedCol: targetCol
          });
        }
      }
    }
  });

  return moves;
}

// කොටුව board එක ඇතුලෙදැයි පරීක්ෂා කිරීම
function isValidSquare(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// දාම් වීම (King Promotion) පරීක්ෂා කිරීම
export function checkKingPromotion(piece, row) {
  if (!piece) return false;
  if (piece.color === 'red' && row === 0) return true;
  if (piece.color === 'white' && row === 7) return true;
  return piece.isKing;
}

// ඉතිරි ඉත්තන් ගණන සහ Winner පරීක්ෂා කිරීම
export function getGameStats(board) {
  let redCount = 0;
  let whiteCount = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === 'red') redCount++;
      if (board[r][c]?.color === 'white') whiteCount++;
    }
  }

  let winner = null;
  if (redCount === 0) winner = 'White';
  if (whiteCount === 0) winner = 'Red';

  return { redCount, whiteCount, winner };
}