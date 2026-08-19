import React, { useEffect, useRef, useState } from 'react';

export default function HandTracker({ onCursorMove, onPinchStateChange }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Camera Offline');
  const streamRef = useRef(null);
  const animFrameId = useRef(null);
  const handsRef = useRef(null);
  const isPinchingRef = useRef(false);

  // Script Loader Utility
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
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  };

  const startTracking = async () => {
    setLoading(true);
    setStatusText('Loading AI Model...');

    try {
      // 1. Load MediaPipe Hand tracking via official CDN
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

      // 2. Request Camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 3. Initialize Hands Engine
      const hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // 4. Frame Processing Loop
      let isProcessing = false;
      const processVideoFrame = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessing) {
          isProcessing = true;
          try {
            await hands.send({ image: videoRef.current });
          } catch (err) {
            console.error('Frame send error:', err);
          }
          isProcessing = false;
        }
        if (streamRef.current) {
          animFrameId.current = requestAnimationFrame(processVideoFrame);
        }
      };

      processVideoFrame();
      setIsActive(true);
      setLoading(false);
      setStatusText('Tracking Active (Show Hand)');
    } catch (err) {
      console.error('Camera/MediaPipe error:', err);
      setStatusText('Camera Blocked / Error');
      setLoading(false);
      setIsActive(false);
    }
  };

  const stopTracking = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    setIsActive(false);
    setStatusText('Camera Offline');
    if (onCursorMove) onCursorMove({ x: -200, y: -200 });
    if (onPinchStateChange) onPinchStateChange(false);
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw Hand Skeletal Connections
      drawHandSkeletons(ctx, landmarks, canvas.width, canvas.height);

      // Index Finger Tip (Landmark 8) & Thumb Tip (Landmark 4)
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];

      // Map mirrored X to Screen Coordinates
      const screenX = (1 - indexTip.x) * window.innerWidth;
      const screenY = indexTip.y * window.innerHeight;

      if (onCursorMove) {
        onCursorMove({ x: screenX, y: screenY });
      }

      // Calculate Pinch Distance between Index & Thumb
      const dx = (indexTip.x - thumbTip.x) * canvas.width;
      const dy = (indexTip.y - thumbTip.y) * canvas.height;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const PINCH_THRESHOLD = 38; // Distance in canvas pixels
      const pinchingNow = distance < PINCH_THRESHOLD;

      if (pinchingNow !== isPinchingRef.current) {
        isPinchingRef.current = pinchingNow;
        if (onPinchStateChange) {
          onPinchStateChange(pinchingNow);
        }

        // Trigger Click Event at Cursor Position
        if (pinchingNow) {
          const targetEl = document.elementFromPoint(screenX, screenY);
          if (targetEl) {
            targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        }
      }

      setStatusText(pinchingNow ? '👌 PINCH (CLICKED)' : '🖐️ TRACKING');
    } else {
      setStatusText('Searching Hand...');
    }

    ctx.restore();
  };

  // Helper to draw clean neon joints on canvas
  const drawHandSkeletons = (ctx, landmarks, width, height) => {
    // Draw landmarks
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = (1 - lm.x) * width; // Mirrored
      const y = lm.y * height;

      ctx.beginPath();
      ctx.arc(x, y, i === 8 || i === 4 ? 6 : 3, 0, 2 * Math.PI);
      ctx.fillStyle = i === 8 ? '#00f0ff' : i === 4 ? '#ec4899' : '#38bdf8';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        borderRadius: '14px',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {/* Header & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isActive ? '#10b981' : '#64748b',
              boxShadow: isActive ? '0 0 8px #10b981' : 'none'
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#f8fafc' }}>
            AI GESTURE VISION
          </span>
        </div>

        <button
          onClick={isActive ? stopTracking : startTracking}
          disabled={loading}
          style={{
            padding: '4px 10px',
            borderRadius: '8px',
            border: 'none',
            background: isActive
              ? 'rgba(239, 68, 68, 0.2)'
              : 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: isActive ? '#f87171' : '#ffffff',
            fontSize: '10px',
            fontWeight: '800',
            cursor: loading ? 'wait' : 'pointer',
            border: isActive ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
            boxShadow: isActive ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}
        >
          {loading ? 'Starting...' : isActive ? 'Turn OFF' : 'Start Cam'}
        </button>
      </div>

      {/* Video & Canvas Stream Area */}
      <div
        style={{
          width: '100%',
          height: '110px',
          background: '#020617',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirrored display
            opacity: isActive ? 0.35 : 0
          }}
        />

        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        {!isActive && !loading && (
          <div style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textAlign: 'center' }}>
            📷 Camera Inactive
          </div>
        )}

        {loading && (
          <div style={{ color: '#38bdf8', fontSize: '11px', fontWeight: '700', textAlign: 'center' }}>
            ⚡ Initializing Neural Vision...
          </div>
        )}
      </div>

      {/* Live Tracker Subtext & Guide */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: '#94a3b8' }}>
        <span style={{ color: isActive ? '#38bdf8' : '#64748b', fontWeight: '700' }}>
          {statusText}
        </span>
        <span>👉 Point / 👌 Pinch to Move</span>
      </div>
    </div>
  );
}