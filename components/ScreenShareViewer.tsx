import React, { useEffect, useRef } from 'react';
import { useUI } from '../lib/state';

const ScreenShareViewer: React.FC = () => {
  const { isScreenSharing, screenStream } = useUI();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  if (!isScreenSharing || !screenStream) {
    return null;
  }

  return (
    <div className="screen-share-viewer">
      <div className="browser-window">
        <div className="browser-header">
          <div className="browser-dots">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
          </div>
          <div className="browser-title">Screen Sharing</div>
        </div>
        <div className="browser-content">
          <video ref={videoRef} autoPlay playsInline muted />
        </div>
      </div>
    </div>
  );
};

export default ScreenShareViewer;
