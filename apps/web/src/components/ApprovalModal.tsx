import React, { useState, useEffect } from 'react';

interface ApprovalModalProps {
  type: 'feedback' | 'reject';
  isOpen: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}

export function ApprovalModal({ type, isOpen, onSubmit, onClose }: ApprovalModalProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setText('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getModalContent = () => {
    if (type === 'feedback') {
      return {
        title: 'Request Feedback',
        placeholder: 'Enter feedback message',
        submitLabel: 'Submit Feedback',
      };
    }
    return {
      title: 'Rejection Reason',
      placeholder: 'Enter reason for rejection',
      submitLabel: 'Confirm Reject',
    };
  };

  const content = getModalContent();

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h3>{content.title}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <textarea
            placeholder={content.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="modal-textarea"
            rows={5}
          />
        </div>

        <div className="modal-footer">
          <button
            onClick={handleSubmit}
            className="btn-submit"
            disabled={!text.trim()}
          >
            {content.submitLabel}
          </button>
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
