import React, { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Continuous Hand Raycaster Controller
function HandController({ cursorPos, isPinching, onTileClick, onPieceClick }) {
  const { camera, scene, gl } = useThree();
  const lastPinchRef = useRef(false);

  useEffect(() => {
    if (!cursorPos || cursorPos.x < 0) return;

    const rect = gl.domElement.getBoundingClientRect();
    if (
      cursorPos.x < rect.left ||
      cursorPos.x > rect.right ||
      cursorPos.y < rect.top ||
      cursorPos.y > rect.bottom
    ) {
      return;
    }

    const mouse = new THREE.Vector2(
      ((cursorPos.x - rect.left) / rect.width) * 2 - 1,
      -((cursorPos.y - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    let target = null;
    for (let hit of intersects) {
      let obj = hit.object;
      while (obj && !obj.userData?.type && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.type) {
        target = obj.userData;
        break;
      }
    }

    if (isPinching && !lastPinchRef.current && target) {
      if (target.type === 'piece') {
        onPieceClick(target.row, target.col);
      } else if (target.type === 'tile') {
        onTileClick(target.row, target.col);
      }
    }

    lastPinchRef.current = isPinching;
  }, [cursorPos, isPinching]);

  return null;
}

// 3D Tile
function Tile({ position, row, col, isDark, onClick, isSelected, isHighlighted }) {
  let color = isDark ? '#0f172a' : '#cbd5e1';
  if (isSelected) color = '#38bdf8';
  if (isHighlighted) color = '#10b981';

  return (
    <mesh 
      position={position} 
      onClick={onClick} 
      receiveShadow
      userData={{ type: 'tile', row, col }}
    >
      <boxGeometry args={[1, 0.22, 1]} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.4} 
        metalness={0.1}
        emissive={isHighlighted ? '#059669' : '#000000'}
        emissiveIntensity={isHighlighted ? 0.4 : 0}
      />
    </mesh>
  );
}

// Smooth Sliding Animated Piece Component
function AnimatedPiece({ row, col, color, isKing, isSelected, onClick }) {
  const groupRef = useRef();
  const pieceColor = color === 'red' ? '#ef4444' : '#f8fafc';

  // Board offset is -3.5, piece target coordinate mapping
  const targetX = col - 3.5;
  const targetZ = row - 3.5;
  const targetY = isSelected ? 0.45 : 0.22;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth Lerp Interpolation
    const current = groupRef.current.position;
    const speed = delta * 14;

    current.x = THREE.MathUtils.lerp(current.x, targetX, speed);
    current.z = THREE.MathUtils.lerp(current.z, targetZ, speed);

    // Calculate distance to create slight arc hop while moving
    const distToTarget = Math.hypot(targetX - current.x, targetZ - current.z);
    const hopHeight = Math.sin(Math.min(distToTarget * Math.PI, Math.PI)) * 0.35;

    current.y = THREE.MathUtils.lerp(current.y, targetY + hopHeight, speed * 1.2);
  });

  return (
    <group 
      ref={groupRef}
      position={[targetX, targetY, targetZ]}
      onClick={onClick}
      userData={{ type: 'piece', row, col }}
    >
      {/* Invisible Raycast Hitbox */}
      <mesh visible={false} userData={{ type: 'piece', row, col }}>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
      </mesh>

      {/* Main Cylinder Piece */}
      <mesh castShadow userData={{ type: 'piece', row, col }}>
        <cylinderGeometry args={[0.38, 0.38, 0.22, 32]} />
        <meshStandardMaterial 
          color={pieceColor} 
          roughness={0.2}
          metalness={0.3}
          emissive={isSelected ? '#38bdf8' : '#000000'}
          emissiveIntensity={isSelected ? 0.8 : 0}
        />
      </mesh>

      {/* Crown King Indicator */}
      {isKing && (
        <mesh position={[0, 0.16, 0]} userData={{ type: 'piece', row, col }}>
          <cylinderGeometry args={[0.24, 0.26, 0.09, 24]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} emissive="#d97706" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

export default function Board3D({ 
  boardState, 
  selectedPiece, 
  validMoves = [], 
  onTileClick, 
  onPieceClick,
  cursorPos,
  isPinching
}) {
  // Extract pieces with their internal tracking IDs
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = boardState[r][c];
      if (p) {
        pieces.push({
          id: p.id,
          row: r,
          col: c,
          color: p.color,
          isKing: p.isKing,
          isSelected: selectedPiece?.row === r && selectedPiece?.col === c
        });
      }
    }
  }

  return (
    <div style={{ width: '100%', height: '580px', background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
      <Canvas shadows camera={{ position: [0, 9, 8], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[6, 14, 8]} 
          intensity={1.6} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048} 
        />
        <pointLight position={[-5, 7, -5]} intensity={0.8} color="#38bdf8" />
        <pointLight position={[5, 4, 5]} intensity={0.5} color="#ec4899" />

        <HandController 
          cursorPos={cursorPos}
          isPinching={isPinching}
          onTileClick={onTileClick}
          onPieceClick={onPieceClick}
        />

        {/* Board Outer Base Rim */}
        <mesh position={[0, -0.15, 0]} receiveShadow>
          <boxGeometry args={[8.8, 0.35, 8.8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* 8x8 Board Tiles Group */}
        <group position={[-3.5, 0, -3.5]}>
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => {
              const isDark = (row + col) % 2 === 1;
              const isSelected = selectedPiece?.row === row && selectedPiece?.col === col;
              const isHighlighted = validMoves.some(m => m.row === row && m.col === col);

              return (
                <Tile
                  key={`tile-${row}-${col}`}
                  position={[col, 0, row]}
                  row={row}
                  col={col}
                  isDark={isDark}
                  isSelected={isSelected}
                  isHighlighted={isHighlighted}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTileClick(row, col);
                  }}
                />
              );
            })
          )}
        </group>

        {/* Dynamic Animated Pieces Group */}
        {pieces.map((p) => (
          <AnimatedPiece
            key={p.id}
            row={p.row}
            col={p.col}
            color={p.color}
            isKing={p.isKing}
            isSelected={p.isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onPieceClick(p.row, p.col);
            }}
          />
        ))}

        <OrbitControls maxPolarAngle={Math.PI / 2.15} minDistance={6} maxDistance={15} />
      </Canvas>
    </div>
  );
}