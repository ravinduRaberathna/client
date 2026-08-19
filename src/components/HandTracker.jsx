import React, { useRef, useState, useEffect } from 'react';

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
};

// Hand Joint Connections (Bones)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17] // Pinky & Palm
];

export default function HandTracker({ onCursorMove, onPinchStateChange, onTriggerClick }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wasPinchingRef = useRef(false);
  const lastPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    let cameraInstance = null;
    let handsInstance = null;
    let isCancelled = false;

    const initHandTracking = async () => {
      if (!isActive || !videoRef.current || !canvasRef.current) return;

      setIsLoading(true);

      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

        if (isCancelled) return;

        const { Camera, Hands } = window;

        handsInstance = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });

        handsInstance.onResults((results) => {
          setIsLoading(false);
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');

          // 1. Dark Sci-Fi Canvas Background
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Subtle Radar Grid Lines
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
          ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            const indexFinger = landmarks[8];
            const thumb = landmarks[4];

            const screenX = (1 - indexFinger.x) * window.innerWidth;
            const screenY = indexFinger.y * window.innerHeight;

            lastPosRef.current = { x: screenX, y: screenY };
            if (onCursorMove) onCursorMove({ x: screenX, y: screenY });

            const distance = Math.hypot(
              (1 - thumb.x) - (1 - indexFinger.x),
              thumb.y - indexFinger.y
            );

            const isPinching = distance < 0.08;
            if (onPinchStateChange) onPinchStateChange(isPinching);

            if (isPinching && !wasPinchingRef.current) {
              wasPinchingRef.current = true;
              if (onTriggerClick) onTriggerClick(screenX, screenY);
            } else if (!isPinching && wasPinchingRef.current) {
              wasPinchingRef.current = false;
            }

            // 2. Draw Futuristic Hand Skeleton Bones
            ctx.save();
            ctx.strokeStyle = isPinching ? '#10b981' : 'rgba(0, 240, 255, 0.7)';
            ctx.lineWidth = isPinching ? 3 : 2;
            ctx.shadowColor = isPinching ? '#10b981' : '#00f0ff';
            ctx.shadowBlur = 10;

            HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
              const start = landmarks[startIdx];
              const end = landmarks[endIdx];
              ctx.beginPath();
              ctx.moveTo((1 - start.x) * canvas.width, start.y * canvas.height);
              ctx.lineTo((1 - end.x) * canvas.width, end.y * canvas.height);
              ctx.stroke();
            });

            // 3. Draw Joints & Fingertips
            landmarks.forEach((lm, idx) => {
              const x = (1 - lm.x) * canvas.width;
              const y = lm.y * canvas.height;

              const isFingertip = [4, 8, 12, 16, 20].includes(idx);
              const isAimingTip = idx === 8 || idx === 4;

              ctx.beginPath();
              ctx.arc(x, y, isAimingTip ? 5 : isFingertip ? 3.5 : 2.5, 0, Math.PI * 2);
              ctx.fillStyle = isAimingTip 
                ? (isPinching ? '#34d399' : '#38bdf8') 
                : (isPinching ? '#10b981' : '#818cf8');
              ctx.shadowColor = isAimingTip ? '#ffffff' : '#00f0ff';
              ctx.shadowBlur = isAimingTip ? 12 : 6;
              ctx.fill();
            });

            ctx.restore();
          } else {
            // Scanning Indicator when no hand is in frame
            ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ SEARCHING FOR HAND...', canvas.width / 2, canvas.height / 2 + 3);
          }
        });

        cameraInstance = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsInstance) {
              await handsInstance.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240
        });

        await cameraInstance.start();
      } catch (err) {
        console.error('Hand tracking error:', err);
        setIsLoading(false);
      }
    };

    initHandTracking();

    return () => {
      isCancelled = true;
      if (cameraInstance && cameraInstance.stop) cameraInstance.stop();
      if (handsInstance && handsInstance.close) handsInstance.close();
    };
  }, [isActive]);

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🖐️ AI SKELETON TRACKER</span>
          {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />}
        </div>
        <button
          onClick={() => setIsActive(!isActive)}
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            border: 'none',
            background: isActive ? '#ef4444' : 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          {isActive ? 'Stop' : 'Start Sensor'}
        </button>
      </div>

      {/* Hidden Video (For Processing Only) */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Futuristic Skeleton HUD Canvas */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '115px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#020617',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {isActive ? (
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '9px' }}>
            Sensor Offline<br />
            <span style={{ color: '#38bdf8' }}>Click Start Sensor to activate</span>
          </div>
        )}

        {isLoading && (
          <div style={{ position: 'absolute', color: '#38bdf8', fontSize: '10px', fontWeight: '700' }}>
            Loading AI Vision...
          </div>
        )}
      </div>

      {isActive && (
        <div style={{ fontSize: '8.5px', color: '#94a3b8', textAlign: 'center' }}>
          💡 <strong>Tip:</strong> Move index finger to aim • Pinch (👌) to Play
        </div>
      )}
    </div>
  );
}