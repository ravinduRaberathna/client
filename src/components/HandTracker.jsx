import React, { useRef, useState, useEffect } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Hands } from '@mediapipe/hands';

export default function HandTracker({ onCursorMove, onPinchStateChange, onTriggerClick }) {
  const videoRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wasPinchingRef = useRef(false);
  const lastPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    let camera = null;
    let hands = null;

    if (isActive && videoRef.current) {
      setIsLoading(true);

      hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      hands.onResults((results) => {
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

          // Calculate Pinch Distance between Thumb & Index Finger
          const distance = Math.hypot(
            (1 - thumb.x) - (1 - indexFinger.x),
            thumb.y - indexFinger.y
          );

          const isPinching = distance < 0.08;
          if (onPinchStateChange) onPinchStateChange(isPinching);

          // If Pinch state changed from NOT pinching to PINCHING -> Trigger Click
          if (isPinching && !wasPinchingRef.current) {
            wasPinchingRef.current = true;
            
            // Trigger programmatic 3D Click at current cursor position
            if (onTriggerClick) {
              onTriggerClick(screenX, screenY);
            } else {
              // Direct DOM synthetic click fallback
              const elem = document.elementFromPoint(screenX, screenY);
              if (elem) {
                elem.dispatchEvent(
                  new MouseEvent('click', {
                    clientX: screenX,
                    clientY: screenY,
                    bubbles: true,
                    cancelable: true,
                    view: window
                  })
                );
              }
            }
          } else if (!isPinching && wasPinchingRef.current) {
            wasPinchingRef.current = false;
          }
        }
      });

      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 320,
        height: 240
      });

      camera.start();
    }

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
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