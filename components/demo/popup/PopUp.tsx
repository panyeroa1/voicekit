/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './PopUp.css';

interface PopUpProps {
  onClose: () => void;
}

const PopUp: React.FC<PopUpProps> = ({ onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Welcome to Kithai</h2>
        <p>Your personal AI assistant is ready to help.</p>
        <p>To get started:</p>
        <ol>
          <li><span className="icon">play_circle</span>Press Play to start streaming audio.</li>
          <li><span className="icon">save_as</span>Copy this sandbox to create your own version.</li>
          <li><span className="icon">auto_awesome</span>Use the Code Assistant to customize and test your creation.</li>
        </ol>
        <button onClick={onClose}>Start Building</button>
      </div>
    </div>
  );
};

export default PopUp;