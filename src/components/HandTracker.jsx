import React, { useEffect, useRef, useState } from 'react';

export default function HandTracker({ onCursorMove, onPinchStateChange }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchDist, setPinchDist] = useState(1);

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    if (!window.Hands || !window.Camera) {
      console.error("MediaPipe scripts not loaded yet");
      return;
    }

    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];

        // Screen Mirroring Cursor
        const cursorX = (1 - indexTip.x) * window.innerWidth;
        const cursorY = indexTip.y * window.innerHeight;

        // Euclidean Distance
        const distance = Math.hypot(
          indexTip.x - thumbTip.x,
          indexTip.y - thumbTip.y
        );

        setPinchDist(distance.toFixed(3));

        // Pinch Threshold (0.085 - ඉතාම පහසුවෙන් Trigger වේ)
        const pinchingNow = distance < 0.085;

        setIsPinching(pinchingNow);
        if (onPinchStateChange) onPinchStateChange(pinchingNow);
        if (onCursorMove) onCursorMove({ x: cursorX, y: cursorY });

        // Draw points on canvas
        landmarks.forEach((pt, index) => {
          const x = (1 - pt.x) * canvasElement.width;
          const y = pt.y * canvasElement.height;
          canvasCtx.beginPath();
          canvasCtx.arc(x, y, (index === 4 || index === 8) ? 6 : 2.5, 0, 2 * Math.PI);
          canvasCtx.fillStyle = pinchingNow ? '#10b981' : (index === 8 ? '#38bdf8' : '#ef4444');
          canvasCtx.fill();
        });
      }
      canvasCtx.restore();
    });

    const camera = new window.Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 320,
      height: 240
    });

    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, [cameraActive]);

  return (
    <div style={{ background: '#1e293b', padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>WebCam Tracking</span>
        <button
          onClick={() => setCameraActive(!cameraActive)}
          style={{
            background: cameraActive ? '#ef4444' : '#10b981',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {cameraActive ? 'Stop' : 'Start'}
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '140px', background: '#020617', borderRadius: '8px', overflow: 'hidden' }}>
        <video ref={videoRef} playsInline style={{ display: 'none' }} />
        <canvas ref={canvasRef} width={220} height={140} style={{ width: '100%', height: '100%' }} />
        {!cameraActive && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
            Camera Inactive
          </div>
        )}
      </div>

      <div style={{ marginTop: '10px', fontSize: '12px', textAlign: 'center' }}>
        <span style={{ color: isPinching ? '#10b981' : '#94a3b8', fontWeight: 'bold' }}>
          {isPinching ? '👌 PINCH ACTIVE' : '🖐 TRACKING'}
        </span>
        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>Gap: {pinchDist} (Threshold: &lt; 0.085)</div>
      </div>
    </div>
  );
}