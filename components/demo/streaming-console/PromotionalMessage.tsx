/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { ConversationTurn, useSnackbarStore } from '../../../lib/state';

interface PromotionalMessageProps {
  turn: ConversationTurn;
}

const PromotionalMessage: React.FC<PromotionalMessageProps> = ({ turn }) => {
  const { showSnackbar } = useSnackbarStore();

  const handleShare = async () => {
    const shareData = {
      title: 'Kithai AI Assistant',
      text: 'Check out Kithai, my AI business assistant! It helps with scheduling, messaging, and more.',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showSnackbar('Share link copied to clipboard!', 'info');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      try {
        await navigator.clipboard.writeText(shareData.url);
        showSnackbar('Share link copied to clipboard!', 'info');
      } catch (copyErr) {
          console.error('Error copying to clipboard:', copyErr);
          showSnackbar('Could not share or copy link.', 'error');
      }
    }
  };

  return (
    <div className="promo-message-container">
      <div className="promo-header">
        <div className="promo-tag">
          <span className="icon">campaign</span>
          <span>From Kithai</span>
        </div>
        <div className="promo-sponsored-label">Sponsored</div>
      </div>
      <div className="promo-content">
        <p>{turn.text}</p>
      </div>
      <div className="promo-actions">
        <button className="share-kithai-button" onClick={handleShare}>
          <span className="icon">share</span>
          Share Kithai
        </button>
      </div>
    </div>
  );
};

export default PromotionalMessage;
