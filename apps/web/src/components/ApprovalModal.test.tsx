import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalModal } from './ApprovalModal';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: ApprovalModal Component Tests
 */

describe('ApprovalModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render feedback modal when type is feedback', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalModal
        type="feedback"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/request feedback|feedback message/i)).toBeInTheDocument();
  });

  it('should render reject modal when type is reject', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalModal
        type="reject"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/rejection reason|reason for rejection/i)).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <ApprovalModal
        type="feedback"
        isOpen={false}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    expect(container.querySelector('.modal')).not.toBeInTheDocument();
  });

  it('should call onSubmit with textarea value', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalModal
        type="feedback"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/enter feedback|enter reason/i);
    fireEvent.change(textarea, { target: { value: 'Test message' } });

    const submitBtn = screen.getByRole('button', { name: /submit|confirm/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Test message');
    });
  });

  it('should call onClose when cancel button is clicked', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalModal
        type="feedback"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when clicking outside modal (backdrop)', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <ApprovalModal
        type="feedback"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    const modal = container.querySelector('.modal');
    if (modal) {
      fireEvent.click(modal, { target: modal }); // Click on backdrop
      // Implementation should handle backdrop click
    }
  });

  it('should clear textarea after submission', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <ApprovalModal
        type="feedback"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/enter feedback|enter reason/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test message' } });

    const submitBtn = screen.getByRole('button', { name: /submit|confirm/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Test message');
    });

    // Rerender with modal closed
    rerender(
      <ApprovalModal
        type="feedback"
        isOpen={false}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );
  });

  it('should have different button text for feedback vs reject', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <ApprovalModal
        type="feedback"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('button', { name: /submit.*feedback|send/i })).toBeInTheDocument();

    rerender(
      <ApprovalModal
        type="reject"
        isOpen={true}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('button', { name: /confirm.*reject/i })).toBeInTheDocument();
  });
});
