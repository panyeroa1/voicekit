

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useUI } from '../../lib/state';
import './PresentationGenerator.css';


const PresentationGenerator: React.FC = () => {
  const { presentationData, setPresentationData } = useUI();

  if (!presentationData || !presentationData.videoUrl) return null;

  const handleClose = () => {
    // Revoke the object URL to free up memory
    if (presentationData.videoUrl) {
      URL.revokeObjectURL(presentationData.videoUrl);
    }
    setPresentationData(null);
  };

  return (
    <div className="presentation-overlay">
      <div className="presentation-modal">
        <h3>{presentationData.topic || 'Business Presentation'}</h3>
        <div className="presentation-result">
            <p>Your presentation video is ready!</p>
            <video src={presentationData.videoUrl} controls autoPlay muted loop />
            <div className="presentation-actions">
              <a href={presentationData.videoUrl} download={`${presentationData.topic.replace(/\s/g, '_')}_presentation.webm`} className="presentation-button">
                <span className="icon">download</span> Download Video
              </a>
              <button onClick={handleClose} className="presentation-button close-button">
                 <span className="icon">close</span> Close
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationGenerator;