import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';

function Piece({ position, color, isKing, isSelected, onClick }) {
  return (
    <mesh
      position={[position[0], isKing ? 0.32 : 0.2, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <cylinderGeometry args={[0.38, 0.42, isKing ? 0.42 : 0.24, 32]} />
      <meshStandardMaterial
        color={color === 'red' ? '#ef4444' : '#f8fafc'}
        metalness={0.5}
        roughness={0.2}
        emissive={isSelected ? (color === 'red' ? '#ff0055' : '#00f0ff') : (isKing ? (color === 'red' ? '#991b1b' : '#94a3b8') : '#000000')}
        emissiveIntensity={isSelected ? 0.9 : (isKing ? 0.35 : 0)}
      />
      {isKing && (
        <mesh position={[0, 0.24, 0]}>
          <torusGeometry args={[0.22, 0.05, 16, 32]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} emissive="#f59e0b" emissiveIntensity={0.6} />
        </mesh>
      )}
    </mesh>
  );
}

function Tile({ x, z, isDark, isValidMove, isSelected, onPieceClick, onTileClick, piece }) {
  return (
    <group position={[x - 3.5, 0, z - 3.5]}>
      <mesh
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (piece) {
            onPieceClick(z, x);
          } else if (isValidMove) {
            onTileClick(z, x);
          }
        }}
      >
        <boxGeometry args={[0.96, 0.14, 0.96]} />
        <meshStandardMaterial
          color={isValidMove ? '#10b981' : isSelected ? '#38bdf8' : isDark ? '#0f172a' : '#1e293b'}
          roughness={0.3}
          metalness={0.3}
          emissive={isValidMove ? '#059669' : isSelected ? '#0284c7' : '#000000'}
          emissiveIntensity={isValidMove ? 0.75 : isSelected ? 0.6 : 0}
        />
      </mesh>

      {piece && (
        <Piece
          position={[0, 0, 0]}
          color={piece.color}
          isKing={piece.isKing}
          isSelected={isSelected}
          onClick={() => onPieceClick(z, x)}
        />
      )}
    </group>
  );
}

export default function Board3D({
  boardState,
  selectedPiece,
  validMoves,
  onPieceClick,
  onTileClick
}) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '520px', position: 'relative', background: 'radial-gradient(circle at center, #0f172a 0%, #050811 100%)', borderRadius: '20px', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 8.5, 5.8], fov: 45 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 12, 5]} intensity={1.6} castShadow />
        <pointLight position={[-6, 6, -6]} intensity={0.8} color="#38bdf8" />
        <pointLight position={[6, 6, 6]} intensity={0.8} color="#ef4444" />

        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.3}
          minDistance={5}
          maxDistance={12}
        />

        <Center>
          {/* Base Rim Board */}
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[8.4, 0.2, 8.4]} />
            <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Neon Border Line */}
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[8.5, 0.05, 8.5]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.5} />
          </mesh>

          {/* Tiles & Pieces */}
          {boardState.map((row, rIdx) =>
            row.map((piece, cIdx) => {
              const isDark = (rIdx + cIdx) % 2 === 1;
              const isSelected = selectedPiece && selectedPiece.row === rIdx && selectedPiece.col === cIdx;
              const isValid = validMoves.some((m) => m.row === rIdx && m.col === cIdx);

              return (
                <Tile
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx}
                  z={rIdx}
                  isDark={isDark}
                  isSelected={isSelected}
                  isValidMove={isValid}
                  piece={piece}
                  onPieceClick={onPieceClick}
                  onTileClick={onTileClick}
                />
              );
            })
          )}
        </Center>
      </Canvas>

      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', color: '#94a3b8', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        🖱️ Drag to Rotate • Scroll to Zoom
      </div>
    </div>
  );
}