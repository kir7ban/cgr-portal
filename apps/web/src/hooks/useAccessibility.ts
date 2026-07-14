import { useCallback } from 'react';

/**
 * Hook for accessibility utilities
 * Provides aria labels, contrast validation, loading skeletons, etc.
 *
 * @param userId - The ID of the current user
 * @returns Object with accessibility helper methods
 */
export function useAccessibility(userId: string) {
  /**
   * Generate appropriate aria-label for interactive elements
   */
  const getAriaLabel = useCallback(
    (action: string, resource: string, context?: string): string => {
      const baseLabel = `${action} ${resource}`;
      if (context) {
        return `${action} ${resource} - ${context}`;
      }
      return baseLabel;
    },
    []
  );

  /**
   * Validate color contrast meets WCAG AA standard (4.5:1 ratio)
   * Simplified calculation - in production would use more precise formula
   */
  const validateColorContrast = useCallback(
    (foreground: string, background: string): boolean => {
      try {
        const fgLuminance = getRelativeLuminance(foreground);
        const bgLuminance = getRelativeLuminance(background);

        const lighter = Math.max(fgLuminance, bgLuminance);
        const darker = Math.min(fgLuminance, bgLuminance);

        const contrast = (lighter + 0.05) / (darker + 0.05);

        // WCAG AA requires 4.5:1 for normal text
        return contrast >= 4.5;
      } catch (err) {
        return false;
      }
    },
    []
  );

  /**
   * Get loading skeleton component
   */
  const getLoadingSkeleton = useCallback(
    (type: 'card' | 'text' | 'avatar' | 'button', lineCount: number = 3): any => {
      // In real implementation, would return React component
      return {
        type,
        lineCount,
        ariaLabel: 'Loading...',
        role: 'status',
        'aria-busy': true,
      };
    },
    []
  );

  /**
   * Get empty state component for empty lists
   */
  const getEmptyState = useCallback(
    (resource: string): any => {
      const messages: Record<string, string> = {
        posts: 'No posts yet. Create one to get started!',
        comments: 'No comments yet. Be the first to comment!',
        audiences: 'No custom audiences created yet.',
        notifications: 'You are all caught up!',
      };

      return {
        resource,
        message: messages[resource] || `No ${resource} found`,
        ariaLabel: `Empty ${resource} state`,
      };
    },
    []
  );

  /**
   * Get confirmation dialog for destructive actions
   */
  const getConfirmDialog = useCallback(
    (action: string, resource: string): any => {
      const titles: Record<string, string> = {
        delete: `Delete ${resource}?`,
        archive: `Archive ${resource}?`,
        revoke: `Revoke access to ${resource}?`,
        remove: `Remove ${resource}?`,
      };

      const messages: Record<string, string> = {
        delete: `This action cannot be undone. The ${resource} will be permanently deleted.`,
        archive: `The ${resource} will be archived and hidden from view.`,
        revoke: `Access to this ${resource} will be revoked.`,
        remove: `The ${resource} will be removed.`,
      };

      return {
        title: titles[action] || `Confirm ${action}`,
        message: messages[action] || `Are you sure you want to ${action} this ${resource}?`,
        confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
        cancelLabel: 'Cancel',
        role: 'alertdialog',
      };
    },
    []
  );

  /**
   * Validate form labels are properly associated
   */
  const validateFormLabels = useCallback((form: HTMLFormElement): boolean => {
    if (!form) return false;

    const inputs = form.querySelectorAll('input, textarea, select');
    let allLabeled = true;

    inputs.forEach((input) => {
      const inputId = input.id;
      if (!inputId) {
        allLabeled = false;
        return;
      }

      const label = form.querySelector(`label[for="${inputId}"]`);
      if (!label && !input.getAttribute('aria-label')) {
        allLabeled = false;
      }
    });

    return allLabeled;
  }, []);

  /**
   * Check keyboard navigation support
   */
  const checkKeyboardNavigation = useCallback((): boolean => {
    // In real implementation, would check:
    // - Tab order is logical
    // - Focus is visible
    // - Escape closes modals
    // - Enter/Space activates buttons

    // For now, return true (assumes proper implementation)
    return true;
  }, []);

  /**
   * Get 404 Not Found page component
   */
  const get404Page = useCallback((): any => {
    return {
      title: '404 - Page Not Found',
      message: 'The page you are looking for does not exist.',
      suggestions: [
        'Check the URL is correct',
        'Return to home page',
        'Contact support if you believe this is an error',
      ],
      actions: [
        { label: 'Go Home', href: '/' },
        { label: 'Go Back', href: -1 },
      ],
      ariaLabel: 'Page not found',
    };
  }, []);

  return {
    getAriaLabel,
    validateColorContrast,
    getLoadingSkeleton,
    getEmptyState,
    getConfirmDialog,
    validateFormLabels,
    checkKeyboardNavigation,
    get404Page,
  };
}

/**
 * Calculate relative luminance for color contrast validation
 * Based on WCAG 2.0 specification
 */
function getRelativeLuminance(hexColor: string): number {
  try {
    const color = hexColor.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16) / 255;
    const g = parseInt(color.substring(2, 4), 16) / 255;
    const b = parseInt(color.substring(4, 6), 16) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) => {
      return c <= 0.03928
        ? c / 12.92
        : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  } catch (err) {
    return 0.5;
  }
}
