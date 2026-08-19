import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// 3D Animated Piece Component (Drop-in Animation)
function Piece({ position, color, isKing, isSelected, onClick, index, isIntroPlaying }) {
  const isRed = color === 'red';
  const groupRef = useRef();

  // Initial fall offset for intro
  const targetY = isKing ? 0.35 : 0.22;
  const startY = targetY + 3.0 + (index * 0.08); // Staggered heights
  const currentY = useRef(startY);

  useFrame((state, delta) => {
    if (groupRef.current) {
      if (isIntroPlaying) {
        // Smooth gravity drop towards tile
        currentY.current = THREE.MathUtils.damp(currentY.current, targetY, 6, delta);
        groupRef.current.position.y = currentY.current;
      } else {
        groupRef.current.position.y = targetY;
      }
    }
  });

  return (
    <group 
      ref={groupRef}
      position={[position[0], isIntroPlaying ? startY : targetY, position[2]]}
    >
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <cylinderGeometry args={[0.38, 0.42, isKing ? 0.38 : 0.24, 40]} />
        <meshStandardMaterial
          color={isRed ? '#e11d48' : '#f8fafc'}
          metalness={isRed ? 0.4 : 0.7}
          roughness={0.18}
          emissive={
            isSelected
              ? (isRed ? '#ff0055' : '#00f0ff')
              : (isKing ? (isRed ? '#881337' : '#94a3b8') : '#000000')
          }
          emissiveIntensity={isSelected ? 1.0 : (isKing ? 0.4 : 0)}
        />
      </mesh>

      <mesh position={[0, (isKing ? 0.38 : 0.24) / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.26, 32]} />
        <meshStandardMaterial
          color={isRed ? '#fda4af' : '#cbd5e1'}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {isKing && (
        <mesh position={[0, 0.22, 0]}>
          <torusGeometry args={[0.22, 0.05, 16, 32]} />
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

// 3D Tile Component
function Tile({ x, z, isDark, isValidMove, isSelected, onPieceClick, onTileClick, piece, pieceIndex, isIntroPlaying }) {
  let tileColor = isDark ? '#111318' : '#f1f5f9';
  if (isSelected) tileColor = '#0284c7';
  if (isValidMove) tileColor = '#059669';

  return (
    <group position={[x - 3.5, 0, z - 3.5]}>
      <RoundedBox
        args={[0.95, 0.14, 0.95]}
        radius={0.02}
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
          index={pieceIndex}
          isIntroPlaying={isIntroPlaying}
        />
      )}
    </group>
  );
}

// Animated Board Arena Rig (Board Spawning Rig)
function AnimatedBoardGroup({ children, isIntroPlaying }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current && isIntroPlaying) {
      // Gentle spin and scale into target view
      groupRef.current.scale.x = THREE.MathUtils.damp(groupRef.current.scale.x, 1, 4, delta);
      groupRef.current.scale.y = THREE.MathUtils.damp(groupRef.current.scale.y, 1, 4, delta);
      groupRef.current.scale.z = THREE.MathUtils.damp(groupRef.current.scale.z, 1, 4, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, 0, 3, delta);
    }
  });

  return (
    <group 
      ref={groupRef}
      scale={isIntroPlaying ? [0.2, 0.2, 0.2] : [1, 1, 1]}
      rotation={isIntroPlaying ? [0, Math.PI / 4, 0] : [0, 0, 0]}
    >
      {children}
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
  const [isIntroPlaying, setIsIntroPlaying] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 850);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Intro Animation Duration (1.6 seconds)
    const timer = setTimeout(() => {
      setIsIntroPlaying(false);
    }, 1600);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  let pieceCounter = 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #03050a 100%)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}
    >
      <Canvas
        camera={{
          position: isMobile ? [0, 13.5, 3.8] : [0, 9.2, 4.8],
          fov: isMobile ? 48 : 42
        }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[5, 14, 5]}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-6, 8, -6]} intensity={0.8} color="#ffffff" />
        <pointLight position={[6, 8, 6]} intensity={0.8} color="#e2e8f0" />

        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={4.0}
          maxDistance={16}
        />

        <Center position={[0, 0, 0]}>
          <AnimatedBoardGroup isIntroPlaying={isIntroPlaying}>
            {/* Main Obsidian Base Plinth */}
            <RoundedBox args={[8.8, 0.28, 8.8]} radius={0.06} smoothness={4} position={[0, -0.16, 0]}>
              <meshStandardMaterial
                color="#090b10"
                metalness={0.3}
                roughness={0.2}
              />
            </RoundedBox>

            {/* Inner Metallic Rim Inset */}
            <mesh position={[0, -0.03, 0]}>
              <boxGeometry args={[8.65, 0.03, 8.65]} />
              <meshStandardMaterial
                color="#cbd5e1"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>

            {/* 8x8 Board Matrix with Cascade Drop Pieces */}
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

                if (piece) pieceCounter++;

                return (
                  <Tile
                    key={`${rIdx}-${cIdx}`}
                    x={cIdx}
                    z={rIdx}
                    isDark={isDark}
                    isSelected={isSelected}
                    isValidMove={isValid}
                    piece={piece}
                    pieceIndex={pieceCounter}
                    isIntroPlaying={isIntroPlaying}
                    onPieceClick={onPieceClick}
                    onTileClick={onTileClick}
                  />
                );
              })
            )}
          </AnimatedBoardGroup>
        </Center>
      </Canvas>
    </div>
  );
}