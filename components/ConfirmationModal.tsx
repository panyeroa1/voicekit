/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import c from 'classnames';
import { useUI } from '../lib/state';
import Modal from './Modal';
import ToolIcon from './ToolIcon';

const ConfirmationModal: React.FC = () => {
  const { confirmation, clearConfirmation } = useUI();

  if (!confirmation) {
    return null;
  }

  const { icon, title, prompt, details, confirmText = 'Confirm', danger = false, onConfirm, onCancel } = confirmation;

  const handleConfirm = () => {
    onConfirm();
    clearConfirmation();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    clearConfirmation();
  };

  return (
    <Modal onClose={handleCancel}>
      <div className="confirmation-modal">
        <div className="confirmation-header">
          {icon ? <ToolIcon icon={icon} /> : <span className="icon">help_outline</span>}
          <h2>{title}</h2>
        </div>
        <p className="confirmation-prompt">
          {prompt}
        </p>

        {details && Object.keys(details).length > 0 && (
          <div className="confirmation-details">
            <h4>Parameters:</h4>
            <ul>
              {Object.entries(details).map(([key, value]) => (
                <li key={key}>
                  <span className="param-key">{key}:</span>
                  <span className="param-value">{String(value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="modal-actions">
          <button onClick={handleCancel} className="cancel-button" title="Cancel this action">
            Cancel
          </button>
          <button onClick={handleConfirm} className={c("save-button", { 'danger': danger })} title="Confirm and execute action">
            <span className="icon">check</span> {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;