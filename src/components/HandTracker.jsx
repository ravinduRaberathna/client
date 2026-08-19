import React, { useRef, useState, useEffect } from 'react';

// Helper function to dynamically load MediaPipe scripts from CDN
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

export default function HandTracker({ onCursorMove, onPinchStateChange, onTriggerClick }) {
  const videoRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wasPinchingRef = useRef(false);
  const lastPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    let cameraInstance = null;
    let handsInstance = null;
    let isCancelled = false;

    const initHandTracking = async () => {
      if (!isActive || !videoRef.current) return;

      setIsLoading(true);

      try {
        // Load MediaPipe scripts from official CDN
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

        if (isCancelled) return;

        const { Camera } = window;
        const { Hands } = window;

        if (!Camera || !Hands) {
          throw new Error('MediaPipe libraries failed to initialize on window object.');
        }

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
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // Index finger tip (Landmark 8) & Thumb tip (Landmark 4)
            const indexFinger = landmarks[8];
            const thumb = landmarks[4];

            // Mirror X for intuitive control
            const screenX = (1 - indexFinger.x) * window.innerWidth;
            const screenY = indexFinger.y * window.innerHeight;

            lastPosRef.current = { x: screenX, y: screenY };
            if (onCursorMove) onCursorMove({ x: screenX, y: screenY });

            // Calculate Pinch Distance
            const distance = Math.hypot(
              (1 - thumb.x) - (1 - indexFinger.x),
              thumb.y - indexFinger.y
            );

            const isPinching = distance < 0.08;
            if (onPinchStateChange) onPinchStateChange(isPinching);

            // Trigger Click on pinch start
            if (isPinching && !wasPinchingRef.current) {
              wasPinchingRef.current = true;
              if (onTriggerClick) {
                onTriggerClick(screenX, screenY);
              }
            } else if (!isPinching && wasPinchingRef.current) {
              wasPinchingRef.current = false;
            }
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
          <span>🖐️ AI HAND TRACKING</span>
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
          {isActive ? 'Stop' : 'Start Camera'}
        </button>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        height: '110px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#020617',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: isActive ? 'block' : 'none'
          }}
        />

        {!isActive && (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '9px' }}>
            Camera Inactive<br />
            <span style={{ color: '#38bdf8' }}>Pinch 👌 to select/move pieces</span>
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