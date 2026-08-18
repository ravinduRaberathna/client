import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, Center } from '@react-three/drei';
import * as THREE from 'three';

// 3D Piece Component
function Piece({ position, color, isKing, isSelected, onClick }) {
  const meshRef = useRef();

  return (
    <mesh
      ref={meshRef}
      position={[position[0], isKing ? 0.35 : 0.22, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <cylinderGeometry args={[0.38, 0.42, isKing ? 0.45 : 0.28, 32]} />
      <meshStandardMaterial
        color={color === 'red' ? '#ef4444' : '#f8fafc'}
        metalness={0.6}
        roughness={0.25}
        emissive={isSelected ? (color === 'red' ? '#ff0055' : '#00f0ff') : (isKing ? (color === 'red' ? '#7f1d1d' : '#94a3b8') : '#000000')}
        emissiveIntensity={isSelected ? 0.8 : (isKing ? 0.4 : 0)}
      />
      {/* King Crown Ring Top */}
      {isKing && (
        <mesh position={[0, 0.25, 0]}>
          <torusGeometry args={[0.22, 0.06, 16, 32]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
      )}
    </mesh>
  );
}

// 3D Tile Component
function Tile({ x, z, isDark, isValidMove, isSelected, onPieceClick, onTileClick, piece }) {
  return (
    <group position={[x - 3.5, 0, z - 3.5]}>
      {/* Board Square Tile */}
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
        <boxGeometry args={[0.96, 0.15, 0.96]} />
        <meshStandardMaterial
          color={isValidMove ? '#10b981' : isSelected ? '#38bdf8' : isDark ? '#0f172a' : '#334155'}
          roughness={0.3}
          metalness={0.4}
          emissive={isValidMove ? '#059669' : isSelected ? '#0284c7' : '#000000'}
          emissiveIntensity={isValidMove ? 0.7 : isSelected ? 0.6 : 0}
        />
      </mesh>

      {/* Piece Render */}
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
    <div style={{ width: '100%', height: '680px', position: 'relative', background: 'radial-gradient(circle at center, #0a0f1d 0%, #03060f 100%)' }}>
      <Canvas
        camera={{ position: [0, 8.2, 6.8], fov: 42 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lights */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[6, 12, 6]} intensity={1.5} castShadow />
        <pointLight position={[-6, 8, -6]} intensity={0.9} color="#38bdf8" />
        <pointLight position={[6, 8, 6]} intensity={0.9} color="#ef4444" />

        {/* Orbit Controls (Drag to rotate, Scroll to zoom) */}
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.3}
          minDistance={6}
          maxDistance={14}
        />

        <Center>
          {/* Main Board Base Plate */}
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[8.4, 0.25, 8.4]} />
            <meshStandardMaterial
              color="#020617"
              metalness={0.8}
              roughness={0.2}
              envMapIntensity={1}
            />
          </mesh>

          {/* Neon Border Rim */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[8.55, 0.08, 8.55]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.6}
            />
          </mesh>

          {/* 8x8 Board Matrix */}
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

      {/* Interactive Helper Hint */}
      <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '5px 14px', borderRadius: '20px', fontSize: '11px', color: '#94a3b8', pointerEvents: 'none', letterSpacing: '0.5px' }}>
        🖱️ <strong>Left Click + Drag:</strong> Rotate 3D View | <strong>Scroll:</strong> Zoom
      </div>
    </div>
  );
}