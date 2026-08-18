import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, RoundedBox } from '@react-three/drei';

function Piece({ position, color, isKing, isSelected, onClick }) {
  const isRed = color === 'red';

  return (
    <group position={[position[0], isKing ? 0.36 : 0.22, position[2]]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <cylinderGeometry args={[0.39, 0.43, isKing ? 0.38 : 0.24, 48]} />
        <meshStandardMaterial
          color={isRed ? '#e11d48' : '#f8fafc'}
          metalness={isRed ? 0.4 : 0.7}
          roughness={0.15}
          emissive={
            isSelected
              ? (isRed ? '#ff0055' : '#00f0ff')
              : (isKing ? (isRed ? '#881337' : '#94a3b8') : '#000000')
          }
          emissiveIntensity={isSelected ? 1.0 : (isKing ? 0.4 : 0)}
        />
      </mesh>

      <mesh position={[0, (isKing ? 0.38 : 0.24) / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.28, 36]} />
        <meshStandardMaterial
          color={isRed ? '#fda4af' : '#cbd5e1'}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {isKing && (
        <mesh position={[0, 0.22, 0]}>
          <torusGeometry args={[0.24, 0.06, 20, 36]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.95}
            roughness={0.1}
            emissive="#f59e0b"
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

function Tile({ x, z, isDark, isValidMove, isSelected, onPieceClick, onTileClick, piece }) {
  let tileColor = isDark ? '#111318' : '#f1f5f9';
  if (isSelected) tileColor = '#0284c7';
  if (isValidMove) tileColor = '#059669';

  return (
    <group position={[x - 3.5, 0, z - 3.5]}>
      <RoundedBox
        args={[0.95, 0.14, 0.95]}
        radius={0.025}
        smoothness={4}
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
        <meshStandardMaterial
          color={tileColor}
          metalness={isDark ? 0.25 : 0.1}
          roughness={isDark ? 0.12 : 0.15}
          emissive={
            isValidMove
              ? '#10b981'
              : isSelected
              ? '#38bdf8'
              : '#000000'
          }
          emissiveIntensity={isValidMove ? 0.8 : isSelected ? 0.7 : 0}
        />
      </RoundedBox>

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'radial-gradient(ellipse at center, #0b0f19 0%, #03050a 100%)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}
    >
      <Canvas
        camera={{
          // Mobile එකේදී කැමරාව වඩාත් උඩට සහ කෝණගතව (Top-Down Angled) පිහිටුවා ඇත
          position: isMobile ? [0, 14.5, 6.2] : [0, 8.8, 5.8],
          fov: isMobile ? 60 : 44
        }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 14, 6]}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-6, 8, -6]} intensity={0.9} color="#ffffff" />
        <pointLight position={[6, 8, 6]} intensity={0.9} color="#e2e8f0" />
        <pointLight position={[0, 12, 0]} intensity={0.5} color="#ffffff" />

        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={18}
        />

        <Center position={[0, isMobile ? 0.2 : 0, 0]}>
          <RoundedBox args={[8.8, 0.28, 8.8]} radius={0.06} smoothness={4} position={[0, -0.16, 0]}>
            <meshStandardMaterial
              color="#090b10"
              metalness={0.3}
              roughness={0.2}
            />
          </RoundedBox>

          <mesh position={[0, -0.03, 0]}>
            <boxGeometry args={[8.65, 0.03, 8.65]} />
            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>

          {boardState.map((row, rIdx) =>
            row.map((piece, cIdx) => {
              const isDark = (rIdx + cIdx) % 2 === 1;
              const isSelected =
                selectedPiece &&
                selectedPiece.row === rIdx &&
                selectedPiece.col === cIdx;
              const isValid = validMoves.some(
                (m) => m.row === rIdx && m.col === cIdx
              );

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

      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2px 10px',
          borderRadius: '20px',
          fontSize: '9px',
          color: '#cbd5e1',
          pointerEvents: 'none',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap'
        }}
      >
        🖱️ <strong>Touch / Drag:</strong> Rotate • <strong>Pinch:</strong> Zoom
      </div>
    </div>
  );
}